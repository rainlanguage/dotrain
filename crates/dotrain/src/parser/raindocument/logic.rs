use async_recursion::async_recursion;
use std::collections::{HashMap, VecDeque};
use futures::future::join_all;
use rain_metadata::{types::dotrain::v1::DotrainMeta, KnownMagic, RainMetaDocumentV1Item, search};
use super::*;
use super::super::{
    super::error::{Error, ErrorCode},
    deep_read_quote, exclusive_parse, fill_in, inclusive_parse, is_consumable, line_number,
    rainlangdocument::RainlangDocument,
    to_u256, tracked_trim,
};

impl RainDocument {
    /// the main method that takes out and processes each section of a RainDocument
    /// text (comments, imports, etc) one after the other, builds the parse tree, builds
    /// the namespace and checks for dependency issues and resolves the global words
    #[cfg_attr(target_family = "wasm", async_recursion(?Send))]
    #[cfg_attr(not(target_family = "wasm"), async_recursion)]
    pub(super) async fn _parse(
        &mut self,
        remote_search: bool,
        opts_rebinds: Option<Vec<Rebind>>,
    ) -> Result<(), Error> {
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

        // split front matter and rest of the text
        if let Some(splitter) = document.find(FRONTMATTER_SEPARATOR) {
            self.front_matter_offset = splitter;
            let body_start_offset = splitter + FRONTMATTER_SEPARATOR.len();
            fill_in(&mut document, [0, body_start_offset])?;
        } else {
            self.problems
                .push(ErrorCode::NoFrontMatterSplitter.to_problem(vec![], [0, 0]));
        };

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
        ignore_first = true;
        for parsed_binding in &parsed_bindings {
            if ignore_first {
                ignore_first = false;
                continue;
            }
            self.process_binding(parsed_binding, &mut namespace);
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

        // apply overrides
        if let Some(rebinds) = opts_rebinds {
            Self::apply_overrides(rebinds, &mut namespace)?;
        }

        // assign the built namespace to this instance's main namespace
        self.namespace = namespace;

        // validate quote bindings
        self.validate_quote_bindings();

        // find any remaining strings and include them as errors
        exclusive_parse(&document, &WS_PATTERN, 0, false)
            .iter()
            .for_each(|v| {
                self.problems
                    .push(ErrorCode::UnexpectedToken.to_problem(vec![], v.1))
            });

        // try to parse rainlang bindings if only there is at least one and current instance is
        // not an import itself, only owned rainlang bindings will be parsed at this point.
        // reason for not parsing imported/deeper rainlang bindings is because their ast provides
        // no needed info at this point, they will get parsed once the dotrain is being composed with
        // specified entrypoints and they will be parsed only if they are part of the entrypoints or
        // their deps, see 'compile.rs'.
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
    pub(super) fn is_deep_import(import: &Import) -> bool {
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
    pub(super) fn is_elided(text: &str) -> Option<String> {
        let msg = text.trim();
        msg.strip_prefix('!')
            .map(|stripped| stripped.trim().to_owned())
    }

    /// Checks if a text contains a single numeric value and returns it ie is constant binding
    pub(super) fn is_literal(text: &str) -> Option<(String, usize, bool)> {
        if text.starts_with('"') {
            let has_no_end = !STRING_LITERAL_PATTERN.is_match(text);
            Some((text.to_owned(), 0, has_no_end))
        } else if text.starts_with('[') {
            let has_no_end = !SUB_PARSER_LITERAL_PATTERN.is_match(text);
            Some((text.to_owned(), 1, has_no_end))
        } else {
            let items = exclusive_parse(text, &WS_PATTERN, 0, false);
            if items.len() == 1 && NUMERIC_PATTERN.is_match(&items[0].0) {
                let is_out_of_range = to_u256(&items[0].0).is_err();
                Some((items[0].0.clone(), 2, is_out_of_range))
            } else {
                None
            }
        }
    }

    pub(super) fn is_quote(text: &str, offset: usize) -> Option<(String, Vec<ParsedItem>)> {
        let items = exclusive_parse(text, &WS_PATTERN, offset, false);
        let first = items.first()?;
        if QUOTE_PATTERN.is_match(&first.0) {
            Some((first.0[1..].to_owned(), items[1..].to_vec()))
        } else {
            None
        }
    }

    // processes configurations of an import statement
    pub(super) fn process_import_config(
        config_pieces: &mut std::slice::IterMut<'_, ParsedItem>,
        original_text: &str,
    ) -> ImportConfiguration {
        let mut imp_conf = ImportConfiguration {
            groups: vec![],
            problems: vec![],
        };
        while let Some(first_piece) = config_pieces.next() {
            if let Some(mut complementary_piece) = config_pieces.next() {
                let mut temp: ParsedItem;
                // to build the complementary piece if it is a string literal with whitespaces
                if complementary_piece.0.starts_with('"')
                    && (complementary_piece.0 == "\"" || !complementary_piece.0.ends_with('"'))
                {
                    let start = complementary_piece.1[0];
                    let mut end = 0;
                    let mut has_no_end = true;
                    #[allow(clippy::while_let_on_iterator)]
                    while let Some(end_item) = config_pieces.next() {
                        end = end_item.1[1];
                        if end_item.0.ends_with('"') {
                            has_no_end = false;
                            break;
                        }
                    }
                    temp = ParsedItem(original_text[start..end].to_owned(), [start, end]);
                    complementary_piece = &mut temp;
                    if has_no_end {
                        imp_conf.problems.push(
                            ErrorCode::UnexpectedStringLiteralEnd.to_problem(vec![], [start, end]),
                        );
                    }
                }
                // to build the complementary piece if it is a sub parser literal with whitespaces
                if complementary_piece.0.starts_with('[')
                    && (complementary_piece.0 == "]" || !complementary_piece.0.ends_with(']'))
                {
                    let start = complementary_piece.1[0];
                    let mut end = 0;
                    let mut has_no_end = true;
                    #[allow(clippy::while_let_on_iterator)]
                    while let Some(end_item) = config_pieces.next() {
                        end = end_item.1[1];
                        if end_item.0.ends_with(']') {
                            has_no_end = false;
                            break;
                        }
                    }
                    temp = ParsedItem(original_text[start..end].to_owned(), [start, end]);
                    complementary_piece = &mut temp;
                    if has_no_end {
                        imp_conf.problems.push(
                            ErrorCode::UnexpectedSubParserEnd.to_problem(vec![], [start, end]),
                        );
                    }
                }
                if WORD_PATTERN.is_match(&first_piece.0) {
                    if LITERAL_PATTERN.is_match(&complementary_piece.0)
                        || complementary_piece.0 == "!"
                        || QUOTE_PATTERN.is_match(&complementary_piece.0)
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
    #[cfg_attr(target_family = "wasm", async_recursion(?Send))]
    #[cfg_attr(not(target_family = "wasm"), async_recursion)]
    pub(super) async fn process_import(
        &self,
        statement: &ParsedItem,
        remote_search: bool,
    ) -> Import {
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
                    &self.text,
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
    pub(super) async fn fetch_import_contents(
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
    pub(super) async fn process_meta_import(
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
                                dotrain.parse(true, None).await;
                            } else {
                                dotrain.parse(false, None).await;
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
    pub(super) fn build_imports_namespaces(
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
    pub(super) fn apply_import_configs(
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
                                if new_conf.0.starts_with('\'') {
                                    leaf.element.item = BindingItem::Quote(QuoteBindingItem {
                                        quote: new_conf.0.clone(),
                                    })
                                } else {
                                    leaf.element.item = BindingItem::Literal(LiteralBindingItem {
                                        value: new_conf.0.clone(),
                                    })
                                }
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
    pub(super) fn process_binding<'a>(
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
            } else if let Some((value, typ, has_err)) = Self::is_literal(raw_content) {
                if typ == 0 {
                    if has_err {
                        self.problems.push(
                            ErrorCode::UnexpectedStringLiteralEnd
                                .to_problem(vec![], content_position),
                        );
                    }
                } else if typ == 1 {
                    if has_err {
                        self.problems.push(
                            ErrorCode::UnexpectedSubParserEnd.to_problem(vec![], content_position),
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
            } else if let Some((quote, rest)) = Self::is_quote(raw_content, content_position[0]) {
                for unexpected_token in rest {
                    self.problems
                        .push(ErrorCode::UnexpectedToken.to_problem(vec![], unexpected_token.1));
                }
                item = BindingItem::Quote(QuoteBindingItem { quote });
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
    pub(super) fn copy_namespace(namespace: &Namespace, index: isize, hash: &str) -> Namespace {
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
    pub(super) fn check_namespace(new: &Namespace, main: &Namespace) -> Option<ErrorCode> {
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
    pub(super) fn merge_namespace(
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
    pub(super) fn merge(new: &Namespace, main: &mut Namespace) {
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

    /// apply the overrides to the namespace
    pub(super) fn apply_overrides(
        rebinds: Vec<Rebind>,
        namespace: &mut Namespace,
    ) -> Result<(), Error> {
        // restrict quotes to only 1 levels
        let mut limit = 1;

        for Rebind(key, raw_value) in rebinds {
            let value = raw_value.trim();
            if NAMESPACE_PATTERN.is_match(&key) {
                let item;
                if let Some((literal_value, _, has_err)) = Self::is_literal(value) {
                    if has_err {
                        return Err(Error::InvalidOverride(format!(
                            "invalid rebind value: {}",
                            value
                        )));
                    }
                    item = BindingItem::Literal(LiteralBindingItem {
                        value: literal_value,
                    });
                } else if let Some((quote, rest)) = Self::is_quote(value, 0) {
                    if !rest.is_empty() {
                        return Err(Error::InvalidOverride(format!(
                            "invalid rebind value: {}",
                            value
                        )));
                    }
                    item = BindingItem::Quote(QuoteBindingItem { quote });
                } else {
                    return Err(Error::InvalidOverride(format!(
                        "invalid rebind value: {}",
                        value
                    )));
                }

                let mut segments =
                    VecDeque::from(exclusive_parse(&key, &NAMESPACE_SEGMENT_PATTERN, 0, true));
                if key.starts_with('.') {
                    segments.pop_front();
                }
                if segments.len() > 32 {
                    return Err(Error::InvalidOverride(format!(
                        "invalid key, namespace too deep: {}",
                        key
                    )));
                }
                if let Some(last) = segments.back() {
                    if last.0.is_empty() {
                        return Err(Error::InvalidOverride(format!(
                            "invalid key, expected to end with a node: {}",
                            key
                        )));
                    }
                }
                // restrict rebinds to only 1 levels
                if segments.len() > 1 {
                    return Err(Error::InvalidOverride(format!("rebind too deep: {}", key)));
                }

                if segments.len() == 1 {
                    let mut problems = vec![];
                    if let Some(ns_item) = namespace.get(&segments[0].0) {
                        match ns_item {
                            NamespaceItem::Node(_node) => {
                                return Err(Error::InvalidOverride(format!(
                                    "undefined identifier: {} in key: {}",
                                    segments[0].0, key
                                )));
                            }
                            NamespaceItem::Leaf(leaf) => {
                                if let BindingItem::Quote(q) = &item {
                                    problems = Self::validate_quote(
                                        namespace,
                                        q,
                                        key.as_str(),
                                        leaf.element.name_position,
                                        &mut limit,
                                    );
                                };
                                if let BindingItem::Exp(_e) = &leaf.element.item {
                                    let typ = if matches!(item, BindingItem::Literal(_)) {
                                        "literals"
                                    } else {
                                        "quotes"
                                    };
                                    return Err(Error::InvalidOverride(format!(
                                            "invalid rebinding: {}, cannot rebind rainlang expression bindings to {}",
                                            typ,
                                            key
                                        ))
                                    );
                                }
                            }
                        }
                    };
                    if let Some(NamespaceItem::Leaf(leaf)) = namespace.get_mut(&segments[0].0) {
                        leaf.element.item = item;
                        leaf.element.problems = problems;
                    } else {
                        namespace.insert(
                            key,
                            NamespaceItem::Leaf(NamespaceLeaf {
                                hash: String::new(),
                                import_index: -1,
                                element: Binding {
                                    name: segments[0].0.to_owned(),
                                    name_position: [0, 0],
                                    content: value.to_owned(),
                                    content_position: [0, 0],
                                    position: [0, 0],
                                    problems,
                                    item,
                                },
                            }),
                        );
                    }
                } else if let Some(ns_item) = namespace.get_mut(&segments[0].0) {
                    segments.push_back(ParsedItem(String::new(), [0, 0]));
                    let mut result = ns_item;
                    let mut parent_node: Option<&Namespace> = None;
                    #[allow(unused_assignments)]
                    for (i, segment) in segments.range(1..).enumerate() {
                        match result {
                            NamespaceItem::Node(node) => {
                                if i == segments.len() - 3 && !node.contains_key(&segment.0) {
                                    let problems = if let BindingItem::Quote(q) = &item {
                                        Self::validate_quote(
                                            node,
                                            q,
                                            key.as_str(),
                                            [0, 0],
                                            &mut limit,
                                        )
                                    } else {
                                        vec![]
                                    };
                                    node.insert(
                                        segment.0.to_owned(),
                                        NamespaceItem::Leaf(NamespaceLeaf {
                                            hash: String::new(),
                                            import_index: -1,
                                            element: Binding {
                                                name: segment.0.to_owned(),
                                                name_position: [0, 0],
                                                content: value.to_owned(),
                                                content_position: [0, 0],
                                                position: [0, 0],
                                                problems,
                                                item,
                                            },
                                        }),
                                    );
                                    parent_node = Some(node);
                                    break;
                                } else if i == segments.len() - 2 {
                                    return Err(Error::InvalidOverride(format!(
                                        "undefined identifier: {} in key: {}",
                                        segment.0, key
                                    )));
                                } else if let Some(item) = node.get_mut(&segment.0) {
                                    result = item;
                                } else {
                                    return Err(Error::InvalidOverride(format!(
                                        "undefined identifier: {} in key: {}",
                                        segment.0, key
                                    )));
                                }
                            }
                            NamespaceItem::Leaf(leaf) => {
                                if i == segments.len() - 2 {
                                    let problems = if let BindingItem::Quote(q) = &item {
                                        Self::validate_quote(
                                            parent_node.unwrap(),
                                            q,
                                            key.as_str(),
                                            leaf.element.name_position,
                                            &mut limit,
                                        )
                                    } else {
                                        vec![]
                                    };
                                    match &leaf.element.item {
                                        BindingItem::Exp(_e) => {
                                            let typ = if matches!(item, BindingItem::Literal(_)) {
                                                "literals"
                                            } else {
                                                "quotes"
                                            };
                                            return Err(Error::InvalidOverride(format!(
                                                "invalid rebinding: {}, cannot rebind rainlang expression bindings to {}",
                                                typ,
                                                key
                                            )));
                                        }
                                        _ => {
                                            if matches!(item, BindingItem::Quote(_)) {
                                                leaf.element.problems = problems;
                                            }
                                            leaf.element.item = item;
                                        }
                                    };
                                    break;
                                } else {
                                    return Err(Error::InvalidOverride(format!(
                                        "undefined identifier: {} in key: {}",
                                        segment.0, key
                                    )));
                                }
                            }
                        }
                    }
                } else {
                    return Err(Error::InvalidOverride(format!(
                        "undefined namespace: {} in key: {}",
                        segments[0].0, key
                    )));
                }
            } else {
                return Err(Error::InvalidOverride(format!(
                    "invalid rebind key: {}",
                    key
                )));
            }
        }
        Ok(())
    }

    pub(super) fn validate_quote_bindings(&mut self) {
        let mut errs = vec![];
        for (key, value) in &self.namespace {
            if let NamespaceItem::Leaf(leaf) = &value {
                if leaf.import_index == -1 {
                    if let BindingItem::Quote(quote) = &leaf.element.item {
                        let mut limit = 1;
                        let mut result = Self::validate_quote(
                            &self.namespace,
                            quote,
                            key,
                            leaf.element.name_position,
                            &mut limit,
                        );
                        if !result.is_empty() {
                            errs.push((key.to_owned(), result.pop().unwrap()));
                        }
                    }
                }
            }
        }
        for (key, err) in errs {
            if let NamespaceItem::Leaf(leaf) = self.namespace.get_mut(&key).unwrap() {
                leaf.element.problems = vec![err.clone()];
            }
        }
    }

    fn validate_quote(
        namespace: &Namespace,
        q: &QuoteBindingItem,
        key: &str,
        position: Offsets,
        limit: &mut isize,
    ) -> Vec<Problem> {
        if key == q.quote {
            vec![ErrorCode::CircularDependency.to_problem(vec![], position)]
        } else if let Err(p) = deep_read_quote(
            &q.quote,
            namespace,
            &mut vec![key, q.quote.as_str()],
            limit,
            position,
            key,
        ) {
            vec![p]
        } else {
            vec![]
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
