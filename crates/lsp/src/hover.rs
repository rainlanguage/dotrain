use super::{OffsetAt, PositionAt};
use dotrain::{
    RainDocument,
    types::{ast::*, patterns::*},
    exclusive_parse,
};
use lsp_types::{Position, MarkupKind, Hover, HoverContents, Range, MarkupContent};

/// Provides hover item for the given RainDocument at the given Position
pub fn get_hover(
    rain_document: &RainDocument,
    position: Position,
    content_type: MarkupKind,
) -> Option<Hover> {
    let target_offset = rain_document.text().offset_at(&position);
    if let Some(import) = rain_document
        .imports()
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
                    rain_document.text().position_at(import.position[0]),
                    rain_document.text().position_at(import.position[1]),
                )),
            })
        } else {
            None
        }
    } else {
        for binding in rain_document.bindings() {
            if binding.name_position[0] <= target_offset && binding.name_position[1] > target_offset
            {
                return Some(Hover {
                    contents: HoverContents::Markup(MarkupContent {
                        kind: content_type,
                        value: match binding.item {
                            BindingItem::Exp(_) => "Expression Binding",
                            BindingItem::Literal(_) => {
                                "Constant Binding (cannot be referenced as entrypoint)"
                            }
                            BindingItem::Elided(_) => {
                                "Elided Binding (cannot be referenced as entrypoint)"
                            }
                            BindingItem::Quote(_) => {
                                "Quote Binding (cannot be referenced as entrypoint)"
                            }
                        }
                        .to_owned(),
                    }),
                    range: Some(Range::new(
                        rain_document.text().position_at(binding.name_position[0]),
                        rain_document.text().position_at(binding.name_position[1]),
                    )),
                });
            } else if binding.content_position[0] <= target_offset
                && binding.content_position[1] > target_offset
            {
                match &binding.item {
                    BindingItem::Exp(exp) => {
                        let mut nodes: Vec<&Node> = vec![];
                        let mut alias_nodes: Vec<Node> = vec![];
                        exp.ast().iter().for_each(|src| {
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
                            rain_document,
                            nodes,
                            binding.content_position[0],
                            target_offset - binding.content_position[0],
                            content_type,
                            rain_document.text(),
                        );
                    }
                    BindingItem::Literal(_) => {
                        return Some(Hover {
                            contents: HoverContents::Markup(MarkupContent {
                                kind: content_type,
                                value: "literal value".to_owned(),
                            }),
                            range: Some(Range::new(
                                rain_document
                                    .text()
                                    .position_at(binding.content_position[0]),
                                rain_document
                                    .text()
                                    .position_at(binding.content_position[1]),
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
                                rain_document
                                    .text()
                                    .position_at(binding.content_position[0]),
                                rain_document
                                    .text()
                                    .position_at(binding.content_position[1]),
                            )),
                        })
                    }
                    BindingItem::Quote(_) => {
                        return Some(Hover {
                            contents: HoverContents::Markup(MarkupContent {
                                kind: content_type,
                                value: "quote binding".to_owned(),
                            }),
                            range: Some(Range::new(
                                rain_document
                                    .text()
                                    .position_at(binding.content_position[0]),
                                rain_document
                                    .text()
                                    .position_at(binding.content_position[1]),
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
    rain_document: &RainDocument,
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
                            rain_document,
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
                                    let header = if arg.description.is_empty() {
                                        arg.name.clone()
                                    } else {
                                        [arg.name.clone(), arg.description.clone()].join("\n")
                                    };
                                    let value = if let Some((id, _)) = &arg.binding_id {
                                        match search_binding_ref(id.strip_prefix('\'').unwrap_or(id.as_str()), rain_document.namespace()) {
                                            None => header,
                                            Some(binding) => match &binding.item {
                                                BindingItem::Elided(e) => format!("{}\n\n---\n\nelided binding\n\n---\n\nmessage:\n{}", header, get_value(&e.msg, &kind)),
                                                BindingItem::Literal(l) => format!("{}\n\n---\n\nliteral binding\n\n---\n\n{}", header, get_value(&l.value, &kind)),
                                                BindingItem::Quote(q) => format!("{}\n\n---\n\nquote binding\n\n---\n\n{}", header, get_value(&q.quote, &kind)),
                                                BindingItem::Exp(_) => format!("{}\n\n---\n\nrainlang expression binding\n\n---\n\n{}", header, get_value(&binding.content, &kind)),
                                            }
                                        }
                                    } else {
                                        header
                                    };
                                    return Some(Hover {
                                        contents: HoverContents::Markup(MarkupContent {
                                            kind,
                                            value,
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
                            value: if literal.id.is_some() {
                                get_value(&literal.value, &kind)
                            } else {
                                "literal value".to_owned()
                            },
                            kind,
                        }),
                        range: Some(Range::new(
                            text.position_at(literal.position[0] + offset),
                            text.position_at(literal.position[1] + offset),
                        )),
                    });
                }
                Node::Alias(alias) => {
                    let value = if alias.name == "_" {
                        "Stack Alias Placeholder".to_owned()
                    } else {
                        match search_binding_ref(&alias.name, rain_document.namespace()) {
                            None => "Stack Alias".to_owned(),
                            Some(binding) => match &binding.item {
                                BindingItem::Elided(e) => format!(
                                    "elided binding\n\n---\n\nmessage:\n{}",
                                    get_value(&e.msg, &kind)
                                ),
                                BindingItem::Literal(l) => format!(
                                    "literal binding\n\n---\n\n{}",
                                    get_value(&l.value, &kind)
                                ),
                                BindingItem::Quote(q) => format!(
                                    "quote binding\n\n---\n\n{}",
                                    get_value(&q.quote, &kind)
                                ),
                                BindingItem::Exp(_) => format!(
                                    "rainlang expression binding\n\n---\n\n{}",
                                    get_value(&binding.content, &kind)
                                ),
                            },
                        }
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

fn search_binding_ref<'a>(query: &str, namespace: &'a Namespace) -> Option<&'a Binding> {
    let mut segments: &[ParsedItem] = &exclusive_parse(query, &NAMESPACE_SEGMENT_PATTERN, 0, true);
    if query.starts_with('.') {
        segments = &segments[1..];
    }
    if segments.len() > 32 {
        return None;
    }
    if segments[segments.len() - 1].0.is_empty() {
        return None;
    }
    if segments.iter().any(|v| !WORD_PATTERN.is_match(&v.0)) {
        return None;
    }

    if let Some(namespace_item) = namespace.get(&segments[0].0) {
        let mut result = namespace_item;
        let iter = segments[1..].iter();
        for segment in iter {
            match result {
                NamespaceItem::Node(node) => {
                    if let Some(namespace_item) = node.get(&segment.0) {
                        result = namespace_item;
                    } else {
                        return None;
                    }
                }
                _ => {
                    return None;
                }
            }
        }
        match result {
            NamespaceItem::Node(_node) => None,
            NamespaceItem::Leaf(leaf) => Some(&leaf.element),
        }
    } else {
        None
    }
}

fn get_value(text: &str, kind: &MarkupKind) -> String {
    let lines_len = text.lines().count();
    let limited_text = if lines_len > 10 {
        let mut line_text = vec![];
        for (i, line) in text.lines().enumerate() {
            line_text.push(line);
            if i == 9 {
                break;
            }
        }
        line_text.push("...");
        line_text.join("\n")
    } else {
        text.to_owned()
    };
    if *kind == MarkupKind::Markdown {
        format!("```rainlang\n---\n{}\n```", limited_text)
    } else {
        limited_text
    }
}
