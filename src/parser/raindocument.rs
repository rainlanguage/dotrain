use lsp_types::Url;
use std::sync::{Arc, RwLock};
use serde::{Serialize, Deserialize};
use async_recursion::async_recursion;
use topo_sort::{SortResults, TopoSort};
use std::collections::{HashMap, VecDeque};
use futures::{executor::block_on, future::join_all};
use rain_meta::{
    types::{dotrain::v1::DotrainMeta, authoring::v1::AuthoringMeta},
    Store, NPE2Deployer, KnownMagic, RainMetaDocumentV1Item, search_deployer, search,
};
use super::{
    rainlangdocument::RainlangDocument,
    super::{
        error::Error,
        types::{ast::*, patterns::*},
    },
    exclusive_parse, inclusive_parse, fill_in, is_consumable, tracked_trim, line_number, to_u256,
};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;
#[cfg(any(feature = "js-api", target_family = "wasm"))]
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
use dotrain::{RainDocument, Url, Store};

let text = "some .rain text content".to_string();
let uri = Url::parse("file:///example.rain").unwrap();

let meta_store = Arc::new(RwLock::new(Store::default()));

// create a new instance that gets parsed right away
let rain_document = RainDocument::create(text, uri, Some(meta_store));

// get all problems
let problems = rain_document.all_problems();

// let entrypoints = vec![
//    "entrypoint1".to_string(), 
//    "entrypoint2".to_string()
// ];
// let revm = None;

// compile this instance to get ExpressionConfig
// let result = rain_document.compile(&entrypoints, revm);
```
"#
)]
#[cfg_attr(
    target_family = "wasm",
    doc = " @example
 ```javascript
 // create a new instane
 // uri must be a valid URL
 const rainDocument = RainDocument.create(text, uri, meta_store);

 // alternatively instantiate with remote meta search enabled
 const rainDocument = await RainDocument.createAsync(text, uri, meta_store);

 // get all problems
 const problems = rainDocument.allProblems;

 // compile this instance to get ExpressionConfig
 const expConfig = rainDocument.compile([\"entrypoint1\", \"entrypoint2\"]);
 ```
"
)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    wasm_bindgen,
    derive(Tsify)
)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(rename(serialize = "IRainDocument"))]
pub struct RainDocument {
    pub(crate) version: usize,
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "string")
    )]
    pub(crate) uri: Url,
    pub(crate) text: String,
    pub(crate) front_matter: String,
    pub(crate) error: Option<String>,
    pub(crate) bindings: Vec<Binding>,
    pub(crate) imports: Vec<Import>,
    pub(crate) comments: Vec<Comment>,
    pub(crate) problems: Vec<Problem>,
    pub(crate) import_depth: usize,
    pub(crate) ignore_words: bool,
    pub(crate) ignore_undefined_words: bool,
    pub(crate) namespace: Namespace,
    #[serde(skip)]
    pub(crate) meta_store: Arc<RwLock<Store>>,
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "IAuthoringMeta | undefined")
    )]
    pub(crate) authoring_meta: Option<AuthoringMeta>,
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "INPE2Deployer")
    )]
    pub(crate) deployer: NPE2Deployer,
}

impl RainDocument {
    /// Creates an instance and parses with remote meta search enabled
    pub async fn create_async(
        text: String,
        uri: Url,
        meta_store: Option<Arc<RwLock<Store>>>,
    ) -> RainDocument {
        let mut rd = RainDocument::_new(text, uri, 0, meta_store, 0);
        rd.parse(true).await;
        rd
    }

    /// Creates an instance and parses with remote meta search disabled (cached metas only)
    pub fn create(text: String, uri: Url, meta_store: Option<Arc<RwLock<Store>>>) -> RainDocument {
        let mut rd = RainDocument::_new(text, uri, 0, meta_store, 0);
        block_on(rd.parse(false));
        rd
    }

    /// Updates the text and parses right away with remote meta search disabled (cached metas only)
    pub fn update_text(&mut self, new_text: String) {
        self.text = new_text;
        self.version += 1;
        block_on(self.parse(false));
    }

    /// Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only)
    pub fn update(&mut self, new_text: String, uri: Url, version: usize) {
        self.text = new_text;
        self.uri = uri;
        self.version = version;
        block_on(self.parse(false));
    }

    /// Updates the text and parses right away with remote meta search enabled
    pub async fn update_text_async(&mut self, new_text: String) {
        self.text = new_text;
        self.version += 1;
        self.parse(true).await;
    }

    /// Updates the text, uri, version and parses right away with remote meta search enabled
    pub async fn update_async(&mut self, new_text: String, uri: Url, version: usize) {
        self.text = new_text;
        self.uri = uri;
        self.version = version;
        self.parse(true).await;
    }

    /// This instance's current text
    pub fn text(&self) -> &String {
        &self.text
    }

    /// This instance's front matter
    pub fn front_matter(&self) -> &String {
        &self.front_matter
    }

    /// This instance's current URI
    pub fn uri(&self) -> &Url {
        &self.uri
    }

    /// This instance's current version
    pub fn version(&self) -> usize {
        self.version
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

    /// If 'ignore_words' lint option is enabled or not
    pub fn ignore_words(&self) -> bool {
        self.ignore_words
    }

    /// If 'ignore_undefined_words' lint option is enabled or not
    pub fn ignore_undefined_words(&self) -> bool {
        self.ignore_undefined_words
    }

    /// This instance's AuthoringMeta
    pub fn authoring_meta(&self) -> &Option<AuthoringMeta> {
        &self.authoring_meta
    }

    /// This instance's NPE2 Deployer details
    pub fn deployer(&self) -> &NPE2Deployer {
        &self.deployer
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
            self.authoring_meta = None;
            self.front_matter = String::new();
            self.deployer = NPE2Deployer::default();
            self.ignore_words = false;
            self.ignore_undefined_words = false;
        }
    }
}

impl RainDocument {
    pub(crate) fn _new(
        text: String,
        uri: Url,
        version: usize,
        meta_store: Option<Arc<RwLock<Store>>>,
        import_depth: usize,
    ) -> RainDocument {
        let ms = if let Some(v) = meta_store {
            v
        } else {
            Arc::new(RwLock::new(Store::default()))
        };
        RainDocument {
            meta_store: ms,
            text,
            uri,
            version,
            front_matter: String::new(),
            error: None,
            bindings: vec![],
            namespace: HashMap::new(),
            imports: vec![],
            authoring_meta: None,
            deployer: NPE2Deployer::default(),
            comments: vec![],
            problems: vec![],
            import_depth,
            ignore_words: false,
            ignore_undefined_words: false,
        }
    }

    /// Checks if an import is deeper than 32 levels
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

    /// Checks if a binding is elided
    #[allow(clippy::manual_strip)]
    fn is_elided(text: &str) -> Option<String> {
        let msg = text.trim();
        if msg.starts_with('!') {
            Some(msg[1..].to_owned())
        } else {
            None
        }
    }

    /// Checks if a text contains a single numeric value and returns it ie is constant binding
    fn is_constant(text: &str) -> Option<(String, bool)> {
        let items = exclusive_parse(text, &WS_PATTERN, 0, false);
        if items.len() != 1 {
            None
        } else if NUMERIC_PATTERN.is_match(&items[0].0) {
            let is_out_of_range = to_u256(&items[0].0).is_err();
            Some((items[0].0.clone(), is_out_of_range))
        } else {
            None
        }
    }

    /// copies a namespaces with given import index and hash
    fn copy_namespace(namespace: &Namespace, index: isize, hash: &str) -> Namespace {
        let mut new_namespace: Namespace = HashMap::new();
        for (key, item) in namespace {
            match item {
                NamespaceItem::Node(node) => {
                    new_namespace.insert(
                        key.clone(),
                        NamespaceItem::Node(NamespaceNode {
                            hash: if node.hash.is_empty() {
                                hash.to_owned()
                            } else {
                                node.hash.clone()
                            },
                            import_index: index,
                            element: node.element.clone(),
                        }),
                    );
                }
                NamespaceItem::Namespace(deep_namespace) => {
                    new_namespace.insert(
                        key.to_owned(),
                        NamespaceItem::Namespace(Self::copy_namespace(deep_namespace, index, hash)),
                    );
                }
            }
        }
        new_namespace
    }

    /// processes an import statement
    #[async_recursion(?Send)]
    async fn process_import(&self, statement: &ParsedItem, should_search: bool) -> Import {
        let mut start_range;
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

        let mut pieces = exclusive_parse(&statement.0, &WS_PATTERN, statement.1[0], false);
        if let Some(name_or_hash) = pieces.first() {
            start_range = 1;
            if HEX_PATTERN.is_match(&name_or_hash.0) {
                result.name = ".".to_owned();
                result.name_position = name_or_hash.1;
                // if HASH_PATTERN.is_match(&name_or_hash.0) {
                result.hash = name_or_hash.0.to_ascii_lowercase();
                result.hash_position = name_or_hash.1;
                // } else {
                // result.problems.push(Problem {
                //     msg: "invalid hash, must be 32 bytes".to_owned(),
                //     position: name_or_hash.1,
                //     code: ErrorCode::ExpectedHash,
                // });
                // }
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
                    start_range = 2;
                    if HEX_PATTERN.is_match(&hash.0) {
                        // if HASH_PATTERN.is_match(&hash.0) {
                        result.hash = hash.0.to_ascii_lowercase();
                        result.hash_position = hash.1;
                        // } else {
                        //     result.problems.push(Problem {
                        //         msg: "invalid hash, must be 32 bytes".to_owned(),
                        //         position: hash.1,
                        //         code: ErrorCode::InvalidHash,
                        //     });
                        // }
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
            if !pieces[start_range..].is_empty() {
                result.configuration = Some(ImportConfiguration {
                    problems: vec![],
                    pairs: vec![],
                });
            }
            let mut imp_conf = ImportConfiguration {
                pairs: vec![],
                problems: vec![],
            };
            let mut has_conf = false;
            let remainings = &mut pieces[start_range..].iter_mut();
            while let Some(piece) = remainings.next() {
                if !has_conf {
                    has_conf = true;
                }
                if piece.0 == "." {
                    if let Some(next) = remainings.next() {
                        if next.0 == "!" {
                            if imp_conf.pairs.iter().any(|v| {
                                if let Some(e) = &v.1 {
                                    v.0 .0 == piece.0 && e.0 == next.0
                                } else {
                                    false
                                }
                            }) {
                                imp_conf.problems.push(
                                    ErrorCode::DuplicateImportStatement
                                        .to_problem(vec![], [piece.1[0], next.1[1]]),
                                );
                            }
                        } else {
                            imp_conf
                                .problems
                                .push(ErrorCode::UnexpectedToken.to_problem(vec![], next.1));
                        }
                        imp_conf.pairs.push((piece.clone(), Some(next.clone())));
                    } else {
                        imp_conf.problems.push(
                            ErrorCode::ExpectedElisionOrRebinding.to_problem(vec![], piece.1),
                        );
                        imp_conf.pairs.push((piece.clone(), None));
                    }
                } else if WORD_PATTERN.is_match(&piece.0) {
                    if let Some(next) = remainings.next() {
                        if NUMERIC_PATTERN.is_match(&next.0) || next.0 == "!" {
                            if imp_conf.pairs.iter().any(|v| {
                                if let Some(e) = &v.1 {
                                    v.0 .0 == piece.0 && e.0 == next.0
                                } else {
                                    false
                                }
                            }) {
                                imp_conf.problems.push(
                                    ErrorCode::DuplicateImportStatement
                                        .to_problem(vec![], [piece.1[0], next.1[1]]),
                                );
                            }
                        } else {
                            imp_conf
                                .problems
                                .push(ErrorCode::UnexpectedToken.to_problem(vec![], next.1));
                        }
                        imp_conf.pairs.push((piece.clone(), Some(next.clone())));
                    } else {
                        imp_conf.problems.push(
                            ErrorCode::ExpectedElisionOrRebinding.to_problem(vec![], piece.1),
                        );
                        imp_conf.pairs.push((piece.clone(), None));
                    }
                } else if piece.0.starts_with('\'') {
                    if let Some(next) = remainings.next() {
                        if WORD_PATTERN.is_match(&piece.0[1..]) {
                            if WORD_PATTERN.is_match(&next.0) {
                                if imp_conf.pairs.iter().any(|v| {
                                    if let Some(e) = &v.1 {
                                        v.0 .0 == piece.0 && e.0 == next.0
                                    } else {
                                        false
                                    }
                                }) {
                                    imp_conf.problems.push(
                                        ErrorCode::DuplicateImportStatement
                                            .to_problem(vec![], [piece.1[0], next.1[1]]),
                                    );
                                }
                            } else {
                                imp_conf.problems.push(
                                    ErrorCode::InvalidWordPattern.to_problem(vec![&next.0], next.1),
                                );
                            }
                        } else {
                            imp_conf.problems.push(
                                ErrorCode::InvalidWordPattern.to_problem(vec![&piece.0], piece.1),
                            );
                        }
                        imp_conf.pairs.push((piece.clone(), Some(next.clone())));
                    } else {
                        imp_conf
                            .problems
                            .push(ErrorCode::ExpectedRename.to_problem(vec![], piece.1));
                        imp_conf.pairs.push((piece.clone(), None));
                    }
                } else {
                    imp_conf
                        .problems
                        .push(ErrorCode::UnexpectedToken.to_problem(vec![], piece.1));
                    imp_conf
                        .pairs
                        .push((piece.clone(), { remainings.next().map(|n| n.clone()) }));
                }
            }
            if has_conf {
                result.configuration = Some(imp_conf);
            }
        } else {
            result
                .problems
                .push(ErrorCode::InvalidImport.to_problem(vec![], at_pos));
        }
        let hash_bytes = alloy_primitives::hex::decode(&result.hash).unwrap();
        let subgraphs = { self.meta_store.read().unwrap().subgraphs().clone() };
        let mut npe2_deployer = None;
        let meta_seq = {
            let mut did_find = false;
            let seq = {
                if let Some(d) = self.meta_store.read().unwrap().get_deployer(&hash_bytes) {
                    npe2_deployer = Some(d.clone());
                    did_find = true;
                    None
                } else if let Some(r) = self.meta_store.read().unwrap().get_meta(&hash_bytes) {
                    did_find = true;
                    Some(RainMetaDocumentV1Item::cbor_decode(&r.clone()))
                } else {
                    None
                }
            };
            if !did_find && should_search {
                let deployer_search = search_deployer(&result.hash, &subgraphs);
                let meta_search = search(&result.hash, &subgraphs);
                if let Ok(deployer_res) = deployer_search.await {
                    npe2_deployer = Some(
                        self.meta_store
                            .write()
                            .unwrap()
                            .set_deployer_from_query_response(deployer_res),
                    );
                    None
                } else if let Ok(meta) = meta_search.await {
                    self.meta_store
                        .write()
                        .unwrap()
                        .update_with(&hash_bytes, &meta.bytes);
                    Some(RainMetaDocumentV1Item::cbor_decode(&meta.bytes))
                } else {
                    None
                }
            } else if did_find {
                seq
            } else {
                None
            }
        };
        if let Some(deployer) = npe2_deployer {
            result.sequence = Some(ImportSequence {
                dispair: None,
                dotrain: None,
            });
            if deployer.is_corrupt() {
                result.sequence = None;
                result
                    .problems
                    .push(ErrorCode::CorruptMeta.to_problem(vec![], result.hash_position));
            } else {
                if deployer.authoring_meta.is_none() && !self.ignore_undefined_words {
                    result.problems.push(
                        ErrorCode::UndefinedAuthoringMeta.to_problem(vec![], result.hash_position),
                    );
                };
                result.sequence.as_mut().unwrap().dispair = Some(deployer.into());
            }
        } else if let Some(seq) = meta_seq {
            if let Ok(v) = seq {
                if is_consumable(&v) {
                    result.sequence = Some(ImportSequence {
                        dispair: None,
                        dotrain: None,
                    });
                    for meta in v {
                        match meta.unpack() {
                            Ok(d) => match meta.magic {
                                KnownMagic::ExpressionDeployerV2BytecodeV1 => {
                                    let deployer = {
                                        if let Some(deployer) = self
                                            .meta_store
                                            .read()
                                            .unwrap()
                                            .get_deployer(&hash_bytes)
                                        {
                                            if deployer.is_corrupt() {
                                                result.sequence = None;
                                                result.problems.push(
                                                    ErrorCode::CorruptMeta
                                                        .to_problem(vec![], result.hash_position),
                                                );
                                                break;
                                            } else {
                                                if deployer.authoring_meta.is_none()
                                                    && !self.ignore_undefined_words
                                                {
                                                    result.problems.push(
                                                        ErrorCode::UndefinedAuthoringMeta
                                                            .to_problem(
                                                                vec![],
                                                                result.hash_position,
                                                            ),
                                                    );
                                                };
                                                Some(deployer.clone().into())
                                            }
                                        } else {
                                            None
                                        }
                                    };
                                    result.sequence.as_mut().unwrap().dispair = if deployer
                                        .is_some()
                                    {
                                        deployer
                                    } else if should_search {
                                        if let Ok(deployer_res) =
                                            search_deployer(&result.hash, &subgraphs).await
                                        {
                                            let deployer = self
                                                .meta_store
                                                .write()
                                                .unwrap()
                                                .set_deployer_from_query_response(deployer_res);
                                            if deployer.is_corrupt() {
                                                result.sequence = None;
                                                result.problems.push(
                                                    ErrorCode::CorruptMeta
                                                        .to_problem(vec![], result.hash_position),
                                                );
                                                break;
                                            } else {
                                                if deployer.authoring_meta.is_none()
                                                    && !self.ignore_undefined_words
                                                {
                                                    result.problems.push(
                                                        ErrorCode::UndefinedAuthoringMeta
                                                            .to_problem(
                                                                vec![],
                                                                result.hash_position,
                                                            ),
                                                    );
                                                };
                                                Some(deployer.into())
                                            }
                                        } else {
                                            result.problems.push(
                                                ErrorCode::UndefinedDeployerDetails
                                                    .to_problem(vec![], result.hash_position),
                                            );
                                            None
                                        }
                                    } else {
                                        result.problems.push(
                                            ErrorCode::UndefinedDeployerDetails
                                                .to_problem(vec![], result.hash_position),
                                        );
                                        None
                                    };
                                }
                                KnownMagic::DotrainV1 => {
                                    if let Ok(dmeta) = DotrainMeta::from_utf8(d) {
                                        let mut dotrain = RainDocument::_new(
                                            dmeta,
                                            Url::parse(&format!("import:///{}", result.hash))
                                                .unwrap(),
                                            0,
                                            Some(self.meta_store.clone()),
                                            self.import_depth + 1,
                                        );
                                        if should_search {
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
                                            ErrorCode::CorruptMeta
                                                .to_problem(vec![], result.hash_position),
                                        );
                                        break;
                                    }
                                }
                                _ => {}
                            },
                            Err(_e) => {
                                result.sequence = None;
                                result.problems.push(
                                    ErrorCode::CorruptMeta.to_problem(vec![], result.hash_position),
                                );
                                break;
                            }
                        }
                    }
                } else {
                    result
                        .problems
                        .push(ErrorCode::InconsumableMeta.to_problem(vec![], result.hash_position));
                }
            } else {
                result
                    .problems
                    .push(ErrorCode::CorruptMeta.to_problem(vec![], result.hash_position));
            }
        } else {
            result.problems.push(
                ErrorCode::UndefinedImport.to_problem(vec![&result.hash], result.hash_position),
            );
        }
        return result;
    }

    /// the main method that takes out and processes each section of a RainDocument
    /// text (comments, imports, etc) one after the other, builds the parse tree, builds
    /// the namespace and checks for dependency issues and resolves the global words
    #[async_recursion(?Send)]
    async fn _parse(&mut self, should_search: bool) -> Result<(), Error> {
        self.imports.clear();
        self.problems.clear();
        self.comments.clear();
        self.bindings.clear();
        self.namespace.clear();
        self.authoring_meta = None;
        self.ignore_words = false;
        self.front_matter = String::new();
        self.ignore_undefined_words = false;
        self.deployer = NPE2Deployer::default();
        let mut document = self.text.clone();
        let mut namespace: Namespace = HashMap::new();

        // split front matter and rest of the text
        if let Some(splitter) = document.find("---") {
            self.front_matter = document[..splitter].to_owned();
            fill_in(&mut document, [0, splitter + 3])?;
        };

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

            // check for lint comments
            if lint_patterns::IGNORE_WORDS.is_match(&parsed_comment.0) {
                self.ignore_words = true;
            }
            if lint_patterns::IGNORE_UNDEFINED_WORDS.is_match(&parsed_comment.0) {
                self.ignore_undefined_words = true;
            }

            fill_in(&mut document, parsed_comment.1)?;
        }

        // if a 'ignore words' lint was found, 'ignore undfeined words' should be
        // also set to true because the former is a superset of the latter
        if self.ignore_words {
            self.ignore_undefined_words = true;
        }

        // since exclusive_parse() is being used with 'including_empty_ends' arg set to true,
        // the first item of the parsed items should be ignored since it only contains the
        // text before the first match
        // this will apply for parsing imports and bindings
        let mut ignore_first = false;

        // take each import statement from the text
        let mut import_statements = exclusive_parse(&document, &IMPORTS_PATTERN, 0, true);
        for imp_statement in &mut import_statements {
            if !ignore_first {
                ignore_first = true;
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
        // and may need reading it from underlying subgraphs, so they are triggered and awaited
        // alltogther with care for read/write lock on the CAS
        ignore_first = false;
        if self.import_depth < 32 {
            let mut futures = vec![];
            for s in &import_statements {
                if !ignore_first {
                    ignore_first = true;
                    continue;
                }
                futures.push(self.process_import(s, should_search));
            }
            let mut parsed_imports = join_all(futures).await;

            // since the parsing of all imports are async, it is need to check for
            // duplicate imports after all imports have been done parsing and add their
            // found problems to the top problems list
            for imp in &mut parsed_imports {
                if !imp.hash.is_empty() && self.imports.iter().any(|i| i.hash == imp.hash) {
                    self.problems
                        .push(ErrorCode::DuplicateImport.to_problem(vec![], imp.hash_position));
                }
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

        // processing imports' namespace and building a ready to merge namespace from each
        // this requires checking each import's namespace for possible issues (duplicate keys, duplicate word sets, etc)
        // as well as applying renames, rebindings and elidings
        let mut imported_namespaces = VecDeque::new();
        for (i, imp) in self.imports.iter().enumerate() {
            if imp.problems.is_empty() {
                if let Some(item) = namespace.get(&imp.name) {
                    if item.is_node() {
                        self.problems.push(
                            ErrorCode::OccupiedNamespace.to_problem(vec![], imp.hash_position),
                        );
                    }
                } else if Self::is_deep_import(imp) {
                    self.problems
                        .push(ErrorCode::DeepImport.to_problem(vec![], imp.hash_position));
                } else {
                    let mut has_dup_words = false;
                    let mut has_dup_keys = false;
                    let mut has_dispair = None;
                    let mut new_imp_namespace: Namespace = HashMap::new();
                    if let Some(seq) = &imp.sequence {
                        if let Some(dispair) = &seq.dispair {
                            new_imp_namespace.insert(
                                "Dispair".to_owned(),
                                NamespaceItem::Node(NamespaceNode {
                                    hash: imp.hash.clone(),
                                    import_index: i as isize,
                                    element: NamespaceNodeElement::Dispair(dispair.clone()),
                                }),
                            );
                            has_dispair = Some(dispair);
                        }
                        if let Some(dmeta) = &seq.dotrain {
                            if let Some(dispair) = has_dispair {
                                if dmeta.namespace.contains_key("Dispair") {
                                    has_dup_words = true;
                                } else if let Some(am) = &dispair.authoring_meta {
                                    if am.0.iter().any(|w| dmeta.namespace.contains_key(&w.word)) {
                                        has_dup_keys = true;
                                    }
                                }
                            } else {
                                new_imp_namespace.extend(Self::copy_namespace(
                                    &dmeta.namespace,
                                    i as isize,
                                    &imp.hash,
                                ));
                            }
                        }
                        if has_dup_keys {
                            self.problems.push(
                                ErrorCode::CollidingNamespaceNodes
                                    .to_problem(vec![], imp.hash_position),
                            );
                        } else if has_dup_words {
                            self.problems.push(
                                ErrorCode::MultipleWordSets.to_problem(vec![], imp.hash_position),
                            );
                        } else if let Some(configs) = &imp.configuration {
                            for conf in &configs.pairs {
                                if let Some(new_conf) = &conf.1 {
                                    if new_conf.0 == "!" {
                                        if conf.0 .0 == "." {
                                            if new_imp_namespace.remove("Dispair").is_none() {
                                                self.problems.push(
                                                    ErrorCode::UndefinedWordSet.to_problem(
                                                        vec![],
                                                        [conf.0 .1[0], new_conf.1[1]],
                                                    ),
                                                );
                                            };
                                        } else if new_imp_namespace.remove(&conf.0 .0).is_none() {
                                            self.problems.push(
                                                ErrorCode::UndefinedIdentifier
                                                    .to_problem(vec![&conf.0 .0], conf.0 .1),
                                            );
                                        }
                                    } else {
                                        let key = {
                                            if conf.0 .0.starts_with('\'') {
                                                conf.0 .0.split_at(1).1
                                            } else {
                                                conf.0 .0.as_str()
                                            }
                                        };
                                        if new_imp_namespace.contains_key(key) {
                                            if conf.0 .0.starts_with('\'') {
                                                if new_imp_namespace.contains_key(&new_conf.0) {
                                                    self.problems.push(
                                                        ErrorCode::UnexpectedRename.to_problem(
                                                            vec![&new_conf.0],
                                                            new_conf.1,
                                                        ),
                                                    );
                                                } else {
                                                    let ns_item =
                                                        new_imp_namespace.remove(key).unwrap();
                                                    new_imp_namespace
                                                        .insert(new_conf.0.clone(), ns_item);
                                                }
                                            } else {
                                                let ns_item =
                                                    new_imp_namespace.get_mut(key).unwrap();
                                                if ns_item.is_binding() {
                                                    if let NamespaceItem::Node(n) = ns_item {
                                                        if let NamespaceNodeElement::Binding(b) =
                                                            &mut n.element
                                                        {
                                                            b.item = BindingItem::Constant(
                                                                ConstantBindingItem {
                                                                    value: new_conf.0.clone(),
                                                                },
                                                            )
                                                        }
                                                    }
                                                } else {
                                                    self.problems.push(
                                                        ErrorCode::UnexpectedRebinding.to_problem(
                                                            vec![],
                                                            [conf.0 .1[0], new_conf.1[1]],
                                                        ),
                                                    );
                                                }
                                            }
                                        } else {
                                            self.problems.push(
                                                ErrorCode::UndefinedIdentifier
                                                    .to_problem(vec![key], conf.0 .1),
                                            );
                                        }
                                    }
                                }
                            }
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

        // merge all the built and ready imported items namespaces into the main namespace
        while let Some((name, hash_position, _ns)) = imported_namespaces.pop_front() {
            self.merge_namespace(name, hash_position, _ns, &mut namespace);
        }

        // parsing bindings
        let parsed_bindings = exclusive_parse(&document, &BINDING_PATTERN, 0, true);
        ignore_first = false;
        for parsed_binding in parsed_bindings {
            if !ignore_first {
                ignore_first = true;
                continue;
            }
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

            if !invalid_id && !dup_id {
                let item;
                if let Some(mut msg) = Self::is_elided(raw_content) {
                    if msg.is_empty() {
                        msg = DEFAULT_ELISION.to_owned();
                    }
                    item = BindingItem::Elided(ElidedBindingItem { msg });
                } else if let Some((value, is_out_of_range)) = Self::is_constant(raw_content) {
                    if HEX_PATTERN.is_match(&value) && value.len() % 2 == 1 {
                        self.problems
                            .push(ErrorCode::OddLenHex.to_problem(vec![], content_position));
                    }
                    item = BindingItem::Constant(ConstantBindingItem { value });
                    if is_out_of_range {
                        self.problems
                            .push(ErrorCode::OutOfRangeValue.to_problem(vec![], content_position));
                    }
                } else {
                    // occupy the key with empty rainlang ast, later on will
                    // be replaced with parsed ast once global words are resolved
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
                    NamespaceItem::Node(NamespaceNode {
                        hash: String::new(),
                        import_index: -1,
                        element: NamespaceNodeElement::Binding(binding),
                    }),
                );
            }
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
        self.process_dependencies();

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
            // assign global words for this instance
            self.resolve_global_deployer();

            for binding in &mut self.bindings {
                // parse the rainlang binding to ast and repopulate the
                // binding.item and corresponding namespace with it
                if matches!(binding.item, BindingItem::Exp(_)) {
                    let rainlang_doc = RainlangDocument::create(
                        binding.content.clone(),
                        &self.namespace,
                        self.authoring_meta.as_ref(),
                        self.ignore_undefined_words,
                    );
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
                    binding.item = BindingItem::Exp(rainlang_doc);
                    self.namespace.insert(
                        binding.name.clone(),
                        NamespaceItem::Node(NamespaceNode {
                            hash: String::new(),
                            import_index: -1,
                            element: NamespaceNodeElement::Binding(binding.clone()),
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

    /// checks if a namespace can safely be merged into another namespace
    fn check_namespace(new: &Namespace, main: &Namespace) -> Option<ErrorCode> {
        if main.is_empty() {
            None
        } else {
            if let Some(main_ns_dispair) = main.get("Dispair") {
                if let Some(new_ns_dispair) = new.get("Dispair") {
                    if !main_ns_dispair
                        .unwrap_node()
                        .hash
                        .eq_ignore_ascii_case(&new_ns_dispair.unwrap_node().hash)
                    {
                        return Some(ErrorCode::MultipleWordSets);
                    }
                }
            }
            for (new_ns_key, new_ns_item) in new {
                for (main_ns_key, main_ns_item) in main {
                    if new_ns_key == main_ns_key {
                        let new_is_node = new_ns_item.is_node();
                        let main_is_node = main_ns_item.is_node();
                        if !new_is_node && !main_is_node {
                            let res = Self::check_namespace(
                                new_ns_item.unwrap_namespace(),
                                main_ns_item.unwrap_namespace(),
                            );
                            if res.is_some() {
                                return res;
                            };
                        } else if new_is_node && main_is_node {
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
                    NamespaceItem::Node(_) => self
                        .problems
                        .push(ErrorCode::OccupiedNamespace.to_problem(vec![], hash_position)),
                    NamespaceItem::Namespace(deep_namespace) => {
                        if let Some(code) = Self::check_namespace(&new, deep_namespace) {
                            self.problems.push(code.to_problem(vec![], hash_position));
                        } else {
                            Self::merge(&new, deep_namespace)
                        }
                    }
                }
            } else {
                main.insert(name.clone(), NamespaceItem::Namespace(new));
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
                } else if !item.is_node() && !main.get(key).unwrap().is_node() {
                    Self::merge(new, main)
                }
            }
        }
    }

    /// processes the expressions dependencies and checks for any possible circular dependecy
    fn process_dependencies(&mut self) {
        let mut topo_sort: TopoSort<&str> = TopoSort::new();
        let deps_map: Vec<&mut Binding> = self
            .bindings
            .iter_mut()
            .filter_map(|binding| match binding.item {
                BindingItem::Exp(_) => {
                    for dep in DEP_PATTERN.find_iter(&binding.content) {
                        let dep_as_string = dep.as_str().strip_prefix('\'').unwrap().to_owned();
                        binding.dependencies.push(dep_as_string);
                    }
                    Some(binding)
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

    /// checks and counts the word sets (deployer) in a namespace recursively by their hashes
    #[allow(clippy::for_kv_map)]
    fn check_namespace_deployer<'a>(
        namespace: &'a Namespace,
        mut hash: &'a str,
    ) -> (usize, &'a str, Option<&'a NamespaceNode>) {
        let mut count = 0usize;
        let mut node = None;
        if let Some(dis_item) = namespace.get("Dispair") {
            let dispair_node = dis_item.unwrap_node();
            if hash.is_empty() {
                count += 1;
                hash = &dispair_node.hash;
                node = Some(dispair_node);
            } else if !dispair_node.hash.eq_ignore_ascii_case(hash) {
                return (count + 1, hash, None);
            }
        }
        for (_key, item) in namespace {
            if !item.is_node() {
                let result = Self::check_namespace_deployer(item.unwrap_namespace(), hash);
                hash = result.1;
                count += result.0;
                if count > 1 {
                    node = None;
                    break;
                }
                if result.2.is_some() && node.is_none() {
                    node = result.2;
                }
            }
        }
        (count, hash, node)
    }

    /// assigns working word set (deployer) for this RainDocument instance if
    /// only one is found in this instance's namespace
    fn resolve_global_deployer(&mut self) {
        let (words_set_count, _hash, node) = Self::check_namespace_deployer(&self.namespace, "");
        if words_set_count > 1 {
            self.problems.push(
                ErrorCode::SingletonWords.to_problem(vec![&words_set_count.to_string()], [0, 0]),
            );
        } else if words_set_count == 0 {
            self.problems
                .push(ErrorCode::UndefinedGlobalWords.to_problem(vec![], [0, 0]));
        } else if let Some(namespace_node) = node {
            if namespace_node.is_dispair() {
                let dispair = namespace_node.unwrap_dispair();
                self.deployer = dispair.clone().into();
                self.authoring_meta = self.deployer.authoring_meta.clone();
            } else {
                self.problems
                    .push(ErrorCode::UndefinedGlobalWords.to_problem(vec![], [0, 0]));
            }
        } else {
            self.problems
                .push(ErrorCode::UndefinedGlobalWords.to_problem(vec![], [0, 0]));
        }
    }
}

impl PartialEq for RainDocument {
    fn eq(&self, other: &Self) -> bool {
        self.version == other.version
            && self.import_depth == other.import_depth
            && self.uri == other.uri
            && self.text == other.text
            && self.comments == other.comments
            && self.bindings == other.bindings
            && self.namespace == other.namespace
            && self.imports == other.imports
            && self.authoring_meta == other.authoring_meta
            && self.deployer == other.deployer
            && self.ignore_words == other.ignore_words
            && self.ignore_undefined_words == other.ignore_undefined_words
            && self.problems == other.problems
            && self.error == other.error
    }
}
