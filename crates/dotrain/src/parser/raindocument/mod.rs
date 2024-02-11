use std::sync::{Arc, RwLock};
use serde::{Serialize, Deserialize};
use async_recursion::async_recursion;
use futures::executor::block_on;
use rain_metadata::{types::authoring::v1::AuthoringMeta, Store};
use super::super::{
    error::{Error, ErrorCode},
    types::{ast::*, patterns::*},
};

#[cfg(feature = "js-api")]
use tsify::Tsify;
#[cfg(feature = "js-api")]
use wasm_bindgen::prelude::wasm_bindgen;

// Type for a runtime rebind
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "js-api", derive(Tsify), tsify(into_wasm_abi, from_wasm_abi))]
pub struct Rebind(pub String, pub String);

mod logic;

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
let rain_document = RainDocument::create(text, Some(meta_store), None, None);

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
        rebinds: Option<Vec<Rebind>>,
    ) -> RainDocument {
        let mut rain_document = RainDocument::new(text, meta_store, 0, words);
        rain_document.parse(true, rebinds).await;
        rain_document
    }

    /// Creates an instance and parses with remote meta search disabled (cached metas only)
    pub fn create(
        text: String,
        meta_store: Option<Arc<RwLock<Store>>>,
        words: Option<AuthoringMeta>,
        rebinds: Option<Vec<Rebind>>,
    ) -> RainDocument {
        let mut rain_document = RainDocument::new(text, meta_store, 0, words);
        block_on(rain_document.parse(false, rebinds));
        rain_document
    }

    /// Get the front matter without parsing the dotrain
    pub fn get_front_matter(text: &str) -> Option<&str> {
        // split front matter and rest of the text
        if let Some(splitter) = text.find(FRONTMATTER_SEPARATOR) {
            Some(&text[..splitter])
        } else {
            None
        }
    }
}

impl RainDocument {
    /// Updates the text and parses right away with remote meta search disabled (cached metas only)
    pub fn update(&mut self, new_text: String, rebinds: Option<Vec<Rebind>>) {
        self.text = new_text;
        block_on(self.parse(false, rebinds));
    }

    /// Updates the text and parses right away with remote meta search enabled
    pub async fn update_async(&mut self, new_text: String, rebinds: Option<Vec<Rebind>>) {
        self.text = new_text;
        self.parse(true, rebinds).await;
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

    /// Parses this instance's text
    #[async_recursion(?Send)]
    pub async fn parse(&mut self, enable_remote: bool, rebinds: Option<Vec<Rebind>>) {
        if NON_EMPTY_PATTERN.is_match(&self.text) {
            if let Err(e) = self._parse(enable_remote, rebinds).await {
                if let Error::InvalidOverride(err_msg) = e {
                    self.problems.push(
                        ErrorCode::InvalidSuppliedRebindings.to_problem(vec![&err_msg], [0, 0]),
                    );
                } else {
                    self.error = Some(e.to_string());
                    self.problems
                        .push(ErrorCode::RuntimeError.to_problem(vec![&e.to_string()], [0, 0]));
                }
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
            namespace: std::collections::HashMap::new(),
            imports: vec![],
            known_words,
            comments: vec![],
            problems: vec![],
            import_depth,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::exclusive_parse;
    use std::collections::HashMap;
    use super::super::rainlangdocument::RainlangDocument;

    #[test]
    fn test_is_constant_method() -> anyhow::Result<()> {
        let text = " \n 1234 \n\t ";
        let result = RainDocument::is_literal(text);
        assert_eq!(result, Some(("1234".to_owned(), false, false)));

        let text = " \n 14e6";
        let result = RainDocument::is_literal(text);
        assert_eq!(result, Some(("14e6".to_owned(), false, false)));

        let text = " \t 0x1234abcdef ";
        let result = RainDocument::is_literal(text);
        assert_eq!(result, Some(("0x1234abcdef".to_owned(), false, false)));

        let text = " \n 99999e99999 \n";
        let result = RainDocument::is_literal(text);
        assert_eq!(result, Some(("99999e99999".to_owned(), false, true)));

        let text = "\" some\n literal  \nvalue\t\n \"";
        let result = RainDocument::is_literal(text);
        assert_eq!(
            result,
            Some(("\" some\n literal  \nvalue\t\n \"".to_owned(), true, false))
        );

        let text = "\" some\n literal\n with no end ";
        let result = RainDocument::is_literal(text);
        assert_eq!(
            result,
            Some(("\" some\n literal\n with no end ".to_owned(), true, true))
        );

        let text = " \n 999 234 \n";
        let result = RainDocument::is_literal(text);
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
        let rain_document =
            RainDocument::create(text.to_owned(), Some(meta_store.clone()), None, None);
        let expected_bindings: Vec<Binding> = vec![
            Binding {
                name: "const-binding".to_owned(),
                name_position: [120, 133],
                content: "4e18".to_owned(),
                content_position: [134, 138],
                position: [120, 139],
                problems: vec![],
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
