// #![allow(non_snake_case)]

use lsp_types::Url;
use std::sync::{Arc, RwLock};
use serde::{Serialize, Deserialize};
use async_recursion::async_recursion;
use topo_sort::{SortResults, TopoSort};
use std::collections::{HashMap, VecDeque};
use futures::{executor::block_on, future::join_all};
use rain_meta::{
    Store, NPE2Deployer, KnownMagic, RainMetaDocumentV1Item, search_deployer, search,
    types::{
        dotrain::v1::DotrainMeta, authoring::v1::AuthoringMeta,
        interpreter_caller::v1::InterpreterCallerMeta,
    },
};
use super::{
    rainlang::RainlangDocument,
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

/// Reserved constant values keys in RainDocuments
pub const RAIN_DOCUMENT_CONSTANTS: [(&str, &str); 9] = [
    (
        "infinity",
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    ),
    (
        "max-uint-256",
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    ),
    (
        "max-uint256",
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    ),
    ("max-uint-128", "0xffffffffffffffffffffffffffffffff"),
    ("max-uint128", "0xffffffffffffffffffffffffffffffff"),
    ("max-uint-64", "0xffffffffffffffff"),
    ("max-uint64", "0xffffffffffffffff"),
    ("max-uint-32", "0xffffffff"),
    ("max-uint32", "0xffffffff"),
];

#[derive(Debug)]
pub enum RainDocumentParseError {}

impl std::fmt::Display for RainDocumentParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("corrupt meta")
        // match self {
        //     Error::CorruptMeta => f.write_str("corrupt meta"),
        //     Error::UnknownMeta => f.write_str("unknown meta"),
        //     Error::UnknownMagic => f.write_str("unknown magic"),
        //     Error::UnsupportedMeta => f.write_str("unsupported meta"),
        //     Error::InvalidHash => f.write_str("invalid keccak256 hash"),
        //     Error::NoRecordFound => f.write_str("found no matching record"),
        //     Error::UnsupportedNetwork => {
        //         f.write_str("no rain subgraph is deployed for this network")
        //     }
        //     Error::BiggerThan32Bytes => {
        //         f.write_str("unexpected input size, must be 32 bytes or less")
        //     }
        //     Error::ReqwestError(v) => write!(f, "{}", v),
        //     Error::InflateError(v) => write!(f, "{}", v),
        //     Error::Utf8Error(v) => write!(f, "{}", v),
        //     Error::AbiCoderError(v) => write!(f, "{}", v),
        //     Error::SerdeCborError(v) => write!(f, "{}", v),
        //     Error::SerdeJsonError(v) => write!(f, "{}", v),
        //     Error::FromUtf8Error(v) => write!(f, "{}", v),
        //     Error::DecodeHexStringError(v) => write!(f, "{}", v),
        //     Error::ValidationErrors(v) => write!(f, "{}", v),
        // }
    }
}

impl std::error::Error for RainDocumentParseError {}

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

let entrypoints = vec![
   "entrypoint1".to_string(), 
   "entrypoint2".to_string()
];
let revm = None;

// compile this instance to get ExpressionConfig
let result = rain_document.compile(&entrypoints, revm);
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
        rd.parse_async().await;
        rd
    }

    /// Creates an instance and parses with remote meta search disabled (cached metas only)
    pub fn create(text: String, uri: Url, meta_store: Option<Arc<RwLock<Store>>>) -> RainDocument {
        let mut rd = RainDocument::_new(text, uri, 0, meta_store, 0);
        rd.parse();
        rd
    }

    /// Updates the text and parses right away with remote meta search disabled (cached metas only)
    pub fn update_text(&mut self, new_text: String) {
        self.text = new_text;
        self.version += 1;
        self.parse();
    }

    /// Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only)
    pub fn update(&mut self, new_text: String, uri: Url, version: usize) {
        self.text = new_text;
        self.uri = uri;
        self.version = version;
        self.parse();
    }

    /// Updates the text and parses right away with remote meta search enabled
    pub async fn update_text_async(&mut self, new_text: String) {
        self.text = new_text;
        self.version += 1;
        self.parse_async().await;
    }

    /// Updates the text, uri, version and parses right away with remote meta search enabled
    pub async fn update_async(&mut self, new_text: String, uri: Url, version: usize) {
        self.text = new_text;
        self.uri = uri;
        self.version = version;
        self.parse_async().await;
    }

    /// This instance's current text
    pub fn text(&self) -> &String {
        &self.text
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
    pub async fn parse_async(&mut self) {
        if NON_EMPTY_PATTERN.is_match(&self.text) {
            match self._parse(true).await {
                Ok(()) => {}
                Err(e) => {
                    self.error = Some(e.to_string());
                    self.problems.push(Problem {
                        msg: e.to_string(),
                        position: [0, 0],
                        code: ErrorCode::RuntimeError,
                    })
                }
            }
        } else {
            self.error = None;
            self.imports.clear();
            self.problems.clear();
            self.comments.clear();
            self.bindings.clear();
            self.namespace.clear();
            self.authoring_meta = None;
            self.deployer = NPE2Deployer::default();
            self.ignore_words = false;
            self.ignore_undefined_words = false;
        }
    }

    /// Parses this instance's text with remote meta search disabled (cached metas only)
    pub fn parse(&mut self) {
        if NON_EMPTY_PATTERN.is_match(&self.text) {
            match block_on(self._parse(false)) {
                Ok(()) => {}
                Err(e) => {
                    self.error = Some(e.to_string());
                    self.problems.push(Problem {
                        msg: e.to_string(),
                        position: [0, 0],
                        code: ErrorCode::RuntimeError,
                    })
                }
            }
        } else {
            self.error = None;
            self.imports.clear();
            self.problems.clear();
            self.comments.clear();
            self.bindings.clear();
            self.namespace.clear();
            self.authoring_meta = None;
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
    fn is_constant(text: &str) -> Option<Result<String, String>> {
        let items = exclusive_parse(text, &WS_PATTERN, 0, false);
        if items.len() != 1 {
            None
        } else if NUMERIC_PATTERN.is_match(&items[0].0) {
            match to_u256(&items[0].0) {
                Ok(v) => Some(Ok(v.to_string())),
                Err(_e) => Some(Err("value out of range".to_owned())),
            }
        } else {
            None
        }
    }

    /// copies a namespaces with given import index and hash
    fn copy_namespace(namespace: &Namespace, index: isize, hash: &str) -> Namespace {
        let mut ns: Namespace = HashMap::new();
        for (key, item) in namespace {
            match item {
                NamespaceItem::Node(node) => {
                    ns.insert(
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
                NamespaceItem::Namespace(n) => {
                    ns.insert(
                        key.to_owned(),
                        NamespaceItem::Namespace(Self::copy_namespace(n, index, hash)),
                    );
                }
            }
        }
        ns
    }

    /// processes an import statement
    #[async_recursion(?Send)]
    #[allow(clippy::await_holding_lock)]
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
                if HASH_PATTERN.is_match(&name_or_hash.0) {
                    result.hash = name_or_hash.0.to_ascii_lowercase();
                    result.hash_position = name_or_hash.1;
                } else {
                    result.problems.push(Problem {
                        msg: "invalid hash, must be 32 bytes".to_owned(),
                        position: name_or_hash.1,
                        code: ErrorCode::ExpectedHash,
                    });
                }
            } else {
                result.name = name_or_hash.0.clone();
                result.name_position = name_or_hash.1;
                if !WORD_PATTERN.is_match(&name_or_hash.0) {
                    result.problems.push(Problem {
                        msg: "invalid word pattern".to_owned(),
                        position: name_or_hash.1,
                        code: ErrorCode::InvalidWordPattern,
                    })
                }
            }
            if result.name != "." {
                if let Some(hash) = pieces[1..].first() {
                    start_range = 2;
                    if HEX_PATTERN.is_match(&hash.0) {
                        if HASH_PATTERN.is_match(&hash.0) {
                            result.hash = hash.0.to_ascii_lowercase();
                            result.hash_position = hash.1;
                        } else {
                            result.problems.push(Problem {
                                msg: "invalid hash, must be 32 bytes".to_owned(),
                                position: hash.1,
                                code: ErrorCode::InvalidHash,
                            });
                        }
                    } else {
                        result.problems.push(Problem {
                            msg: "expected hash".to_owned(),
                            position: hash.1,
                            code: ErrorCode::ExpectedHash,
                        });
                    }
                } else {
                    result.problems.push(Problem {
                        msg: "expected import hash".to_owned(),
                        position: at_pos,
                        code: ErrorCode::ExpectedHash,
                    });
                }
            }
            if !pieces[start_range..].is_empty() {
                result.configuration = Some(ImportConfiguration {
                    problems: vec![],
                    pairs: vec![],
                });
            }
            let mut c = ImportConfiguration {
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
                            if c.pairs.iter().any(|v| {
                                if let Some(e) = &v.1 {
                                    v.0 .0 == piece.0 && e.0 == next.0
                                } else {
                                    false
                                }
                            }) {
                                c.problems.push(Problem {
                                    msg: "duplicate statement".to_owned(),
                                    position: [piece.1[0], next.1[1]],
                                    code: ErrorCode::DuplicateImportStatement,
                                });
                            }
                        } else {
                            c.problems.push(Problem {
                                msg: "unexpected token".to_owned(),
                                position: next.1,
                                code: ErrorCode::UnexpectedToken,
                            });
                        }
                        c.pairs.push((piece.clone(), Some(next.clone())));
                    } else {
                        c.problems.push(Problem {
                            msg: "expected elision syntax".to_owned(),
                            position: piece.1,
                            code: ErrorCode::ExpectedElisionOrRebinding,
                        });
                        c.pairs.push((piece.clone(), None));
                    }
                } else if WORD_PATTERN.is_match(&piece.0) {
                    if let Some(next) = remainings.next() {
                        if NUMERIC_PATTERN.is_match(&next.0) || next.0 == "!" {
                            if c.pairs.iter().any(|v| {
                                if let Some(e) = &v.1 {
                                    v.0 .0 == piece.0 && e.0 == next.0
                                } else {
                                    false
                                }
                            }) {
                                c.problems.push(Problem {
                                    msg: "duplicate statement".to_owned(),
                                    position: [piece.1[0], next.1[1]],
                                    code: ErrorCode::DuplicateImportStatement,
                                });
                            }
                        } else {
                            c.problems.push(Problem {
                                msg: "unexpected token".to_owned(),
                                position: next.1,
                                code: ErrorCode::UnexpectedToken,
                            });
                        }
                        c.pairs.push((piece.clone(), Some(next.clone())));
                    } else {
                        c.problems.push(Problem {
                            msg: "expected rebinding or elision".to_owned(),
                            position: piece.1,
                            code: ErrorCode::ExpectedElisionOrRebinding,
                        });
                        c.pairs.push((piece.clone(), None));
                    }
                } else if piece.0.starts_with('\'') {
                    if let Some(next) = remainings.next() {
                        if WORD_PATTERN.is_match(&piece.0[1..]) {
                            if WORD_PATTERN.is_match(&next.0) {
                                if c.pairs.iter().any(|v| {
                                    if let Some(e) = &v.1 {
                                        v.0 .0 == piece.0 && e.0 == next.0
                                    } else {
                                        false
                                    }
                                }) {
                                    c.problems.push(Problem {
                                        msg: "duplicate statement".to_owned(),
                                        position: [piece.1[0], next.1[1]],
                                        code: ErrorCode::DuplicateImportStatement,
                                    });
                                }
                            } else {
                                c.problems.push(Problem {
                                    msg: "invalid word pattern".to_owned(),
                                    position: next.1,
                                    code: ErrorCode::InvalidWordPattern,
                                });
                            }
                        } else {
                            c.problems.push(Problem {
                                msg: "invalid word pattern".to_owned(),
                                position: piece.1,
                                code: ErrorCode::InvalidWordPattern,
                            });
                        }
                        c.pairs.push((piece.clone(), Some(next.clone())));
                    } else {
                        c.problems.push(Problem {
                            msg: "expected to be renamed".to_owned(),
                            position: piece.1,
                            code: ErrorCode::ExpectedRename,
                        });
                        c.pairs.push((piece.clone(), None));
                    }
                } else {
                    c.problems.push(Problem {
                        msg: "unexpected token".to_owned(),
                        position: piece.1,
                        code: ErrorCode::UnexpectedToken,
                    });
                    c.pairs
                        .push((piece.clone(), { remainings.next().map(|n| n.clone()) }));
                }
            }
            if has_conf {
                result.configuration = Some(c);
            }
        } else {
            result.problems.push(Problem {
                msg: "expected a valid name or hash".to_owned(),
                position: at_pos,
                code: ErrorCode::InvalidImport,
            });
        }

        let mut npe2_deployer = None;
        let meta_seq = {
            let mut did_find = false;
            let seq = {
                if let Some(d) = self.meta_store.read().unwrap().get_deployer(&result.hash) {
                    npe2_deployer = Some(d.clone());
                    did_find = true;
                    None
                } else if let Some(r) = self.meta_store.read().unwrap().get_meta(&result.hash) {
                    did_find = true;
                    Some(RainMetaDocumentV1Item::cbor_decode(r))
                } else {
                    None
                }
            };
            if !did_find && should_search {
                let subgraphs = { self.meta_store.read().unwrap().subgraphs().clone() };
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
                        .update_with(&result.hash, &meta.bytes);
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
                ctxmeta: None,
                dotrain: None,
            });
            if deployer.is_corrupt() {
                result.sequence = None;
                result.problems.push(Problem {
                    msg: "corrupt meta".to_owned(),
                    position: result.hash_position,
                    code: ErrorCode::CorruptMeta,
                });
            } else {
                if deployer.authoring_meta.is_none() && !self.ignore_undefined_words {
                    result.problems.push(Problem {
                        msg: "deployer's authroing meta is undefined".to_owned(),
                        position: result.hash_position,
                        code: ErrorCode::UndefinedAuthoringMeta,
                    });
                };
                result.sequence.as_mut().unwrap().dispair = Some(deployer.into());
            }
        } else if let Some(seq) = meta_seq {
            if let Ok(v) = seq {
                if is_consumable(&v) {
                    result.sequence = Some(ImportSequence {
                        dispair: None,
                        ctxmeta: None,
                        dotrain: None,
                    });
                    for meta in v {
                        match meta.unpack() {
                            Ok(d) => match meta.magic {
                                KnownMagic::ExpressionDeployerV2BytecodeV1 => {
                                    result.sequence.as_mut().unwrap().dispair =
                                        if let Some(deployer) = self
                                            .meta_store
                                            .read()
                                            .unwrap()
                                            .get_deployer(&result.hash)
                                        {
                                            if deployer.is_corrupt() {
                                                result.sequence = None;
                                                result.problems.push(Problem {
                                                    msg: "corrupt meta".to_owned(),
                                                    position: result.hash_position,
                                                    code: ErrorCode::CorruptMeta,
                                                });
                                                break;
                                            } else {
                                                if deployer.authoring_meta.is_none()
                                                    && !self.ignore_undefined_words
                                                {
                                                    result.problems.push(Problem {
                                                        msg:
                                                            "deployer's authroing meta is undefined"
                                                                .to_owned(),
                                                        position: result.hash_position,
                                                        code: ErrorCode::UndefinedAuthoringMeta,
                                                    });
                                                };
                                                Some(deployer.clone().into())
                                            }
                                        } else if should_search {
                                            let subgraphs = {
                                                self.meta_store.read().unwrap().subgraphs().clone()
                                            };
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
                                                    result.problems.push(Problem {
                                                        msg: "corrupt meta".to_owned(),
                                                        position: result.hash_position,
                                                        code: ErrorCode::CorruptMeta,
                                                    });
                                                    break;
                                                } else {
                                                    if deployer.authoring_meta.is_none()
                                                        && !self.ignore_undefined_words
                                                    {
                                                        result.problems.push(Problem {
                                                        msg:
                                                            "deployer's authroing meta is undefined"
                                                                .to_owned(),
                                                        position: result.hash_position,
                                                        code: ErrorCode::UndefinedAuthoringMeta,
                                                    });
                                                    };
                                                    Some(deployer.into())
                                                }
                                            } else {
                                                result.problems.push(Problem {
                                                msg:
                                                    "cannot find deployer details of specified hash"
                                                        .to_owned(),
                                                position: result.hash_position,
                                                code: ErrorCode::UndefinedDeployer,
                                            });
                                                None
                                            }
                                        } else {
                                            result.problems.push(Problem {
                                                msg:
                                                    "cannot find deployer details of specified hash"
                                                        .to_owned(),
                                                position: result.hash_position,
                                                code: ErrorCode::UndefinedDeployer,
                                            });
                                            None
                                        };
                                }
                                KnownMagic::InterpreterCallerMetaV1 => {
                                    if let Ok(cmeta) = InterpreterCallerMeta::try_from(d.as_slice())
                                    {
                                        if let Ok(ctxmeta) = ContextAlias::from_caller_meta(cmeta) {
                                            result.sequence.as_mut().unwrap().ctxmeta =
                                                Some(ctxmeta);
                                        } else {
                                            result.sequence = None;
                                            result.problems.push(Problem {
                                                msg: "corrupt meta".to_owned(),
                                                position: result.hash_position,
                                                code: ErrorCode::CorruptMeta,
                                            });
                                            break;
                                        }
                                    } else {
                                        result.sequence = None;
                                        result.problems.push(Problem {
                                            msg: "corrupt meta".to_owned(),
                                            position: result.hash_position,
                                            code: ErrorCode::CorruptMeta,
                                        });
                                        break;
                                    }
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
                                            dotrain.parse_async().await;
                                        } else {
                                            dotrain.parse();
                                        }
                                        if !dotrain.problems.is_empty() {
                                            result.problems.push(Problem {
                                                    msg: "imported rain document contains top level errors".to_owned(),
                                                    position: result.hash_position,
                                                    code: ErrorCode::InvalidRainDocument
                                                });
                                        }
                                        result.sequence.as_mut().unwrap().dotrain = Some(dotrain);
                                    } else {
                                        result.sequence = None;
                                        result.problems.push(Problem {
                                            msg: "corrupt meta".to_owned(),
                                            position: result.hash_position,
                                            code: ErrorCode::CorruptMeta,
                                        });
                                        break;
                                    }
                                }
                                _ => {}
                            },
                            Err(_e) => {
                                result.sequence = None;
                                result.problems.push(Problem {
                                    msg: "corrupt meta".to_owned(),
                                    position: result.hash_position,
                                    code: ErrorCode::CorruptMeta,
                                });
                                break;
                            }
                        }
                    }
                } else {
                    result.problems.push(Problem {
                        msg: "inconsumable import".to_owned(),
                        position: result.hash_position,
                        code: ErrorCode::InconsumableMeta,
                    });
                }
            } else {
                result.problems.push(Problem {
                    msg: "corrupt meta".to_owned(),
                    position: result.hash_position,
                    code: ErrorCode::CorruptMeta,
                });
            }
        } else {
            result.problems.push(Problem {
                msg: format!("cannot find any settlement for hash: {}", result.hash),
                position: result.hash_position,
                code: ErrorCode::UndefinedMeta,
            });
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
        self.ignore_undefined_words = false;
        self.deployer = NPE2Deployer::default();
        let mut document = self.text.clone();
        let mut namespace: Namespace = HashMap::new();

        // check for illegal characters
        let illegal_chars = inclusive_parse(&document, &ILLEGAL_CHAR, 0);
        if !illegal_chars.is_empty() {
            self.problems.push(Problem {
                msg: format!("illegal character: {}", illegal_chars[0].0),
                position: [illegal_chars[0].1[0], illegal_chars[0].1[0]],
                code: ErrorCode::IllegalChar,
            });
            return Ok(());
        }

        // parse comments
        for v in inclusive_parse(&document, &COMMENT_PATTERN, 0).iter() {
            if !v.0.ends_with("*/") {
                self.problems.push(Problem {
                    msg: "unexpected end of comment".to_owned(),
                    position: v.1,
                    code: ErrorCode::UnexpectedEndOfComment,
                });
            }
            self.comments.push(Comment {
                comment: v.0.clone(),
                position: v.1,
            });
            fill_in(&mut document, v.1)?;
        }

        // search for the actionable comments
        if self
            .comments
            .iter()
            .any(|v| lint_patterns::IGNORE_WORDS.is_match(&v.comment))
        {
            self.ignore_words = true;
        }
        if self
            .comments
            .iter()
            .any(|v| lint_patterns::IGNORE_UNDEFINED_WORDS.is_match(&v.comment))
        {
            self.ignore_undefined_words = true;
        }
        if self.ignore_words {
            self.ignore_undefined_words = true;
        }

        let mut ignore_first = false;
        let mut import_statements = exclusive_parse(&document, &IMPORTS_PATTERN, 0, true);

        for v in &mut import_statements {
            if !ignore_first {
                ignore_first = true;
                continue;
            }
            if let Some(index) = v.0.find('#') {
                let slices = v.0.split_at(index);
                v.0 = slices.0.to_owned();
                v.1[1] = v.1[0] + index;
            };
            fill_in(&mut document, [v.1[0] - 1, v.1[1]])?;
        }

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

            let mut imports = join_all(futures).await;
            for imp in &mut imports {
                if !imp.hash.is_empty() && self.imports.iter().any(|i| i.hash == imp.hash) {
                    imp.problems.push(Problem {
                        msg: "duplicate import".to_owned(),
                        position: imp.hash_position,
                        code: ErrorCode::DuplicateImport,
                    });
                    self.problems.push(Problem {
                        msg: "duplicate import".to_owned(),
                        position: imp.hash_position,
                        code: ErrorCode::DuplicateImport,
                    });
                }
                self.problems.extend(imp.problems.clone());
                if let Some(config) = &imp.configuration {
                    self.problems.extend(config.problems.clone());
                }
            }
            self.imports.extend(imports);
        } else {
            for s in import_statements {
                self.problems.push(Problem {
                    msg: "import too deep".to_owned(),
                    position: [s.1[0] - 1, s.1[1]],
                    code: ErrorCode::DeepImport,
                });
            }
        }

        let mut imported_namespaces = VecDeque::new();
        for (i, _imp) in self.imports.iter().enumerate() {
            if _imp.problems.is_empty() {
                if let Some(item) = namespace.get(&_imp.name) {
                    if item.is_node() {
                        self.problems.push(Problem {
                            msg: format!("cannot import into {}, name already taken", _imp.name),
                            position: _imp.name_position,
                            code: ErrorCode::InvalidImport,
                        });
                    }
                } else if Self::is_deep_import(_imp) {
                    self.problems.push(Problem {
                        msg: "import too deep".to_owned(),
                        position: _imp.hash_position,
                        code: ErrorCode::DeepImport,
                    });
                } else {
                    let mut has_dispair = false;
                    let mut has_dup_keys = false;
                    let mut has_dup_words = false;
                    let mut ns: Namespace = HashMap::new();
                    if let Some(seq) = &_imp.sequence {
                        if let Some(dispair) = &seq.dispair {
                            ns.insert(
                                "Dispair".to_owned(),
                                NamespaceItem::Node(NamespaceNode {
                                    hash: _imp.hash.clone(),
                                    import_index: i as isize,
                                    element: NamespaceNodeElement::Dispair(dispair.clone()),
                                }),
                            );
                            has_dispair = true;
                        }
                        if let Some(ctxmeta) = &seq.ctxmeta {
                            let iter = &mut ctxmeta.iter();
                            for ctx in iter.by_ref() {
                                if ns.contains_key(&ctx.name) {
                                    has_dup_keys = true;
                                    break;
                                }
                            }
                            if !has_dup_keys {
                                for ctx in ctxmeta {
                                    ns.insert(
                                        ctx.name.clone(),
                                        NamespaceItem::Node(NamespaceNode {
                                            hash: _imp.hash.clone(),
                                            import_index: i as isize,
                                            element: NamespaceNodeElement::ContextAlias(
                                                ctx.clone(),
                                            ),
                                        }),
                                    );
                                }
                            }
                        }
                        if let Some(dmeta) = &seq.dotrain {
                            if !has_dup_keys {
                                if has_dispair && dmeta.namespace.contains_key("Dispair") {
                                    has_dup_words = true;
                                } else {
                                    let iter = &mut ns.keys();
                                    for key in iter.by_ref() {
                                        if dmeta.namespace.contains_key(key) {
                                            has_dup_keys = true;
                                            break;
                                        }
                                    }
                                    if !has_dup_keys {
                                        ns.extend(Self::copy_namespace(
                                            &dmeta.namespace,
                                            i as isize,
                                            &_imp.hash,
                                        ));
                                    }
                                }
                            }
                        }
                        if has_dup_keys || has_dup_words {
                            if has_dup_keys {
                                self.problems.push(Problem {
                                    msg: "import contains items with duplicate identifiers"
                                        .to_owned(),
                                    position: _imp.hash_position,
                                    code: ErrorCode::DuplicateIdentifier,
                                });
                            } else {
                                self.problems.push(Problem {
                                    msg: "import contains multiple sets of words in its namespace"
                                        .to_owned(),
                                    position: _imp.hash_position,
                                    code: ErrorCode::MultipleWords,
                                });
                            }
                        } else if let Some(configs) = &_imp.configuration {
                            for conf in &configs.pairs {
                                if let Some(new_conf) = &conf.1 {
                                    if new_conf.0 == "!" {
                                        if conf.0 .0 == "." {
                                            let dis = ns.remove("Dispair");
                                            if let Some(words) = dis {
                                                if let NamespaceItem::Node(n) = words {
                                                    if let NamespaceNodeElement::Dispair(d) =
                                                        n.element
                                                    {
                                                        if let Some(am) = d.authoring_meta {
                                                            for word in am.0 {
                                                                ns.remove(&word.word);
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                self.problems.push(Problem {
                                                    msg: "cannot elide undefined words".to_owned(),
                                                    position: [conf.0 .1[0], new_conf.1[1]],
                                                    code: ErrorCode::UndefinedDeployer,
                                                });
                                            }
                                        } else if ns.remove(&conf.0 .0).is_none() {
                                            self.problems.push(Problem {
                                                msg: format!("undefined identifier {}", conf.0 .0),
                                                position: conf.0 .1,
                                                code: ErrorCode::UndefinedIdentifier,
                                            });
                                        }
                                    } else {
                                        let key = {
                                            if conf.0 .0.starts_with('\'') {
                                                conf.0 .0.split_at(1).1
                                            } else {
                                                conf.0 .0.as_str()
                                            }
                                        };
                                        if ns.contains_key(key) {
                                            // if _ns.get(key).unwrap().is_word() {
                                            //     self.problems.push(Problem {
                                            //         msg: format!("cannot rename or rebind single word: {}", key),
                                            //         position: [c.0.1[0], new.1[1]],
                                            //         code: ErrorCode::SingleWordModify
                                            //     });
                                            // } else {
                                            if conf.0 .0.starts_with('\'') {
                                                if ns.contains_key(&new_conf.0) {
                                                    self.problems.push(Problem {
                                                        msg: format!(
                                                            "cannot rename, name {} already exists",
                                                            new_conf.0
                                                        ),
                                                        position: new_conf.1,
                                                        code: ErrorCode::DuplicateIdentifier,
                                                    });
                                                } else {
                                                    let ns_item = ns.remove(key).unwrap();
                                                    ns.insert(new_conf.0.clone(), ns_item);
                                                }
                                            } else {
                                                let ns_item = ns.get_mut(key).unwrap();
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
                                                    self.problems.push(Problem {
                                                        msg: "unexpected rebinding".to_owned(),
                                                        position: [conf.0 .1[0], new_conf.1[1]],
                                                        code: ErrorCode::UnexpectedRebinding,
                                                    });
                                                }
                                            }
                                            // }
                                        } else {
                                            self.problems.push(Problem {
                                                msg: format!("undefined identifier {}", key),
                                                position: conf.0 .1,
                                                code: ErrorCode::UndefinedIdentifier,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                        imported_namespaces.push_back((_imp.name.clone(), _imp.hash_position, ns));
                    }
                }
            }
        }
        // merges.reverse();
        while let Some((name, hash_position, _ns)) = imported_namespaces.pop_front() {
            self.merge_namespace(name, hash_position, _ns, &mut namespace);
        }

        let parsed_bindings = exclusive_parse(&document, &BINDING_PATTERN, 0, true);
        ignore_first = false;
        for b in parsed_bindings {
            if !ignore_first {
                ignore_first = true;
                continue;
            }
            let position = b.1;
            let name: String;
            let name_position: Offsets;
            let mut content = String::new();
            let content_position: Offsets;
            let mut no_cm_content = "";

            if let Some(index) = b.0.find([' ', '\t', '\r', '\n']) {
                let slices = b.0.split_at(index + 1);
                let no_cm_trimmed = tracked_trim(slices.1);
                no_cm_content = if no_cm_trimmed.0.is_empty() {
                    slices.1
                } else {
                    no_cm_trimmed.0
                };

                let content_text = self.text.get(b.1[0]..b.1[1]).unwrap().to_owned();
                name = slices.0[..slices.0.len() - 1].to_owned();
                name_position = [b.1[0], b.1[0] + index];

                let slices = content_text.split_at(index + 1);
                let trimmed_content = tracked_trim(slices.1);
                content_position = if trimmed_content.0.is_empty() {
                    [b.1[0] + index + 1, b.1[1]]
                } else {
                    [
                        b.1[0] + index + 1 + trimmed_content.1,
                        b.1[1] - trimmed_content.2,
                    ]
                };
                content = if trimmed_content.0.is_empty() {
                    slices.1.to_owned()
                } else {
                    trimmed_content.0.to_owned()
                };
            } else {
                name = b.0.clone();
                name_position = b.1;
                content_position = [b.1[1] + 1, b.1[1] + 1];
            }
            let invalid_id = !WORD_PATTERN.is_match(&name);
            let dup_id = self.namespace.contains_key(&name);

            if invalid_id {
                self.problems.push(Problem {
                    msg: "invalid binding name".to_owned(),
                    position: name_position,
                    code: ErrorCode::InvalidBindingIdentifier,
                });
            }
            if dup_id {
                self.problems.push(Problem {
                    msg: "duplicate identifier".to_owned(),
                    position: name_position,
                    code: ErrorCode::DuplicateIdentifier,
                });
            }
            if no_cm_content.is_empty() || no_cm_content.chars().all(|c| c.is_whitespace()) {
                self.problems.push(Problem {
                    msg: "empty bindings are not allowed".to_owned(),
                    position: name_position,
                    code: ErrorCode::InvalidEmptyBinding,
                });
            }

            if !invalid_id && !dup_id {
                if let Some(mut msg) = Self::is_elided(no_cm_content) {
                    if msg.is_empty() {
                        msg = DEFAULT_ELISION.to_owned();
                    }
                    let binding = Binding {
                        name: name.clone(),
                        name_position,
                        content,
                        content_position,
                        position,
                        problems: vec![],
                        dependencies: vec![],
                        item: BindingItem::Elided(ElidedBindingItem { msg }),
                    };
                    namespace.insert(
                        name,
                        NamespaceItem::Node(NamespaceNode {
                            hash: String::new(),
                            import_index: -1,
                            element: NamespaceNodeElement::Binding(binding.clone()),
                        }),
                    );
                    self.bindings.push(binding);
                } else if let Some(constant) = Self::is_constant(no_cm_content) {
                    match constant {
                        Ok(c) => {
                            let binding = Binding {
                                name: name.clone(),
                                name_position,
                                content,
                                content_position,
                                position,
                                problems: vec![],
                                dependencies: vec![],
                                item: BindingItem::Constant(ConstantBindingItem { value: c }),
                            };
                            namespace.insert(
                                name,
                                NamespaceItem::Node(NamespaceNode {
                                    hash: String::new(),
                                    import_index: -1,
                                    element: NamespaceNodeElement::Binding(binding.clone()),
                                }),
                            );
                            self.bindings.push(binding);
                        }
                        Err(e) => {
                            self.problems.push(Problem {
                                msg: e,
                                position: content_position,
                                code: ErrorCode::OutOfRangeValue,
                            });
                        }
                    }
                } else {
                    let binding = Binding {
                        name: name.clone(),
                        name_position,
                        content,
                        content_position,
                        position,
                        problems: vec![],
                        dependencies: vec![],
                        item: BindingItem::Exp(
                            // dummy
                            RainlangDocument::default(),
                        ),
                    };
                    namespace.insert(
                        name,
                        NamespaceItem::Node(NamespaceNode {
                            hash: String::new(),
                            import_index: -1,
                            element: NamespaceNodeElement::Binding(binding.clone()),
                        }),
                    );
                    self.bindings.push(binding);
                }
            }
            fill_in(&mut document, [b.1[0] - 1, b.1[1]])?;
        }

        // find non-top level imports
        if !self.bindings.is_empty() {
            for imp in &self.imports {
                if imp.position[0] >= self.bindings[0].name_position[0] {
                    self.problems.push(Problem {
                        msg: "imports can only be stated at top level".to_owned(),
                        position: imp.position,
                        code: ErrorCode::InvalidImport,
                    });
                }
            }
        }

        self.namespace = namespace;

        // find any remaining strings and include them as errors
        exclusive_parse(&document, &WS_PATTERN, 0, false)
            .iter()
            .for_each(|v| {
                self.problems.push(Problem {
                    msg: "unexpected token".to_owned(),
                    position: v.1,
                    code: ErrorCode::UnexpectedToken,
                });
            });

        // resolve dependencies and parse expressions
        self.process_dependencies();

        let binding_am = AuthoringMeta(vec![]);

        // instantiate rainlang for each expression
        if self.import_depth == 0 {
            // assign working words for this instance
            self.resolve_global_deployer();

            let mut has_exp = false;
            for b in &mut self.bindings {
                let mut is_exp = false;
                if let BindingItem::Exp(_) = b.item {
                    is_exp = true;
                    has_exp = true;
                }
                if is_exp {
                    b.item = BindingItem::Exp(RainlangDocument::create(
                        b.content.clone(),
                        if let Some(am) = &self.authoring_meta {
                            Some(am)
                        } else if self.ignore_undefined_words {
                            None
                        } else {
                            Some(&binding_am)
                        },
                        Some(&self.namespace),
                    ));

                    if let BindingItem::Exp(e) = &b.item {
                        b.problems.extend(e.problems.iter().map(|p| Problem {
                            msg: p.msg.clone(),
                            position: [
                                p.position[0] + b.content_position[0],
                                p.position[1] + b.content_position[0],
                            ],
                            code: p.code,
                        }));
                    }

                    self.namespace.insert(
                        b.name.clone(),
                        NamespaceItem::Node(NamespaceNode {
                            hash: String::new(),
                            import_index: -1,
                            element: NamespaceNodeElement::Binding(b.clone()),
                        }),
                    );
                }
            }
            let len = self.problems.len();
            if !has_exp && len > 0 {
                if self.problems[len - 1].msg == "cannot find any set of words (undefined deployer)"
                {
                    self.problems.pop();
                } else if let Some((i, _)) = self
                    .problems
                    .iter()
                    .enumerate()
                    .find(|(_, p)| p.msg == "cannot find any set of words (undefined deployer)")
                {
                    self.problems.remove(i);
                }
            }
        }

        // ignore next line problems
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

    /// checks if a imported namespace can safely be merged into the main namespace
    fn check_namespace(nns: &Namespace, cns: &Namespace) -> Option<String> {
        if cns.is_empty() {
            None
        } else {
            // let dup_words;
            if let Some(c_dis) = cns.get("Dispair") {
                if let Some(n_dis) = nns.get("Dispair") {
                    if let NamespaceItem::Node(cn) = c_dis {
                        if let NamespaceItem::Node(nn) = n_dis {
                            if cn.hash.to_ascii_lowercase() != nn.hash.to_ascii_lowercase() {
                                return Some(
                                    "namespace already contains a set of words".to_owned(),
                                );
                            }
                            //  else {
                            //     dup_words = true;
                            // }
                        }
                    }
                }
            }
            for (nkey, nitem) in nns {
                for (ckey, citem) in cns {
                    if nkey == ckey {
                        let nnode = !nitem.is_node();
                        let cnode = !citem.is_node();
                        if !nnode && !cnode {
                            if let NamespaceItem::Namespace(nn) = nitem {
                                if let NamespaceItem::Namespace(cn) = citem {
                                    let res = Self::check_namespace(nn, cn);
                                    if res.is_some() {
                                        return res;
                                    }
                                }
                            }
                        } else if nnode && cnode {
                            // if !nitem.is_word() && !citem.is_word() {
                            if (nitem.is_binding() && citem.is_binding())
                                || (nitem.is_context_alias() && citem.is_context_alias())
                            {
                                if let NamespaceItem::Node(cn) = citem {
                                    if let NamespaceItem::Node(nn) = nitem {
                                        if cn.hash.to_ascii_lowercase()
                                            != nn.hash.to_ascii_lowercase()
                                        {
                                            return Some("duplicate identifier".to_owned());
                                        }
                                    }
                                }
                            } else {
                                return Some("duplicate identifier".to_owned());
                            }
                            // } else {
                            //     if !dup_words {
                            //         return Some("namespace already contains a set of words".to_owned());
                            //     }
                            // }
                        } else {
                            return Some("cannot import into an occupied namespace".to_owned());
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
        ns: Namespace,
        cns: &mut Namespace,
    ) {
        if name != "." {
            if let Some(ns_item) = cns.get_mut(&name) {
                match ns_item {
                    NamespaceItem::Node(_) => {
                        self.problems.push(Problem {
                            msg: "cannot import into an occupied namespace".to_owned(),
                            position: hash_position,
                            code: ErrorCode::NamespaceOccupied,
                        });
                    }
                    NamespaceItem::Namespace(cns) => {
                        if let Some(msg) = Self::check_namespace(&ns, cns) {
                            let code = match &msg {
                                v if v.contains("identifier") => ErrorCode::DuplicateIdentifier,
                                v if v.contains("words") => ErrorCode::MultipleWords,
                                _ => ErrorCode::NamespaceOccupied,
                            };
                            self.problems.push(Problem {
                                msg,
                                position: hash_position,
                                code,
                            });
                        } else {
                            Self::_merge(&ns, cns)
                        }
                    }
                }
            } else {
                cns.insert(name.clone(), NamespaceItem::Namespace(ns));
            }
        } else {
            Self::_merge(&ns, cns);
        }
    }

    /// recursivly merges 2 namespaces
    fn _merge(nns: &Namespace, cns: &mut Namespace) {
        if cns.is_empty() {
            cns.extend(nns.clone())
        } else {
            for (key, item) in nns {
                if !cns.contains_key(key) {
                    cns.insert(key.clone(), item.clone());
                } else if let NamespaceItem::Namespace(_n) = item {
                    if let NamespaceItem::Namespace(_c) = cns.get(key).unwrap() {
                        Self::_merge(nns, cns)
                    }
                }
            }
        }
    }

    /// processes the expressions dependencies and checks for any possible dependecy issues
    fn process_dependencies(&mut self) {
        let mut topo_sort: TopoSort<&str> = TopoSort::new();
        let deps_map: Vec<&mut Binding> = self
            .bindings
            .iter_mut()
            .filter_map(|v| match v.item {
                BindingItem::Exp(_) => {
                    for dep in DEP_PATTERN.find_iter(&v.content) {
                        let s = dep.as_str().strip_prefix('\'').unwrap().to_owned();
                        v.dependencies.push(s);
                    }
                    Some(v)
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
                node.problems.push(Problem {
                    msg: "circular dependency".to_owned(),
                    position: node.name_position,
                    code: ErrorCode::CircularDependency,
                });
            }
        }
    }

    /// checks and counts the word sets in a namespace by their hashs
    #[allow(clippy::for_kv_map)]
    fn check_namespace_deployer<'a>(
        namespace: &'a Namespace,
        mut hash: &'a str,
    ) -> (usize, &'a str, Option<&'a NamespaceNode>) {
        let mut c = 0usize;
        let mut node = None;
        if let Some(dis_item) = namespace.get("Dispair") {
            let dis = dis_item.unwrap_node();
            if hash.is_empty() {
                c += 1;
                hash = &dis.hash;
                node = Some(dis);
            } else if dis.hash.to_ascii_lowercase() != hash.to_ascii_lowercase() {
                return (c + 1, hash, None);
            }
        }
        for (_key, item) in namespace {
            if !item.is_node() {
                let result = Self::check_namespace_deployer(item.unwrap_namespace(), hash);
                hash = result.1;
                c += result.0;
                if c > 1 {
                    node = None;
                    break;
                }
                if result.2.is_some() && node.is_none() {
                    node = result.2;
                }
            }
        }
        (c, hash, node)
    }

    /// assigns working word set for this RainDocument instance
    fn resolve_global_deployer(&mut self) {
        let (words_set_count, _hash, node) = Self::check_namespace_deployer(&self.namespace, "");
        if words_set_count > 1 {
            self.problems.push(Problem {
                msg: format!(
                    "words (deployer) must be singleton, but namespaces include {} sets of words",
                    words_set_count
                ),
                position: [0, 0],
                code: ErrorCode::SingletonWords,
            });
        } else if words_set_count == 0 {
            self.problems.push(Problem {
                msg: "cannot find any set of words (undefined deployer)".to_owned(),
                position: [0, 0],
                code: ErrorCode::UndefinedDeployer,
            });
        } else if let Some(n) = node {
            if n.is_dispair() {
                let dis = n.unwrap_dispair();
                // if let Some(am) = &dis.authoring_meta {
                //     self.authoring_meta = Some(am.clone())
                // };
                self.deployer = dis.clone().into();
                self.authoring_meta = self.deployer.authoring_meta.clone();
            } else {
                self.problems.push(Problem {
                    msg: "could not resolve namespace deployer".to_owned(),
                    position: [0, 0],
                    code: ErrorCode::UndefinedDeployer,
                });
            }
        } else {
            self.problems.push(Problem {
                msg: "could not resolve namespace deployer".to_owned(),
                position: [0, 0],
                code: ErrorCode::UndefinedDeployer,
            });
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
