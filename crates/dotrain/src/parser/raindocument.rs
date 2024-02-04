use std::sync::{Arc, RwLock};
use serde::{Serialize, Deserialize};
use async_recursion::async_recursion;
use topo_sort::{SortResults, TopoSort};
use std::collections::{HashMap, VecDeque};
use futures::{executor::block_on, future::join_all};
use rain_metadata::{
    types::{dotrain::v1::DotrainMeta, authoring::v1::AuthoringMeta},
    Store, KnownMagic, RainMetaDocumentV1Item, search,
};
use super::{
    rainlangdocument::RainlangDocument,
    super::{
        error::{Error, ErrorCode},
        types::{ast::*, patterns::*},
    },
    exclusive_parse, inclusive_parse, fill_in, is_consumable, tracked_trim, line_number, to_u256,
};

#[cfg(feature = "js-api")]
use tsify::Tsify;
#[cfg(feature = "js-api")]
use wasm_bindgen::prelude::wasm_bindgen;

/// Data structure of a parsed .rain text
///
/// RainDocument is the main implementation block that enables parsing of a .rain file contents
/// to its building blocks and parse tree by handling and resolving imports, namespaces, etc which
/// later are used by LSP services and compiler as well as providing all the functionalities in between.
///
/// It is a portable, extensible and composable format for describing Rainlang fragments, .rain serve as
/// a wrapper/container/medium for Rainlang to be shared and audited simply in a permissionless and
/// adversarial environment such as a public blockchain.
///
#[cfg_attr(
    not(target_family = "wasm"),
    doc = r#"
## Example

```rust
use std::sync::{Arc, RwLock};
use dotrain::{RainDocument, Store};

let text = "some .rain text content".to_string();

let meta_store = Arc::new(RwLock::new(Store::default()));

// create a new instance that gets parsed right away
let rain_document = RainDocument::create(text, Some(meta_store), None);

// get all problems
let problems = rain_document.all_problems();

let entrypoints = vec![
   "entrypoint1", 
   "entrypoint2"
];

// compose this instance to get rainlang string
let result = rain_document.compose(&entrypoints);
```
"#
)]
#[cfg_attr(
    target_family = "wasm",
    doc = " @example
 ```javascript
 // create a new instane
 const rainDocument = RainDocument.create(text, meta_store);

 // alternatively instantiate with remote meta search enabled
 const rainDocument = await RainDocument.createAsync(text, meta_store);

 // get all problems
 const problems = rainDocument.allProblems;

 // compose this instance to get rainlang string
 const expConfig = rainDocument.compose([\"entrypoint1\", \"entrypoint2\"]);
 ```
"
)]
#[cfg_attr(feature = "js-api", wasm_bindgen, derive(Tsify))]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(rename(serialize = "IRainDocument"))]
pub struct RainDocument {
    #[cfg_attr(feature = "js-api", tsify(type = "string"))]
    pub(crate) text: String,
    pub(crate) front_matter_offset: usize,
    pub(crate) error: Option<String>,
    pub(crate) bindings: Vec<Binding>,
    pub(crate) imports: Vec<Import>,
    pub(crate) comments: Vec<Comment>,
    pub(crate) problems: Vec<Problem>,
    pub(crate) import_depth: usize,
    pub(crate) namespace: Namespace,
    #[serde(skip)]
    pub(crate) meta_store: Arc<RwLock<Store>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "js-api", tsify(type = "IAuthoringMeta"))]
    pub(crate) known_words: Option<AuthoringMeta>,
}

impl RainDocument {
    /// Creates an instance and parses with remote meta search enabled
    pub async fn create_async(
        text: String,
        meta_store: Option<Arc<RwLock<Store>>>,
        words: Option<AuthoringMeta>,
    ) -> RainDocument {
        let mut rain_document = RainDocument::new(text, meta_store, 0, words);
        rain_document.parse(true).await;
        rain_document
    }

    /// Creates an instance and parses with remote meta search disabled (cached metas only)
    pub fn create(
        text: String,
        meta_store: Option<Arc<RwLock<Store>>>,
        words: Option<AuthoringMeta>,
    ) -> RainDocument {
        let mut rain_document = RainDocument::new(text, meta_store, 0, words);
        block_on(rain_document.parse(false));
        rain_document
    }

    /// Updates the text and parses right away with remote meta search disabled (cached metas only)
    pub fn update(&mut self, new_text: String) {
        self.text = new_text;
        block_on(self.parse(false));
    }

    /// Updates the text and parses right away with remote meta search enabled
    pub async fn update_async(&mut self, new_text: String) {
        self.text = new_text;
        self.parse(true).await;
    }

    /// This instance's current text
    pub fn text(&self) -> &str {
        &self.text
    }

    /// This instance's front matter
    pub fn front_matter(&self) -> &str {
        &self.text[0..self.front_matter_offset]
    }

    /// This instance's body (i.e. text minus front matter)
    pub fn body(&self) -> &str {
        if self.front_matter_offset == 0 && !self.text.starts_with(FRONTMATTER_SEPARATOR) {
            return &self.text;
        }
        &self.text[(self.front_matter_offset + FRONTMATTER_SEPARATOR.len())..]
    }

    /// This instance's top problems
    pub fn problems(&self) -> &Vec<Problem> {
        &self.problems
    }

    /// This instance's comments
    pub fn comments(&self) -> &Vec<Comment> {
        &self.comments
    }

    /// This instance's imports
    pub fn imports(&self) -> &Vec<Import> {
        &self.imports
    }

    /// This instance's bindings
    pub fn bindings(&self) -> &Vec<Binding> {
        &self.bindings
    }

    /// This instance's namespace
    pub fn namespace(&self) -> &Namespace {
        &self.namespace
    }

    /// This instance's meta Store instance
    pub fn store(&self) -> Arc<RwLock<Store>> {
        self.meta_store.clone()
    }

    /// This instance's words
    pub fn known_words(&self) -> &Option<AuthoringMeta> {
        &self.known_words
    }

    /// The error msg if parsing had resulted in an error
    pub fn runtime_error(&self) -> &Option<String> {
        &self.error
    }

    /// This instance's all problems (bindings + top)
    pub fn all_problems(&self) -> Vec<&Problem> {
        let mut all = vec![];
        all.extend(&self.problems);
        all.extend(self.bindings.iter().flat_map(|v| &v.problems));
        all
    }

    /// This instance's bindings problems
    pub fn bindings_problems(&self) -> Vec<&Problem> {
        self.bindings.iter().flat_map(|v| &v.problems).collect()
    }

    /// Parses this instance's text with remote meta search enabled
    #[async_recursion(?Send)]
    pub async fn parse(&mut self, enable_remote: bool) {
        if NON_EMPTY_PATTERN.is_match(&self.text) {
            if let Err(e) = self._parse(enable_remote).await {
                self.error = Some(e.to_string());
                self.problems
                    .push(ErrorCode::RuntimeError.to_problem(vec![&e.to_string()], [0, 0]));
            }
        } else {
            self.error = None;
            self.imports.clear();
            self.problems.clear();
            self.comments.clear();
            self.bindings.clear();
            self.namespace.clear();
            self.known_words = None;
            self.front_matter_offset = 0;
        }
    }
}

impl RainDocument {
    pub(crate) fn new(
        text: String,
        meta_store: Option<Arc<RwLock<Store>>>,
        import_depth: usize,
        known_words: Option<AuthoringMeta>,
    ) -> RainDocument {
        RainDocument {
            meta_store: meta_store.unwrap_or(Arc::new(RwLock::new(Store::default()))),
            text,
            front_matter_offset: 0,
            error: None,
            bindings: vec![],
            namespace: HashMap::new(),
            imports: vec![],
            known_words,
            comments: vec![],
            problems: vec![],
            import_depth,
        }
    }

    /// the main method that takes out and processes each section of a RainDocument
    /// text (comments, imports, etc) one after the other, builds the parse tree, builds
    /// the namespace and checks for dependency issues and resolves the global words
    #[async_recursion(?Send)]
    async fn _parse(&mut self, remote_search: bool) -> Result<(), Error> {
        self.imports.clear();
        self.problems.clear();
        self.comments.clear();
        self.bindings.clear();
        self.namespace.clear();
        self.known_words = None;
        self.front_matter_offset = 0;

        let mut document = self.text.clone();
        let mut namespace: Namespace = HashMap::new();

        // check for illegal characters, ends parsing right away if found any
        let illegal_chars = inclusive_parse(&document, &ILLEGAL_CHAR, 0);
        if !illegal_chars.is_empty() {
            self.problems.push(ErrorCode::IllegalChar.to_problem(
                vec![&illegal_chars[0].0],
                [illegal_chars[0].1[0], illegal_chars[0].1[0]],
            ));
            return Ok(());
        }

        // parse comments
        for parsed_comment in inclusive_parse(&document, &COMMENT_PATTERN, 0).iter() {
            // if a comment is not ended
            if !parsed_comment.0.ends_with("*/") {
                self.problems
                    .push(ErrorCode::UnexpectedEndOfComment.to_problem(vec![], parsed_comment.1));
            }
            self.comments.push(Comment {
                comment: parsed_comment.0.clone(),
                position: parsed_comment.1,
            });
            fill_in(&mut document, parsed_comment.1)?;
        }

        // split front matter and rest of the text
        if let Some(splitter) = document.find(FRONTMATTER_SEPARATOR) {
            self.front_matter_offset = splitter;
            let body_start_offset = splitter + FRONTMATTER_SEPARATOR.len();
            fill_in(&mut document, [0, body_start_offset])?;
        };

        // since exclusive_parse() is being used with 'include_empty_ends' arg set to true,
        // the first item of the parsed items should be ignored since it only contains the
        // text before the first match
        // this will apply for parsing imports and bindings
        let mut ignore_first = true;

        // parse and take out each import statement from the text
        let mut import_statements = exclusive_parse(&document, &IMPORTS_PATTERN, 0, true);
        for imp_statement in &mut import_statements {
            if ignore_first {
                ignore_first = false;
                continue;
            }
            if let Some(index) = imp_statement.0.find('#') {
                let slices = imp_statement.0.split_at(index);
                imp_statement.0 = slices.0.to_owned();
                imp_statement.1[1] = imp_statement.1[0] + index;
            };
            fill_in(&mut document, [imp_statement.1[0] - 1, imp_statement.1[1]])?;
        }

        // try to parse import statements if only the current instance isnt an import itself
        // and is not deeper than 32 levels
        // parsing each import is an async fn as each import might not be cached in the CAS
        // and may need reading from underlying subgraphs, so they are triggered and awaited
        // alltogether with care for read/write lock on the CAS
        ignore_first = true;
        if self.import_depth < 32 {
            let mut futures = vec![];
            for s in &import_statements {
                if ignore_first {
                    ignore_first = false;
                    continue;
                }
                futures.push(self.process_import(s, remote_search));
            }
            let mut parsed_imports = join_all(futures).await;

            // since the parsing import statements is async, it is needed to check for
            // duplicate imports after all imports have been done parsing and then add
            // their found problems to the top problems list
            for imp in &mut parsed_imports {
                // check for duplicate imports
                if !imp.hash.is_empty() && self.imports.iter().any(|i| i.hash == imp.hash) {
                    self.problems
                        .push(ErrorCode::DuplicateImport.to_problem(vec![], imp.hash_position));
                }
                // add found problems of each import to top problems list
                self.problems.extend(imp.problems.clone());
                if let Some(config) = &imp.configuration {
                    self.problems.extend(config.problems.clone());
                }
            }
            self.imports.extend(parsed_imports);
        } else {
            for s in import_statements {
                self.problems
                    .push(ErrorCode::DeepImport.to_problem(vec![], [s.1[0] - 1, s.1[1]]));
            }
        }

        // merge all the built and ready imported items namespaces into the main namespace
        let mut imports_namespaces = self.build_imports_namespaces(&namespace);
        while let Some((name, hash_position, _ns)) = imports_namespaces.pop_front() {
            self.merge_namespace(name, hash_position, _ns, &mut namespace);
        }

        // parsing bindings
        let parsed_bindings = exclusive_parse(&document, &BINDING_PATTERN, 0, true);
        let mut raw_exp_contents = VecDeque::new();
        ignore_first = true;
        for parsed_binding in &parsed_bindings {
            if ignore_first {
                ignore_first = false;
                continue;
            }
            if let Some(raw_content) = self.process_binding(parsed_binding, &mut namespace) {
                raw_exp_contents.push_back(raw_content);
            };
            fill_in(
                &mut document,
                [parsed_binding.1[0] - 1, parsed_binding.1[1]],
            )?;
        }

        // find non-top level imports
        if !self.bindings.is_empty() {
            for imp in &self.imports {
                if imp.position[0] >= self.bindings[0].name_position[0] {
                    self.problems
                        .push(ErrorCode::NoneTopLevelImport.to_problem(vec![], imp.position))
                }
            }
        }

        // assign the built namespace to this instance's main namespace
        self.namespace = namespace;

        // find any remaining strings and include them as errors
        exclusive_parse(&document, &WS_PATTERN, 0, false)
            .iter()
            .for_each(|v| {
                self.problems
                    .push(ErrorCode::UnexpectedToken.to_problem(vec![], v.1))
            });

        // resolve dependencies for expression bindings
        self.process_dependencies(raw_exp_contents);

        // try to set global words only if only there are rainlang bindings and current instance is
        // not an import itself. (only owned expression bindings will be parsed at this point).
        // reason for not parsing imported/deeper expression bindings is because their ast provides
        // no needed info at this point, they will get parsed once the dotrain is being composed with
        // specified entrypoints and they will be parsed only if they are part of the entrypoints or
        // their deps, see 'compile.rs'.
        // also no need for global words for an instance that contains only constant/elided bindings
        if self.import_depth == 0
            && self
                .bindings
                .iter()
                .any(|b| matches!(b.item, BindingItem::Exp(_)))
        {
            for binding in &mut self.bindings {
                // parse the rainlang binding to ast and repopulate the
                // binding.item and corresponding namespace with it
                if matches!(binding.item, BindingItem::Exp(_)) {
                    let rainlang_doc = RainlangDocument::create(
                        binding.content.clone(),
                        &self.namespace,
                        self.known_words.as_ref(),
                    );
                    // add the rainlang problems to the binding problems by applying
                    // the initial offset difference to their positions
                    binding
                        .problems
                        .extend(rainlang_doc.problems.iter().map(|p| Problem {
                            msg: p.msg.clone(),
                            position: [
                                p.position[0] + binding.content_position[0],
                                p.position[1] + binding.content_position[0],
                            ],
                            code: p.code,
                        }));
                    // assign to the binding.item and namespace
                    binding.item = BindingItem::Exp(rainlang_doc);
                    self.namespace.insert(
                        binding.name.clone(),
                        NamespaceItem::Leaf(NamespaceLeaf {
                            hash: String::new(),
                            import_index: -1,
                            element: binding.clone(),
                        }),
                    );
                }
            }
        }

        // apply 'ignore next line' lint for matching found problems
        for cm in &self.comments {
            if lint_patterns::IGNORE_NEXT_LINE.is_match(&cm.comment) {
                let line = line_number(&self.text, cm.position[1]);
                while let Some((i, _)) = self
                    .problems
                    .iter()
                    .enumerate()
                    .find(|p| line_number(&self.text, p.1.position[0]) == line + 1)
                {
                    self.problems.remove(i);
                }
            }
        }

        Ok(())
    }

    /// Checks if an import is deeper than 32 levels
    /// [ErrorCode::DeepImport] signifies a deep import problem and is passed on from
    /// deeper import up to the most outter dotrain at each level of processing imports,
    /// by running this fn, so by checking for that among import.problems, it is possible
    /// to check if an import statement goes deeper than 32 levels
    fn is_deep_import(import: &Import) -> bool {
        if let Some(seq) = &import.sequence {
            if let Some(dotrain) = &seq.dotrain {
                dotrain
                    .problems
                    .iter()
                    .any(|v| v.code == ErrorCode::DeepImport)
            } else {
                false
            }
        } else {
            false
        }
    }

    /// Checks if a binding is elided and returns the elision msg if it found any
    fn is_elided(text: &str) -> Option<String> {
        let msg = text.trim();
        msg.strip_prefix('!')
            .map(|stripped| stripped.trim().to_owned())
    }

    /// Checks if a text contains a single numeric value and returns it ie is constant binding
    fn is_constant(text: &str) -> Option<(String, bool, bool)> {
        if text.starts_with('"') {
            let has_no_end = !STRING_LITERAL_PATTERN.is_match(text);
            Some((text.to_owned(), true, has_no_end))
        } else {
            let items = exclusive_parse(text, &WS_PATTERN, 0, false);
            if items.len() == 1 && NUMERIC_PATTERN.is_match(&items[0].0) {
                let is_out_of_range = to_u256(&items[0].0).is_err();
                Some((items[0].0.clone(), false, is_out_of_range))
            } else {
                None
            }
        }
    }

    // processes configurations of an import statement
    fn process_import_config(
        config_pieces: &mut std::slice::IterMut<'_, ParsedItem>,
    ) -> ImportConfiguration {
        let mut imp_conf = ImportConfiguration {
            groups: vec![],
            problems: vec![],
        };
        while let Some(first_piece) = config_pieces.next() {
            if let Some(complementary_piece) = config_pieces.next() {
                if WORD_PATTERN.is_match(&first_piece.0) {
                    if LITERAL_PATTERN.is_match(&complementary_piece.0)
                        || complementary_piece.0 == "!"
                    {
                        if imp_conf.groups.iter().any(|v| {
                            if let Some(e) = &v.1 {
                                v.0 .0 == first_piece.0 && e.0 == complementary_piece.0
                            } else {
                                false
                            }
                        }) {
                            imp_conf.problems.push(
                                ErrorCode::DuplicateImportStatement.to_problem(
                                    vec![],
                                    [first_piece.1[0], complementary_piece.1[1]],
                                ),
                            );
                        }
                    } else {
                        imp_conf.problems.push(
                            ErrorCode::UnexpectedToken.to_problem(vec![], complementary_piece.1),
                        );
                    }
                    imp_conf
                        .groups
                        .push((first_piece.clone(), Some(complementary_piece.clone())));
                } else if let Some(quote) = first_piece.0.strip_prefix('\'') {
                    if WORD_PATTERN.is_match(quote) {
                        if WORD_PATTERN.is_match(&complementary_piece.0) {
                            if imp_conf.groups.iter().any(|v| {
                                if let Some(e) = &v.1 {
                                    v.0 .0 == first_piece.0 && e.0 == complementary_piece.0
                                } else {
                                    false
                                }
                            }) {
                                imp_conf.problems.push(
                                    ErrorCode::DuplicateImportStatement.to_problem(
                                        vec![],
                                        [first_piece.1[0], complementary_piece.1[1]],
                                    ),
                                );
                            }
                        } else {
                            imp_conf.problems.push(
                                ErrorCode::InvalidWordPattern.to_problem(
                                    vec![&complementary_piece.0],
                                    complementary_piece.1,
                                ),
                            );
                        }
                    } else {
                        imp_conf.problems.push(
                            ErrorCode::InvalidWordPattern
                                .to_problem(vec![&first_piece.0], first_piece.1),
                        );
                    }
                    imp_conf
                        .groups
                        .push((first_piece.clone(), Some(complementary_piece.clone())));
                } else {
                    imp_conf
                        .problems
                        .push(ErrorCode::UnexpectedToken.to_problem(vec![], first_piece.1));
                    imp_conf
                        .groups
                        .push((first_piece.clone(), Some(complementary_piece.clone())));
                }
            } else {
                imp_conf.groups.push((first_piece.clone(), None));
                if first_piece.0.starts_with('\'') {
                    imp_conf
                        .problems
                        .push(ErrorCode::ExpectedRename.to_problem(vec![], first_piece.1));
                } else {
                    imp_conf.problems.push(
                        ErrorCode::ExpectedElisionOrRebinding.to_problem(vec![], first_piece.1),
                    );
                }
            }
        }
        imp_conf
    }

    /// processes an import statement
    #[async_recursion(?Send)]
    async fn process_import(&self, statement: &ParsedItem, remote_search: bool) -> Import {
        let at_pos: Offsets = [statement.1[0] - 1, statement.1[0] - 1];
        let mut result = Import {
            name: ".".to_owned(),
            hash: String::new(),
            name_position: at_pos,
            hash_position: at_pos,
            problems: vec![],
            position: [statement.1[0] - 1, statement.1[1]],
            configuration: None,
            sequence: None,
        };

        // parse all items delimited by whitespaces
        let mut is_valid = false;
        let mut pieces = exclusive_parse(&statement.0, &WS_PATTERN, statement.1[0], false);
        if let Some(name_or_hash) = pieces.first() {
            let mut config_pieces_start_index = 1;
            if HEX_PATTERN.is_match(&name_or_hash.0) {
                result.name = ".".to_owned();
                result.name_position = name_or_hash.1;
                result.hash = name_or_hash.0.to_ascii_lowercase();
                result.hash_position = name_or_hash.1;
                if name_or_hash.0.len() % 2 == 1 {
                    result
                        .problems
                        .push(ErrorCode::OddLenHex.to_problem(vec![], name_or_hash.1));
                } else {
                    is_valid = true;
                }
            } else {
                result.name = name_or_hash.0.clone();
                result.name_position = name_or_hash.1;
                if !WORD_PATTERN.is_match(&name_or_hash.0) {
                    result.problems.push(
                        ErrorCode::InvalidWordPattern
                            .to_problem(vec![&name_or_hash.0], name_or_hash.1),
                    );
                }
            }
            if result.name != "." {
                if let Some(hash) = pieces[1..].first() {
                    config_pieces_start_index = 2;
                    if HEX_PATTERN.is_match(&hash.0) {
                        result.hash = hash.0.to_ascii_lowercase();
                        result.hash_position = hash.1;
                        if hash.0.len() % 2 == 1 {
                            result
                                .problems
                                .push(ErrorCode::OddLenHex.to_problem(vec![], hash.1));
                        } else {
                            is_valid = true;
                        }
                    } else {
                        result
                            .problems
                            .push(ErrorCode::ExpectedHexLiteral.to_problem(vec![], hash.1));
                    }
                } else {
                    result
                        .problems
                        .push(ErrorCode::ExpectedHexLiteral.to_problem(vec![], at_pos));
                }
            }

            // handle import configurations, (renames, rebindings, elisions)
            if !pieces[config_pieces_start_index..].is_empty() {
                result.configuration = Some(Self::process_import_config(
                    &mut pieces[config_pieces_start_index..].iter_mut(),
                ));
            };
        } else {
            result
                .problems
                .push(ErrorCode::InvalidImport.to_problem(vec![], at_pos));
        }

        // do not continue if import statement is not valid
        if !is_valid {
            return result;
        }

        let hash_bytes = alloy_primitives::hex::decode(&result.hash).unwrap();
        let subgraphs = { self.meta_store.read().unwrap().subgraphs().clone() };

        // read the corresponding hash from CAS
        let opt_meta_seq = self
            .fetch_import_contents(&subgraphs, &hash_bytes, &mut result, remote_search)
            .await;

        // continue based on if the result was a deployer or a meta
        if let Some(meta_items) = opt_meta_seq {
            self.process_meta_import(meta_items, &mut result, remote_search)
                .await;
        } else if result
            .problems
            .iter()
            .all(|p| p.code != ErrorCode::CorruptMeta)
        {
            result.problems.push(
                ErrorCode::UndefinedImport.to_problem(vec![&result.hash], result.hash_position),
            );
        }
        result
    }

    // read the corresponding hash from CAS, the result is either a deployer or a meta or not found
    // this should be done with care for the CAS read/write lock
    async fn fetch_import_contents(
        &self,
        subgraphs: &Vec<String>,
        hash_bytes: &[u8],
        result: &mut Import,
        remote_search: bool,
    ) -> Option<Vec<RainMetaDocumentV1Item>> {
        if let Some(cached_meta) = self.meta_store.read().unwrap().get_meta(hash_bytes) {
            match RainMetaDocumentV1Item::cbor_decode(&cached_meta.clone()) {
                Ok(v) => {
                    if is_consumable(&v) {
                        return Some(v);
                    } else {
                        result.problems.push(
                            ErrorCode::InconsumableMeta.to_problem(vec![], result.hash_position),
                        );
                    }
                }
                Err(_) => {
                    result
                        .problems
                        .push(ErrorCode::CorruptMeta.to_problem(vec![], result.hash_position));
                }
            }
        };
        if remote_search {
            if let Ok(meta_res) = search(&result.hash, subgraphs).await {
                self.meta_store
                    .write()
                    .unwrap()
                    .update_with(hash_bytes, &meta_res.bytes);

                match RainMetaDocumentV1Item::cbor_decode(&meta_res.bytes) {
                    Ok(v) => {
                        if is_consumable(&v) {
                            return Some(v);
                        } else {
                            result.problems.push(
                                ErrorCode::InconsumableMeta
                                    .to_problem(vec![], result.hash_position),
                            );
                            return None;
                        }
                    }
                    Err(_) => {
                        result
                            .problems
                            .push(ErrorCode::CorruptMeta.to_problem(vec![], result.hash_position));
                        return None;
                    }
                }
            } else {
                return None;
            }
        }
        None
    }

    /// validates and processes an import that is meta
    async fn process_meta_import(
        &self,
        meta_items: Vec<RainMetaDocumentV1Item>,
        result: &mut Import,
        remote_search: bool,
    ) {
        result.sequence = Some(ImportSequence { dotrain: None });
        for meta in meta_items {
            match meta.unpack() {
                Ok(meta_data) => {
                    if matches!(meta.magic, KnownMagic::DotrainV1) {
                        if let Ok(dotrain_text) = DotrainMeta::from_utf8(meta_data) {
                            let mut dotrain = RainDocument::new(
                                dotrain_text,
                                Some(self.meta_store.clone()),
                                self.import_depth + 1,
                                self.known_words.clone(),
                            );
                            if remote_search {
                                dotrain.parse(true).await;
                            } else {
                                dotrain.parse(false).await;
                            }
                            if !dotrain.problems.is_empty() {
                                result.problems.push(
                                    ErrorCode::InvalidRainDocument
                                        .to_problem(vec![], result.hash_position),
                                );
                            }
                            result.sequence.as_mut().unwrap().dotrain = Some(dotrain);
                        } else {
                            result.sequence = None;
                            result.problems.push(
                                ErrorCode::CorruptMeta.to_problem(vec![], result.hash_position),
                            );
                            break;
                        }
                    }
                }
                Err(_e) => {
                    result.sequence = None;
                    result
                        .problems
                        .push(ErrorCode::CorruptMeta.to_problem(vec![], result.hash_position));
                    break;
                }
            }
        }
    }

    /// processing imports' namespace and building a ready to merge namespace from each
    /// this requires checking each import's namespace for possible issues (duplicate keys, duplicate word sets, etc)
    /// as well as applying renames, rebindings and elidings
    fn build_imports_namespaces(
        &mut self,
        namespace: &Namespace,
    ) -> VecDeque<(String, Offsets, Namespace)> {
        let mut imported_namespaces = VecDeque::new();
        for (i, imp) in self.imports.iter().enumerate() {
            if imp.problems.is_empty() {
                if let Some(item) = namespace.get(&imp.name) {
                    if item.is_leaf() {
                        self.problems.push(
                            ErrorCode::OccupiedNamespace.to_problem(vec![], imp.hash_position),
                        );
                    }
                } else if Self::is_deep_import(imp) {
                    self.problems
                        .push(ErrorCode::DeepImport.to_problem(vec![], imp.hash_position));
                } else {
                    let mut new_imp_namespace: Namespace = HashMap::new();
                    if let Some(seq) = &imp.sequence {
                        if let Some(dotrain) = &seq.dotrain {
                            new_imp_namespace.extend(Self::copy_namespace(
                                &dotrain.namespace,
                                i as isize,
                                &imp.hash,
                            ));
                        }
                        if let Some(configs) = &imp.configuration {
                            // applies the configurations and reports back the found problems
                            // to be pushed to main problems list
                            self.problems.extend(Self::apply_import_configs(
                                configs,
                                &mut new_imp_namespace,
                            ));
                        }
                        imported_namespaces.push_back((
                            imp.name.clone(),
                            imp.hash_position,
                            new_imp_namespace,
                        ));
                    }
                }
            }
        }
        imported_namespaces
    }

    /// applies the import configurations to their corresponding ready to merge namespace
    /// returns the found problems in the configurations
    fn apply_import_configs(
        configs: &ImportConfiguration,
        new_imp_namespace: &mut Namespace,
    ) -> Vec<Problem> {
        let mut problems = vec![];
        for (old_conf, opt_new_conf) in &configs.groups {
            if let Some(new_conf) = &opt_new_conf {
                if new_conf.0 == "!" {
                    if new_imp_namespace.remove(&old_conf.0).is_none() {
                        problems.push(
                            ErrorCode::UndefinedIdentifier
                                .to_problem(vec![&old_conf.0], old_conf.1),
                        );
                    }
                } else {
                    let key = old_conf.0.strip_prefix('\'').unwrap_or(&old_conf.0);
                    if new_imp_namespace.contains_key(key) {
                        if old_conf.0.starts_with('\'') {
                            if new_imp_namespace.contains_key(&new_conf.0) {
                                problems.push(
                                    ErrorCode::UnexpectedRename
                                        .to_problem(vec![&new_conf.0], new_conf.1),
                                );
                            } else {
                                let ns_item = new_imp_namespace.remove(key).unwrap();
                                new_imp_namespace.insert(new_conf.0.clone(), ns_item);
                            }
                        } else {
                            let ns_item = new_imp_namespace.get_mut(key).unwrap();
                            if let NamespaceItem::Leaf(leaf) = ns_item {
                                leaf.element.item = BindingItem::Literal(LiteralBindingItem {
                                    value: new_conf.0.clone(),
                                })
                            } else {
                                problems.push(
                                    ErrorCode::UnexpectedRebinding
                                        .to_problem(vec![], [old_conf.1[0], new_conf.1[1]]),
                                );
                            }
                        }
                    } else {
                        problems
                            .push(ErrorCode::UndefinedIdentifier.to_problem(vec![key], old_conf.1));
                    }
                }
            }
        }
        problems
    }

    /// processes a binding item
    fn process_binding<'a>(
        &mut self,
        parsed_binding: &'a ParsedItem,
        namespace: &mut Namespace,
    ) -> Option<&'a str> {
        let position = parsed_binding.1;
        let name: String;
        let name_position: Offsets;
        let mut content = String::new();
        let content_position: Offsets;
        let mut raw_content = ""; // without comments

        if let Some(boundry_offset) = parsed_binding.0.find([' ', '\t', '\r', '\n']) {
            let slices = parsed_binding.0.split_at(boundry_offset + 1);
            let raw_trimmed = tracked_trim(slices.1);
            raw_content = if raw_trimmed.0.is_empty() {
                slices.1
            } else {
                raw_trimmed.0
            };

            let content_text = self
                .text
                .get(parsed_binding.1[0]..parsed_binding.1[1])
                .unwrap()
                .to_owned();
            name = slices.0[..slices.0.len() - 1].to_owned();
            name_position = [parsed_binding.1[0], parsed_binding.1[0] + boundry_offset];

            let slices = content_text.split_at(boundry_offset + 1);
            let trimmed_content = tracked_trim(slices.1);
            content_position = if trimmed_content.0.is_empty() {
                [
                    parsed_binding.1[0] + boundry_offset + 1,
                    parsed_binding.1[1],
                ]
            } else {
                [
                    parsed_binding.1[0] + boundry_offset + 1 + trimmed_content.1,
                    parsed_binding.1[1] - trimmed_content.2,
                ]
            };
            content = if trimmed_content.0.is_empty() {
                slices.1.to_owned()
            } else {
                trimmed_content.0.to_owned()
            };
        } else {
            name = parsed_binding.0.clone();
            name_position = parsed_binding.1;
            content_position = [parsed_binding.1[1] + 1, parsed_binding.1[1] + 1];
        }
        let invalid_id = !WORD_PATTERN.is_match(&name);
        let dup_id = self.namespace.contains_key(&name);

        if invalid_id {
            self.problems
                .push(ErrorCode::InvalidWordPattern.to_problem(vec![&name], name_position));
        }
        if dup_id {
            self.problems
                .push(ErrorCode::DuplicateIdentifier.to_problem(vec![&name], name_position));
        }
        if raw_content.is_empty() || raw_content.chars().all(|c| c.is_whitespace()) {
            self.problems
                .push(ErrorCode::InvalidEmptyBinding.to_problem(vec![&name], name_position));
        }

        let mut is_exp = false;
        if !invalid_id && !dup_id {
            let item;
            if let Some(mut msg) = Self::is_elided(raw_content) {
                if msg.is_empty() {
                    msg = DEFAULT_ELISION.to_owned();
                }
                item = BindingItem::Elided(ElidedBindingItem { msg });
            } else if let Some((value, is_str_literal, has_err)) = Self::is_constant(raw_content) {
                if is_str_literal {
                    if has_err {
                        self.problems.push(
                            ErrorCode::UnexpectedStringLiteral.to_problem(vec![], content_position),
                        );
                    }
                } else if HEX_PATTERN.is_match(&value) && value.len() % 2 == 1 {
                    self.problems
                        .push(ErrorCode::OddLenHex.to_problem(vec![], content_position));
                } else if has_err {
                    self.problems
                        .push(ErrorCode::OutOfRangeValue.to_problem(vec![], content_position));
                }
                item = BindingItem::Literal(LiteralBindingItem { value });
            } else {
                // occupy the key with empty rainlang ast, later on will
                // be replaced with parsed ast once global words are resolved
                is_exp = true;
                item = BindingItem::Exp(RainlangDocument::new());
            }
            let binding = Binding {
                name: name.clone(),
                name_position,
                content,
                content_position,
                position,
                problems: vec![],
                dependencies: vec![],
                item,
            };
            self.bindings.push(binding.clone());
            namespace.insert(
                name,
                NamespaceItem::Leaf(NamespaceLeaf {
                    hash: String::new(),
                    import_index: -1,
                    element: binding,
                }),
            );
        }
        if is_exp {
            Some(raw_content)
        } else {
            None
        }
    }

    /// copies a namespaces with given import index and hash
    fn copy_namespace(namespace: &Namespace, index: isize, hash: &str) -> Namespace {
        let mut new_namespace: Namespace = HashMap::new();
        for (key, item) in namespace {
            match item {
                NamespaceItem::Leaf(leaf) => {
                    new_namespace.insert(
                        key.clone(),
                        NamespaceItem::Leaf(NamespaceLeaf {
                            hash: if leaf.hash.is_empty() {
                                hash.to_owned()
                            } else {
                                leaf.hash.clone()
                            },
                            import_index: index,
                            element: leaf.element.clone(),
                        }),
                    );
                }
                NamespaceItem::Node(node) => {
                    new_namespace.insert(
                        key.to_owned(),
                        NamespaceItem::Node(Self::copy_namespace(node, index, hash)),
                    );
                }
            }
        }
        new_namespace
    }

    /// checks if a namespace can safely be merged into another namespace
    fn check_namespace(new: &Namespace, main: &Namespace) -> Option<ErrorCode> {
        if main.is_empty() {
            None
        } else {
            for (new_ns_key, new_ns_item) in new {
                for (main_ns_key, main_ns_item) in main {
                    if new_ns_key == main_ns_key {
                        let new_is_leaf = new_ns_item.is_leaf();
                        let main_is_leaf = main_ns_item.is_leaf();
                        if !new_is_leaf && !main_is_leaf {
                            let res = Self::check_namespace(
                                new_ns_item.unwrap_node(),
                                main_ns_item.unwrap_node(),
                            );
                            if res.is_some() {
                                return res;
                            };
                        } else if new_is_leaf && main_is_leaf {
                            return Some(ErrorCode::CollidingNamespaceNodes);
                        } else {
                            return Some(ErrorCode::OccupiedNamespace);
                        }
                    }
                }
            }
            None
        }
    }

    /// merges an imported namespaces to the main namespace
    fn merge_namespace(
        &mut self,
        name: String,
        hash_position: Offsets,
        new: Namespace,
        main: &mut Namespace,
    ) {
        if name != "." {
            if let Some(ns_item) = main.get_mut(&name) {
                match ns_item {
                    NamespaceItem::Leaf(_) => self
                        .problems
                        .push(ErrorCode::OccupiedNamespace.to_problem(vec![], hash_position)),
                    NamespaceItem::Node(node) => {
                        if let Some(code) = Self::check_namespace(&new, node) {
                            self.problems.push(code.to_problem(vec![], hash_position));
                        } else {
                            Self::merge(&new, node)
                        }
                    }
                }
            } else {
                main.insert(name.clone(), NamespaceItem::Node(new));
            }
        } else {
            Self::merge(&new, main);
        }
    }

    /// recursivly merges 2 namespaces
    fn merge(new: &Namespace, main: &mut Namespace) {
        if main.is_empty() {
            main.extend(new.clone())
        } else {
            for (key, item) in new {
                if !main.contains_key(key) {
                    main.insert(key.clone(), item.clone());
                } else if !item.is_leaf() && !main.get(key).unwrap().is_leaf() {
                    Self::merge(new, main)
                }
            }
        }
    }

    /// processes the expressions dependencies and checks for any possible circular dependecy
    fn process_dependencies(&mut self, mut raw_contents: VecDeque<&str>) {
        let mut topo_sort: TopoSort<&str> = TopoSort::new();
        let deps_map: Vec<&mut Binding> = self
            .bindings
            .iter_mut()
            .filter_map(|binding| match binding.item {
                BindingItem::Exp(_) => {
                    if let Some(raw_content) = raw_contents.pop_front() {
                        for dep in DEP_PATTERN.find_iter(raw_content) {
                            let dep_as_string = dep.as_str().strip_prefix('\'').unwrap().to_owned();
                            binding.dependencies.push(dep_as_string);
                        }
                        Some(binding)
                    } else {
                        None
                    }
                }
                _ => None,
            })
            .collect();

        for edge in &deps_map {
            topo_sort.insert(
                &edge.name,
                edge.dependencies
                    .iter()
                    .map(|v| v.as_str())
                    .collect::<Vec<&str>>(),
            );
        }
        let mut resolved_nodes: Vec<String> = vec![];
        match topo_sort.into_vec_nodes() {
            SortResults::Full(_) => return,
            SortResults::Partial(resolved_deps) => {
                for d in resolved_deps {
                    resolved_nodes.push(d.to_owned());
                }
            }
        };
        for node in deps_map {
            if !resolved_nodes.contains(&node.name) {
                node.problems
                    .push(ErrorCode::CircularDependency.to_problem(vec![], node.name_position));
            }
        }
    }
}

impl PartialEq for RainDocument {
    fn eq(&self, other: &Self) -> bool {
        self.import_depth == other.import_depth
            && self.text == other.text
            && self.front_matter_offset == other.front_matter_offset
            && self.comments == other.comments
            && self.bindings == other.bindings
            && self.namespace == other.namespace
            && self.imports == other.imports
            && self.known_words == other.known_words
            && self.problems == other.problems
            && self.error == other.error
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::rainlangdocument::RainlangDocument;

    #[test]
    fn test_is_constant_method() -> anyhow::Result<()> {
        let text = " \n 1234 \n\t ";
        let result = RainDocument::is_constant(text);
        assert_eq!(result, Some(("1234".to_owned(), false, false)));

        let text = " \n 14e6";
        let result = RainDocument::is_constant(text);
        assert_eq!(result, Some(("14e6".to_owned(), false, false)));

        let text = " \t 0x1234abcdef ";
        let result = RainDocument::is_constant(text);
        assert_eq!(result, Some(("0x1234abcdef".to_owned(), false, false)));

        let text = " \n 99999e99999 \n";
        let result = RainDocument::is_constant(text);
        assert_eq!(result, Some(("99999e99999".to_owned(), false, true)));

        let text = "\" some\n literal  \nvalue\t\n \"";
        let result = RainDocument::is_constant(text);
        assert_eq!(
            result,
            Some(("\" some\n literal  \nvalue\t\n \"".to_owned(), true, false))
        );

        let text = "\" some\n literal\n with no end ";
        let result = RainDocument::is_constant(text);
        assert_eq!(
            result,
            Some(("\" some\n literal\n with no end ".to_owned(), true, true))
        );

        let text = " \n 999 234 \n";
        let result = RainDocument::is_constant(text);
        assert_eq!(result, None);

        Ok(())
    }

    #[test]
    fn test_is_elided_method() -> anyhow::Result<()> {
        let text = " ! \n some msg \n msg continues \n\t";
        let result = RainDocument::is_elided(text);
        assert_eq!(result, Some("some msg \n msg continues".to_owned()));

        let text = " ! \n\t";
        let result = RainDocument::is_elided(text);
        assert_eq!(result, Some("".to_owned()));

        let text = "some msg";
        let result = RainDocument::is_elided(text);
        assert_eq!(result, None);

        Ok(())
    }

    #[test]
    fn test_process_import_config_method() -> anyhow::Result<()> {
        let text = " 'item1 renamed-item1 \n  \n\n\t item2 0x1234 \n";
        let mut config_items = exclusive_parse(text, &WS_PATTERN, 0, false);
        let result = RainDocument::process_import_config(&mut config_items.iter_mut());
        let expected = ImportConfiguration {
            groups: vec![
                (
                    ParsedItem("'item1".to_owned(), [1, 7]),
                    Some(ParsedItem("renamed-item1".to_owned(), [8, 21])),
                ),
                (
                    ParsedItem("item2".to_owned(), [29, 34]),
                    Some(ParsedItem("0x1234".to_owned(), [35, 41])),
                ),
            ],
            problems: vec![],
        };
        assert_eq!(result, expected);

        let text = "'item1 renamed-item1 . ";
        let mut config_items = exclusive_parse(text, &WS_PATTERN, 0, false);
        let result = RainDocument::process_import_config(&mut config_items.iter_mut());
        let expected = ImportConfiguration {
            groups: vec![
                (
                    ParsedItem("'item1".to_owned(), [0, 6]),
                    Some(ParsedItem("renamed-item1".to_owned(), [7, 20])),
                ),
                (ParsedItem(".".to_owned(), [21, 22]), None),
            ],
            problems: vec![ErrorCode::ExpectedElisionOrRebinding.to_problem(vec![], [21, 22])],
        };
        assert_eq!(result, expected);

        let text = "Bad-name 0x1234";
        let mut config_items = exclusive_parse(text, &WS_PATTERN, 0, false);
        let result = RainDocument::process_import_config(&mut config_items.iter_mut());
        let expected = ImportConfiguration {
            groups: vec![(
                ParsedItem("Bad-name".to_owned(), [0, 8]),
                Some(ParsedItem("0x1234".to_owned(), [9, 15])),
            )],
            problems: vec![ErrorCode::UnexpectedToken.to_problem(vec![], [0, 8])],
        };
        assert_eq!(result, expected);

        Ok(())
    }

    #[test]
    fn test_process_import_method() -> anyhow::Result<()> {
        let mut meta_store = Store::new();
        let hash = "0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184";
        let hash_bytes = alloy_primitives::hex::decode(hash).unwrap();
        meta_store.update_with(&hash_bytes, "meta2-bytes".as_bytes());

        let rain_document = RainDocument::new(
            String::new(),
            Some(Arc::new(RwLock::new(meta_store))),
            0,
            None,
        );
        let statements = vec![ParsedItem(
            "0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184".to_owned(),
            [17, 83],
        )];

        let result = block_on(rain_document.process_import(&statements[0], false));
        let expected = Import {
            name: ".".to_owned(),
            name_position: [17, 83],
            hash: hash.to_owned(),
            hash_position: [17, 83],
            position: [16, 83],
            problems: vec![ErrorCode::CorruptMeta.to_problem(vec![], [17, 83])],
            configuration: None,
            sequence: None,
        };
        assert_eq!(result, expected);

        Ok(())
    }

    #[test]
    fn test_check_namespace_method() -> anyhow::Result<()> {
        let mut main_namespace: Namespace = HashMap::new();
        let mut new_namespace: Namespace = HashMap::new();
        main_namespace.insert(
            "binding-name".to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: "0xabc".to_owned(),
                import_index: -1,
                element: Binding {
                    name: "binding-name".to_owned(),
                    name_position: [0, 1],
                    content: "some-content".to_owned(),
                    content_position: [2, 10],
                    position: [0, 10],
                    problems: vec![],
                    dependencies: vec![],
                    item: BindingItem::Literal(LiteralBindingItem {
                        value: "3e18".to_owned(),
                    }),
                },
            }),
        );
        new_namespace.insert(
            "binding-name".to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: "0xabc".to_owned(),
                import_index: -1,
                element: Binding {
                    name: "binding-name".to_owned(),
                    name_position: [0, 1],
                    content: "some-content".to_owned(),
                    content_position: [2, 10],
                    position: [0, 10],
                    problems: vec![],
                    dependencies: vec![],
                    item: BindingItem::Literal(LiteralBindingItem {
                        value: "3e18".to_owned(),
                    }),
                },
            }),
        );
        assert_eq!(
            RainDocument::check_namespace(&new_namespace, &main_namespace),
            Some(ErrorCode::CollidingNamespaceNodes)
        );

        let mut main_namespace: Namespace = HashMap::new();
        let mut new_namespace: Namespace = HashMap::new();
        main_namespace.insert(
            "binding-name".to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: "0xabc".to_owned(),
                import_index: -1,
                element: Binding {
                    name: "binding-name".to_owned(),
                    name_position: [0, 1],
                    content: "some-content".to_owned(),
                    content_position: [2, 10],
                    position: [0, 10],
                    problems: vec![],
                    dependencies: vec![],
                    item: BindingItem::Literal(LiteralBindingItem {
                        value: "3e18".to_owned(),
                    }),
                },
            }),
        );
        new_namespace.insert(
            "binding-other-name".to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: "0xabc".to_owned(),
                import_index: -1,
                element: Binding {
                    name: "binding-other-name".to_owned(),
                    name_position: [0, 1],
                    content: "some-other-content".to_owned(),
                    content_position: [2, 10],
                    position: [0, 10],
                    problems: vec![],
                    dependencies: vec![],
                    item: BindingItem::Literal(LiteralBindingItem {
                        value: "3e18".to_owned(),
                    }),
                },
            }),
        );
        assert_eq!(
            RainDocument::check_namespace(&new_namespace, &main_namespace),
            None
        );

        Ok(())
    }

    #[test]
    fn test_merge_namespace_method() -> anyhow::Result<()> {
        let mut main_namespace: Namespace = HashMap::new();
        let mut new_namespace: Namespace = HashMap::new();
        main_namespace.insert(
            "binding-name".to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: "0xabc".to_owned(),
                import_index: -1,
                element: Binding {
                    name: "binding-name".to_owned(),
                    name_position: [0, 1],
                    content: "some-content".to_owned(),
                    content_position: [2, 10],
                    position: [0, 10],
                    problems: vec![],
                    dependencies: vec![],
                    item: BindingItem::Literal(LiteralBindingItem {
                        value: "3e18".to_owned(),
                    }),
                },
            }),
        );
        new_namespace.insert(
            "binding-other-name".to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: "0xabc".to_owned(),
                import_index: -1,
                element: Binding {
                    name: "binding-other-name".to_owned(),
                    name_position: [0, 1],
                    content: "some-other-content".to_owned(),
                    content_position: [2, 10],
                    position: [0, 10],
                    problems: vec![],
                    dependencies: vec![],
                    item: BindingItem::Literal(LiteralBindingItem {
                        value: "3e18".to_owned(),
                    }),
                },
            }),
        );
        main_namespace.insert(
            "deep-namespace".to_owned(),
            NamespaceItem::Node(new_namespace.clone()),
        );

        let mut rain_document = RainDocument::new(String::new(), None, 0, None);
        rain_document.merge_namespace(
            ".".to_owned(),
            [0, 10],
            new_namespace.clone(),
            &mut main_namespace,
        );
        let mut expected = main_namespace.clone();
        expected.insert(
            "binding-other-name".to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: "0xabc".to_owned(),
                import_index: -1,
                element: Binding {
                    name: "binding-other-name".to_owned(),
                    name_position: [0, 1],
                    content: "some-other-content".to_owned(),
                    content_position: [2, 10],
                    position: [0, 10],
                    problems: vec![],
                    dependencies: vec![],
                    item: BindingItem::Literal(LiteralBindingItem {
                        value: "3e18".to_owned(),
                    }),
                },
            }),
        );
        assert_eq!(main_namespace, expected);
        assert!(rain_document.problems.is_empty());

        let mut rain_document = RainDocument::new(String::new(), None, 0, None);
        rain_document.merge_namespace(
            "deep-namespace".to_owned(),
            [0, 10],
            new_namespace,
            &mut main_namespace,
        );
        let expected = main_namespace.clone();
        assert_eq!(main_namespace, expected);
        assert_eq!(
            rain_document.problems,
            vec![ErrorCode::CollidingNamespaceNodes.to_problem(vec![], [0, 10])]
        );

        Ok(())
    }

    #[test]
    fn test_parse_method() -> anyhow::Result<()> {
        let store = Store::new();
        let meta_store = Arc::new(RwLock::new(store));

        let text = r"some front matter
---
/** this is test */
                                                                           

#const-binding 4e18
#elided-binding ! this elided, rebind before use
#exp-binding
_: opcode-1(0xabcd 456);
";
        let rain_document = RainDocument::create(text.to_owned(), Some(meta_store.clone()), None);
        let expected_bindings: Vec<Binding> = vec![
            Binding {
                name: "const-binding".to_owned(),
                name_position: [120, 133],
                content: "4e18".to_owned(),
                content_position: [134, 138],
                position: [120, 139],
                problems: vec![],
                dependencies: vec![],
                item: BindingItem::Literal(LiteralBindingItem {
                    value: "4e18".to_owned(),
                }),
            },
            Binding {
                name: "elided-binding".to_owned(),
                name_position: [140, 154],
                content: "! this elided, rebind before use".to_owned(),
                content_position: [155, 187],
                position: [140, 188],
                problems: vec![],
                dependencies: vec![],
                item: BindingItem::Elided(ElidedBindingItem {
                    msg: "this elided, rebind before use".to_owned(),
                }),
            },
            Binding {
                name: "exp-binding".to_owned(),
                name_position: [189, 200],
                content: "_: opcode-1(0xabcd 456);".to_owned(),
                content_position: [201, 225],
                position: [189, 226],
                problems: vec![],
                dependencies: vec![],
                item: BindingItem::Exp(RainlangDocument::create(
                    "_: opcode-1(0xabcd 456);".to_owned(),
                    &HashMap::new(),
                    None,
                )),
            },
        ];
        let mut expected_namespace: Namespace = HashMap::new();
        expected_namespace.insert(
            expected_bindings[0].name.to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: String::new(),
                import_index: -1,
                element: expected_bindings[0].clone(),
            }),
        );
        expected_namespace.insert(
            expected_bindings[1].name.to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: String::new(),
                import_index: -1,
                element: expected_bindings[1].clone(),
            }),
        );
        expected_namespace.insert(
            expected_bindings[2].name.to_owned(),
            NamespaceItem::Leaf(NamespaceLeaf {
                hash: String::new(),
                import_index: -1,
                element: expected_bindings[2].clone(),
            }),
        );

        let expected_rain_document = RainDocument {
            text: text.to_owned(),
            front_matter_offset: 18,
            error: None,
            bindings: expected_bindings.clone(),
            imports: vec![],
            comments: vec![Comment {
                comment: "/** this is test */".to_owned(),
                position: [22, 41],
            }],
            problems: vec![],
            import_depth: 0,
            namespace: expected_namespace,
            meta_store,
            known_words: None,
        };
        assert_eq!(rain_document, expected_rain_document);

        Ok(())
    }
}
