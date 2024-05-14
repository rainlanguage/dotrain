use serde::{Serialize, Deserialize};
use super::super::{types::ast::*, error::ErrorCode};
use rain_metadata::types::authoring::v1::AuthoringMeta;

#[cfg(feature = "js-api")]
use tsify::Tsify;

mod logic;

#[derive(Debug, Clone, PartialEq, Default)]
struct Parens {
    open: Vec<usize>,
    close: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq, Default)]
struct RainlangState {
    nodes: Vec<Node>,
    aliases: Vec<Alias>,
    parens: Parens,
    depth: usize,
}

/// Data structure (parse tree) of a Rainlang text
///
/// RainlangDocument represents the parse tree of a Rainlang text which is used by the
/// RainDocument and for providing LSP services.
#[cfg_attr(feature = "js-api", derive(Tsify), tsify(into_wasm_abi, from_wasm_abi))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RainlangDocument {
    pub(crate) text: String,
    pub(crate) ast: Vec<RainlangSource>,
    pub(crate) problems: Vec<Problem>,
    pub(crate) comments: Vec<Comment>,
    pub(crate) error: Option<String>,
    pub(crate) dependencies: Vec<String>,
    pub(crate) pragmas: Vec<PragmaStatement>,
    #[serde(skip)]
    state: RainlangState,
}

impl RainlangDocument {
    /// The error msg if parsing had resulted in an runtime error
    pub fn runtime_error(&self) -> Option<String> {
        self.error.clone()
    }

    /// This instance's text
    pub fn text(&self) -> &String {
        &self.text
    }

    /// This instance's parse tree (AST)
    pub fn ast(&self) -> &Vec<RainlangSource> {
        &self.ast
    }

    /// This instance's problems
    pub fn problems(&self) -> &Vec<Problem> {
        &self.problems
    }

    /// This instance's comments
    pub fn comments(&self) -> &Vec<Comment> {
        &self.comments
    }
}

impl RainlangDocument {
    /// Creates a new instance
    pub(crate) fn create(
        text: String,
        namespace: &Namespace,
        authoring_meta: Option<&AuthoringMeta>,
    ) -> RainlangDocument {
        let mut rainlang_doc = RainlangDocument {
            text,
            ast: vec![],
            problems: vec![],
            comments: vec![],
            dependencies: vec![],
            pragmas: vec![],
            error: None,
            state: RainlangState::default(),
        };
        rainlang_doc.parse(namespace, authoring_meta.unwrap_or(&AuthoringMeta(vec![])));
        rainlang_doc
    }

    pub(crate) fn new() -> Self {
        RainlangDocument {
            text: String::new(),
            ast: vec![],
            problems: vec![],
            comments: vec![],
            dependencies: vec![],
            pragmas: vec![],
            error: None,
            state: RainlangState::default(),
        }
    }

    pub(crate) fn parse(&mut self, namespace: &Namespace, authoring_meta: &AuthoringMeta) {
        if let Err(e) = self._parse(namespace, authoring_meta) {
            self.error = Some(e.to_string());
            self.problems
                .push(ErrorCode::RuntimeError.to_problem(vec![&e.to_string()], [0, 0]));
        };
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use rain_metadata::types::authoring::v1::AuthoringMetaItem;

    #[test]
    fn test_process_opcode_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        rl.state.depth = 1;
        rl.state.parens.close = vec![13];
        let value_node = Node::Literal(Literal {
            value: "12".to_owned(),
            position: [3, 4],
            lhs_alias: None,
            id: None,
        });
        let op_node = Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "add".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [8, 0],
            inputs: vec![
                Node::Literal(Literal {
                    value: "1".to_owned(),
                    position: [9, 10],
                    lhs_alias: None,
                    id: None,
                }),
                Node::Literal(Literal {
                    value: "2".to_owned(),
                    position: [11, 12],
                    lhs_alias: None,
                    id: None,
                }),
            ],
            lhs_alias: None,
            operand_args: None,
        });
        rl.state.nodes = vec![value_node.clone(), op_node];
        rl.process_opcode()?;

        let expected_op_node = Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "add".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 14],
            parens: [8, 13],
            inputs: vec![
                Node::Literal(Literal {
                    value: "1".to_owned(),
                    position: [9, 10],
                    lhs_alias: None,
                    id: None,
                }),
                Node::Literal(Literal {
                    value: "2".to_owned(),
                    position: [11, 12],
                    lhs_alias: None,
                    id: None,
                }),
            ],
            lhs_alias: None,
            operand_args: None,
        });
        let expected_state = RainlangState {
            nodes: vec![value_node, expected_op_node],
            depth: 1,
            ..Default::default()
        };
        assert_eq!(rl.state, expected_state);

        Ok(())
    }

    #[test]
    fn test_process_operand_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        let namespace = HashMap::new();
        let exp = r#"<12 56>"#;
        let mut op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: None,
        };

        let consumed_count = rl.process_operand(exp, 8, &mut op, &namespace);
        let expected_op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [8, 15],
                args: vec![
                    OperandArgItem {
                        value: Some("12".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [9, 11],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: Some("56".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [12, 14],
                        description: String::new(),
                        binding_id: None,
                    },
                ],
            }),
        };

        assert_eq!(consumed_count, exp.len());
        assert_eq!(op, expected_op);

        let exp =
            r#"<0xa5 "some string literal " some-literal-binding "some other string literal ">"#;
        let mut op = Opcode {
            opcode: OpcodeDetails {
                name: "opcode".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: None,
        };

        let consumed_count = rl.process_operand(exp, 8, &mut op, &namespace);
        let expected_op = Opcode {
            opcode: OpcodeDetails {
                name: "opcode".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [8, 87],
                args: vec![
                    OperandArgItem {
                        value: Some("0xa5".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [9, 13],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: Some(r#""some string literal ""#.to_owned()),
                        name: "operand arg".to_owned(),
                        position: [14, 36],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: None,
                        name: "operand arg".to_owned(),
                        position: [37, 57],
                        description: String::new(),
                        binding_id: Some(("some-literal-binding".to_owned(), false)),
                    },
                    OperandArgItem {
                        value: Some(r#""some other string literal ""#.to_owned()),
                        name: "operand arg".to_owned(),
                        position: [58, 86],
                        description: String::new(),
                        binding_id: None,
                    },
                ],
            }),
        };
        assert_eq!(consumed_count, exp.len());
        assert_eq!(op, expected_op);

        let exp = "<1\n0xf2\n69   32 [some sub parser literal]>";
        let mut op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: None,
        };

        let consumed_count = rl.process_operand(exp, 15, &mut op, &namespace);
        let expected_op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [15, 57],
                args: vec![
                    OperandArgItem {
                        value: Some("1".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [16, 17],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: Some("0xf2".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [18, 22],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: Some("69".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [23, 25],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: Some("32".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [28, 30],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: Some("[some sub parser literal]".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [31, 56],
                        description: String::new(),
                        binding_id: None,
                    },
                ],
            }),
        };
        assert_eq!(consumed_count, exp.len());
        assert_eq!(op, expected_op);

        let exp = r#"<"12." "56.abcd">"#;
        let mut op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: None,
        };

        let consumed_count = rl.process_operand(exp, 8, &mut op, &namespace);
        let expected_op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [8, 25],
                args: vec![
                    OperandArgItem {
                        value: Some(r#""12.""#.to_owned()),
                        name: "operand arg".to_owned(),
                        position: [9, 14],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: Some(r#""56.abcd""#.to_owned()),
                        name: "operand arg".to_owned(),
                        position: [15, 24],
                        description: String::new(),
                        binding_id: None,
                    },
                ],
            }),
        };

        assert_eq!(consumed_count, exp.len());
        assert_eq!(op, expected_op);

        Ok(())
    }

    #[test]
    fn test_consume_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        let namespace = HashMap::new();
        let authoring_meta = AuthoringMeta(vec![
            AuthoringMetaItem {
                word: "opcode".to_owned(),
                operand_parser_offset: 0,
                description: String::new(),
            },
            AuthoringMetaItem {
                word: "another-opcode".to_owned(),
                operand_parser_offset: 0,
                description: String::new(),
            },
            AuthoringMetaItem {
                word: "another-opcode-2".to_owned(),
                operand_parser_offset: 0,
                description: String::new(),
            },
        ]);

        let text = "opcode<12 56>(";
        let consumed_count = rl.consume(text, 10, &namespace, &authoring_meta)?;
        let mut expected_state_nodes = vec![Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "opcode".to_owned(),
                description: String::new(),
                position: [10, 16],
            },
            operand: None,
            output: None,
            position: [10, 0],
            parens: [23, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [16, 23],
                args: vec![
                    OperandArgItem {
                        value: Some("12".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [17, 19],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: Some("56".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [20, 22],
                        description: String::new(),
                        binding_id: None,
                    },
                ],
            }),
        })];
        assert_eq!(consumed_count, text.len());
        assert_eq!(rl.state.nodes, expected_state_nodes);

        let text = "another-opcode(12 0x123abced)";
        rl.state.depth -= 1;
        let consumed_count = rl.consume(text, 24, &namespace, &authoring_meta)?;
        expected_state_nodes.push(Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "another-opcode".to_owned(),
                description: String::new(),
                position: [24, 38],
            },
            operand: None,
            output: None,
            position: [24, 0],
            parens: [38, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: None,
        }));
        assert_eq!(consumed_count, "another-opcode(".len());
        assert_eq!(rl.state.nodes, expected_state_nodes);

        let text = "another-opcode-2<\n  0x1f\n  87>(\n  0xabcef1234\n)";
        rl.state.depth -= 1;
        let consumed_count = rl.consume(text, 77, &namespace, &authoring_meta)?;
        expected_state_nodes.push(Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "another-opcode-2".to_owned(),
                description: String::new(),
                position: [77, 93],
            },
            operand: None,
            output: None,
            position: [77, 0],
            parens: [107, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [93, 107],
                args: vec![
                    OperandArgItem {
                        value: Some("0x1f".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [97, 101],
                        description: String::new(),
                        binding_id: None,
                    },
                    OperandArgItem {
                        value: Some("87".to_owned()),
                        name: "operand arg".to_owned(),
                        position: [104, 106],
                        description: String::new(),
                        binding_id: None,
                    },
                ],
            }),
        }));
        assert_eq!(consumed_count, "another-opcode-2<\n  0x1f\n  87>(".len());
        assert_eq!(rl.state.nodes, expected_state_nodes);

        Ok(())
    }

    #[test]
    fn test_search_namespace_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        let mut main_namespace: Namespace = HashMap::new();
        let mut deep_namespace: Namespace = HashMap::new();
        let mut deeper_namespace: Namespace = HashMap::new();

        let deeper_binding = Binding {
            name: "deeper-binding-name".to_owned(),
            name_position: [2, 2],
            content: String::new(),
            content_position: [4, 4],
            position: [1, 2],
            problems: vec![],
            // dependencies: vec![],
            item: BindingItem::Elided(ElidedBindingItem {
                msg: "elided binding".to_string(),
            }),
        };
        let deeper_leaf = NamespaceItem::Leaf(NamespaceLeaf {
            hash: "some-hash".to_owned(),
            import_index: 2,
            element: deeper_binding.clone(),
        });

        let binding = Binding {
            name: "binding-name".to_owned(),
            name_position: [1, 1],
            content: String::new(),
            content_position: [1, 2],
            position: [1, 2],
            problems: vec![],
            // dependencies: vec![],
            item: BindingItem::Literal(LiteralBindingItem {
                value: "1234".to_owned(),
            }),
        };
        let deep_leaf = NamespaceItem::Leaf(NamespaceLeaf {
            hash: "some-other-hash".to_owned(),
            import_index: 1,
            element: binding.clone(),
        });

        deeper_namespace.insert("deeper-binding-name".to_string(), deeper_leaf.clone());
        deep_namespace.insert("binding-name".to_string(), deep_leaf.clone());
        deep_namespace.insert(
            "deeper-namespace".to_string(),
            NamespaceItem::Node(deeper_namespace),
        );
        main_namespace.insert(
            "deep-namespace".to_string(),
            NamespaceItem::Node(deep_namespace),
        );

        let result = rl.search_namespace(
            "deep-namespace.deeper-namespace.deeper-binding-name",
            0,
            &main_namespace,
        );
        assert_eq!(Some(&deeper_binding), result);

        let result = rl.search_namespace(".deep-namespace.binding-name", 0, &main_namespace);
        assert_eq!(Some(&binding), result);

        let result = rl.search_namespace("deep-namespace.other-binding-name", 0, &main_namespace);
        assert_eq!(None, result);

        let result = rl.search_namespace(
            "deep-namespace.deeper-namespace.other-binding-name",
            0,
            &main_namespace,
        );
        assert_eq!(None, result);

        Ok(())
    }
}
