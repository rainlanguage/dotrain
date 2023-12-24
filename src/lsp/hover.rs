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
            let value = if let Some(seq) = &import.sequence {
                let mut v = "This import contains: ".to_owned();
                if seq.dispair.is_some() {
                    v.push_str("\n - DISPair")
                }
                if seq.ctxmeta.is_some() {
                    v.push_str("\n - ContractMeta")
                }
                if seq.dotrain.is_some() {
                    v.push_str("\n - RainDocument")
                }
                v
            } else {
                String::new()
            };
            return Some(Hover {
                contents: HoverContents::Markup(MarkupContent {
                    kind: content_type.clone(),
                    value,
                }),
                range: Some(Range::new(
                    rain_document.text.position_at(import.position[0]),
                    rain_document.text.position_at(import.position[1]),
                )),
            });
        } else {
            return None;
        }
    } else {
        for b in &rain_document.bindings {
            if b.name_position[0] <= target_offset && b.name_position[1] > target_offset {
                let value = match b.item {
                    BindingItem::Exp(_) => "Expression Binding",
                    BindingItem::Constant(_) => {
                        "Constant Binding (cannot be referenced as entrypoint)"
                    }
                    BindingItem::Elided(_) => "Elided Binding (cannot be referenced as entrypoint)",
                }
                .to_owned();
                return Some(Hover {
                    contents: HoverContents::Markup(MarkupContent {
                        kind: content_type,
                        value,
                    }),
                    range: Some(Range::new(
                        rain_document.text.position_at(b.name_position[0]),
                        rain_document.text.position_at(b.name_position[1]),
                    )),
                });
            } else if b.content_position[0] <= target_offset
                && b.content_position[1] > target_offset
            {
                match &b.item {
                    BindingItem::Exp(e) => {
                        let mut nodes: Vec<&Node> = vec![];
                        let mut alias_nodes: Vec<Node> = vec![];
                        e.ast.iter().for_each(|src| {
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
                            b.content_position[0],
                            target_offset - b.content_position[0],
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
                                rain_document.text.position_at(b.content_position[0]),
                                rain_document.text.position_at(b.content_position[1]),
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
                                rain_document.text.position_at(b.content_position[0]),
                                rain_document.text.position_at(b.content_position[1]),
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
    for n in nodes {
        let p = n.position();
        if p[0] <= target_offset && p[1] > target_offset {
            match n {
                Node::Opcode(op) => {
                    if op.parens[0] < target_offset && op.parens[1] > target_offset {
                        return search(
                            op.parameters.iter().map(|p| p).collect(),
                            offset,
                            target_offset,
                            kind,
                            text,
                        );
                    } else {
                        if let Some(og) = &op.operand_args {
                            if og.position[0] < target_offset && og.position[1] > target_offset {
                                for arg in &og.args {
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
                }
                Node::Value(v) => {
                    return Some(Hover {
                        contents: HoverContents::Markup(MarkupContent {
                            kind,
                            value: if let Some(id) = &v.id {
                                id.clone()
                            } else {
                                "value".to_owned()
                            },
                        }),
                        range: Some(Range::new(
                            text.position_at(v.position[0] + offset),
                            text.position_at(v.position[1] + offset),
                        )),
                    });
                }
                Node::Alias(a) => {
                    let mut value = "Stack Alias".to_owned();
                    if a.name == "_" {
                        value.push_str(" Placeholder")
                    };
                    return Some(Hover {
                        contents: HoverContents::Markup(MarkupContent { kind, value }),
                        range: Some(Range::new(
                            text.position_at(a.position[0] + offset),
                            text.position_at(a.position[1] + offset),
                        )),
                    });
                }
            }
        }
    }
    None
}
