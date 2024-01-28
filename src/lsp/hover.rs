use lsp_types::{Position, MarkupKind, Hover, HoverContents, Range, MarkupContent};
use super::super::{
    types::ast::{Node, BindingItem},
    parser::{OffsetAt, PositionAt, raindocument::RainDocument},
};

/// Provides hover item for the given RainDocument at the given Position
pub fn get_hover(
    rain_document: &RainDocument,
    position: Position,
    content_type: MarkupKind,
) -> Option<Hover> {
    let target_offset = rain_document.text.offset_at(&position);
    if let Some(import) = rain_document
        .imports
        .iter()
        .find(|v| v.position[0] <= target_offset && v.position[1] >= target_offset)
    {
        if import.sequence.is_some() {
            Some(Hover {
                contents: HoverContents::Markup(MarkupContent {
                    kind: content_type.clone(),
                    value: if import.sequence.is_some() {
                        "imported .rain".to_owned()
                    } else {
                        String::new()
                    },
                }),
                range: Some(Range::new(
                    rain_document.text.position_at(import.position[0]),
                    rain_document.text.position_at(import.position[1]),
                )),
            })
        } else {
            None
        }
    } else {
        for binding in &rain_document.bindings {
            if binding.name_position[0] <= target_offset && binding.name_position[1] > target_offset
            {
                return Some(Hover {
                    contents: HoverContents::Markup(MarkupContent {
                        kind: content_type,
                        value: match binding.item {
                            BindingItem::Exp(_) => "Expression Binding",
                            BindingItem::Constant(_) => {
                                "Constant Binding (cannot be referenced as entrypoint)"
                            }
                            BindingItem::Elided(_) => {
                                "Elided Binding (cannot be referenced as entrypoint)"
                            }
                        }
                        .to_owned(),
                    }),
                    range: Some(Range::new(
                        rain_document.text.position_at(binding.name_position[0]),
                        rain_document.text.position_at(binding.name_position[1]),
                    )),
                });
            } else if binding.content_position[0] <= target_offset
                && binding.content_position[1] > target_offset
            {
                match &binding.item {
                    BindingItem::Exp(exp) => {
                        let mut nodes: Vec<&Node> = vec![];
                        let mut alias_nodes: Vec<Node> = vec![];
                        exp.ast.iter().for_each(|src| {
                            src.lines.iter().for_each(|line| {
                                for a in &line.aliases {
                                    alias_nodes.push(Node::Alias(a.clone()));
                                }
                                for n in &line.nodes {
                                    nodes.push(n);
                                }
                            })
                        });
                        for a in &alias_nodes {
                            nodes.push(a);
                        }
                        return search(
                            nodes,
                            binding.content_position[0],
                            target_offset - binding.content_position[0],
                            content_type,
                            &rain_document.text,
                        );
                    }
                    BindingItem::Constant(_) => {
                        return Some(Hover {
                            contents: HoverContents::Markup(MarkupContent {
                                kind: content_type,
                                value: "constant value".to_owned(),
                            }),
                            range: Some(Range::new(
                                rain_document.text.position_at(binding.content_position[0]),
                                rain_document.text.position_at(binding.content_position[1]),
                            )),
                        })
                    }
                    BindingItem::Elided(_) => {
                        return Some(Hover {
                            contents: HoverContents::Markup(MarkupContent {
                                kind: content_type,
                                value: "elision msg".to_owned(),
                            }),
                            range: Some(Range::new(
                                rain_document.text.position_at(binding.content_position[0]),
                                rain_document.text.position_at(binding.content_position[1]),
                            )),
                        })
                    }
                }
            }
        }
        None
    }
}

fn search(
    nodes: Vec<&Node>,
    offset: usize,
    target_offset: usize,
    kind: MarkupKind,
    text: &str,
) -> Option<Hover> {
    for node in nodes {
        let node_pos = node.position();
        if node_pos[0] <= target_offset && node_pos[1] > target_offset {
            match node {
                Node::Opcode(op) => {
                    if op.parens[0] < target_offset && op.parens[1] > target_offset {
                        return search(
                            op.inputs.iter().collect(),
                            offset,
                            target_offset,
                            kind,
                            text,
                        );
                    } else if let Some(og) = &op.operand_args {
                        if og.position[0] < target_offset && og.position[1] > target_offset {
                            for arg in &og.args {
                                if arg.position[0] <= target_offset
                                    && arg.position[1] > target_offset
                                {
                                    return Some(Hover {
                                        contents: HoverContents::Markup(MarkupContent {
                                            kind,
                                            value: if arg.description.is_empty() {
                                                arg.name.clone()
                                            } else {
                                                [arg.name.clone(), arg.description.clone()]
                                                    .join("\n")
                                            },
                                        }),
                                        range: Some(Range::new(
                                            text.position_at(arg.position[0] + offset),
                                            text.position_at(arg.position[1] + offset),
                                        )),
                                    });
                                }
                            }
                            return None;
                        } else {
                            return Some(Hover {
                                contents: HoverContents::Markup(MarkupContent {
                                    kind,
                                    value: op.opcode.description.clone(),
                                }),
                                range: Some(Range::new(
                                    text.position_at(op.opcode.position[0] + offset),
                                    text.position_at(op.parens[1] + offset),
                                )),
                            });
                        }
                    } else {
                        return Some(Hover {
                            contents: HoverContents::Markup(MarkupContent {
                                kind,
                                value: op.opcode.description.clone(),
                            }),
                            range: Some(Range::new(
                                text.position_at(op.opcode.position[0] + offset),
                                text.position_at(op.parens[1] + offset),
                            )),
                        });
                    }
                }
                Node::Literal(literal) => {
                    return Some(Hover {
                        contents: HoverContents::Markup(MarkupContent {
                            kind,
                            value: literal
                                .id
                                .as_ref()
                                .map_or("value".to_owned(), |id| id.clone()),
                        }),
                        range: Some(Range::new(
                            text.position_at(literal.position[0] + offset),
                            text.position_at(literal.position[1] + offset),
                        )),
                    });
                }
                Node::Alias(alias) => {
                    let mut value = "Stack Alias".to_owned();
                    if alias.name == "_" {
                        value.push_str(" Placeholder")
                    };
                    return Some(Hover {
                        contents: HoverContents::Markup(MarkupContent { kind, value }),
                        range: Some(Range::new(
                            text.position_at(alias.position[0] + offset),
                            text.position_at(alias.position[1] + offset),
                        )),
                    });
                }
            }
        }
    }
    None
}
