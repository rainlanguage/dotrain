use regex::Regex;
use once_cell::sync::Lazy;
use alloy_primitives::hex;
use std::collections::VecDeque;
use lsp_types::{
    Range, TextEdit, CompletionItem, Position, MarkupKind, Documentation, MarkupContent,
    CompletionItemLabelDetails, CompletionItemKind,
};
use super::super::{
    parser::{
        OffsetAt, exclusive_parse,
        raindocument::{RainDocument, RAIN_DOCUMENT_CONSTANTS},
    },
    types::{
        ast::{Namespace, NamespaceItem, NamespaceNodeElement, BindingItem, ParsedItem},
        patterns::{
            WORD_PATTERN, WS_PATTERN, HEX_PATTERN, NAMESPACE_PATTERN, NAMESPACE_SEGMENT_PATTERN,
        },
    },
};

static META_COMPLETION: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0?x").unwrap());
static TRIGGERS: Lazy<Regex> = Lazy::new(|| Regex::new(r"[a-zA-Z0-9-.']").unwrap());
static TRIGGERS_PATH: Lazy<Regex> = Lazy::new(|| Regex::new(r"[a-zA-Z0-9-.'\\/]").unwrap());

/// Provides completion items for the given RainDocument at the given Position
pub fn get_completion(
    rain_document: &RainDocument,
    position: Position,
    documentation_format: MarkupKind,
) -> Option<Vec<CompletionItem>> {
    let target_offset = rain_document.text.offset_at(&position);
    let lookahead = if let Some(v) = rain_document.text.get(target_offset..target_offset + 1) {
        v
    } else {
        ""
    };
    let mut result = VecDeque::new();
    if let Some(import) = rain_document
        .imports
        .iter()
        .find(|v| v.position[0] <= target_offset && v.position[1] >= target_offset)
    {
        if !TRIGGERS.is_match(lookahead) {
            let pretext = rain_document
                .text
                .get(import.position[0]..rain_document.text.offset_at(&position))?;
            let chunks = exclusive_parse(pretext, &WS_PATTERN, 0, false);
            if let Some(configurations) = &import.configuration {
                if let Some(_conf) = configurations
                    .pairs
                    .iter()
                    .find(|v| v.0 .1[1] == target_offset)
                {
                    let prefix = get_prefix(pretext, &TRIGGERS);
                    if let Some(seq) = &import.sequence {
                        if let Some(dotrain) = &seq.dotrain {
                            if !prefix.contains('.') {
                                for (key, ns_item) in &dotrain.namespace {
                                    match ns_item {
                                        NamespaceItem::Namespace(_ns) => {
                                            result.push_front(CompletionItem {
                                                label: key.clone(),
                                                label_details: Some(
                                                    CompletionItemLabelDetails {
                                                        description: Some(
                                                            "namespace".to_owned(),
                                                        ),
                                                        detail: None,
                                                    },
                                                ),
                                                kind: Some(CompletionItemKind::FIELD),
                                                detail: Some(format!("namespace: {}", key)),
                                                insert_text: Some(key.clone()),
                                                documentation: None,
                                                deprecated: None,
                                                preselect: None,
                                                sort_text: None,
                                                filter_text: None,
                                                insert_text_format: None,
                                                insert_text_mode: None,
                                                text_edit: None,
                                                additional_text_edits: None,
                                                command: None,
                                                commit_characters: None,
                                                data: None,
                                                tags: None,
                                            })
                                        }
                                        NamespaceItem::Node(n) => {
                                            match &n.element {
                                                NamespaceNodeElement::Binding(b) => {
                                                    match &b.item {
                                                        BindingItem::Constant(c) => result.push_front(CompletionItem {
                                                            label: key.clone(),
                                                            label_details: Some(CompletionItemLabelDetails {
                                                                description: Some("binding".to_owned()),
                                                                detail: None
                                                            }),
                                                            kind: Some(CompletionItemKind::CLASS),
                                                            detail: Some(format!("constant binding: {}", key)),
                                                            insert_text: Some(key.clone()),
                                                            documentation: Some(Documentation::MarkupContent(MarkupContent {
                                                                kind: documentation_format.clone(),
                                                                value: c.value.clone()
                                                            })),
                                                            deprecated: None,
                                                            preselect: None,
                                                            sort_text: None,
                                                            filter_text: None,
                                                            insert_text_format: None,
                                                            insert_text_mode: None,
                                                            text_edit: None,
                                                            additional_text_edits: None,
                                                            command: None,
                                                            commit_characters: None,
                                                            data: None,
                                                            tags: None
                                                        }),
                                                        BindingItem::Elided(e) => result.push_front(CompletionItem {
                                                            label: key.clone(),
                                                            label_details: Some(CompletionItemLabelDetails {
                                                                description: Some("binding".to_owned()),
                                                                detail: None
                                                            }),
                                                            kind: Some(CompletionItemKind::CLASS),
                                                            detail: Some(format!("elided binding: {}", key)),
                                                            insert_text: Some(key.clone()),
                                                            documentation: Some(Documentation::MarkupContent(MarkupContent {
                                                                kind: documentation_format.clone(),
                                                                value: e.msg.clone()
                                                            })),
                                                            deprecated: None,
                                                            preselect: None,
                                                            sort_text: None,
                                                            filter_text: None,
                                                            insert_text_format: None,
                                                            insert_text_mode: None,
                                                            text_edit: None,
                                                            additional_text_edits: None,
                                                            command: None,
                                                            commit_characters: None,
                                                            data: None,
                                                            tags: None
                                                        }),
                                                        BindingItem::Exp(_e) => result.push_front(CompletionItem {
                                                            label: key.clone(),
                                                            label_details: Some(CompletionItemLabelDetails {
                                                                description: Some("binding".to_owned()),
                                                                detail: None
                                                            }),
                                                            kind: Some(CompletionItemKind::CLASS),
                                                            detail: Some(format!("expression binding: {}", key)),
                                                            insert_text: Some(key.clone()),
                                                            documentation: Some(Documentation::MarkupContent(MarkupContent {
                                                                kind: documentation_format.clone(),
                                                                value: match documentation_format {
                                                                    MarkupKind::Markdown => [
                                                                        "```rainlang",
                                                                        b.content.trim(),
                                                                        "```"
                                                                    ].join("\n").to_string(),
                                                                    MarkupKind::PlainText => b.content.trim().to_string()
                                                                }
                                                            })),
                                                            deprecated: None,
                                                            preselect: None,
                                                            sort_text: None,
                                                            filter_text: None,
                                                            insert_text_format: None,
                                                            insert_text_mode: None,
                                                            text_edit: None,
                                                            additional_text_edits: None,
                                                            command: None,
                                                            commit_characters: None,
                                                            data: None,
                                                            tags: None
                                                        })
                                                    }
                                                }
                                                NamespaceNodeElement::ContextAlias(c) => {
                                                    let following = if c.row.is_none() {
                                                        "<>()".to_owned()
                                                    } else {
                                                        "()".to_owned()
                                                    };
                                                    result.push_front(CompletionItem {
                                                        label: key.clone(),
                                                        label_details: Some(CompletionItemLabelDetails {
                                                            description: Some("context alias opcode".to_owned()),
                                                            detail: Some(following.clone())
                                                        }),
                                                        kind: Some(CompletionItemKind::FUNCTION),
                                                        detail: Some(format!(
                                                            "context alias opcode: {}{}", 
                                                            key,
                                                            if following == "<>()" {
                                                                format!("<>() with column index {}", c.column)
                                                            } else {
                                                                format!("() with column index {} and row index {}", c.column, c.row.unwrap())
                                                            }
                                                        )),
                                                        insert_text: Some(format!("{}{}", key, following)),
                                                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                                                            kind: documentation_format.clone(),
                                                            value: c.description.clone()
                                                        })),
                                                        deprecated: None,
                                                        preselect: None,
                                                        sort_text: None,
                                                        filter_text: None,
                                                        insert_text_format: None,
                                                        insert_text_mode: None,
                                                        text_edit: None,
                                                        additional_text_edits: None,
                                                        command: None,
                                                        commit_characters: None,
                                                        data: None,
                                                        tags: None
                                                    })
                                                }
                                                NamespaceNodeElement::Dispair(_) => {}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if let Some(ctxs) = &seq.ctxmeta {
                            for c in ctxs {
                                let following = if c.row.is_none() {
                                    "<>()".to_owned()
                                } else {
                                    "()".to_owned()
                                };
                                result.push_front(CompletionItem {
                                    label: c.name.clone(),
                                    label_details: Some(CompletionItemLabelDetails {
                                        description: Some("context alias opcode".to_owned()),
                                        detail: Some(following.clone()),
                                    }),
                                    kind: Some(CompletionItemKind::FUNCTION),
                                    detail: Some(format!(
                                        "context alias opcode: {}{}",
                                        c.name,
                                        if following == "<>()" {
                                            format!("<>() with column index {}", c.column)
                                        } else {
                                            format!(
                                                "() with column index {} and row index {}",
                                                c.column,
                                                c.row.unwrap()
                                            )
                                        }
                                    )),
                                    insert_text: Some(format!("{}{}", c.name, following)),
                                    documentation: Some(Documentation::MarkupContent(
                                        MarkupContent {
                                            kind: documentation_format.clone(),
                                            value: c.description.clone(),
                                        },
                                    )),
                                    deprecated: None,
                                    preselect: None,
                                    sort_text: None,
                                    filter_text: None,
                                    insert_text_format: None,
                                    insert_text_mode: None,
                                    text_edit: None,
                                    additional_text_edits: None,
                                    command: None,
                                    commit_characters: None,
                                    data: None,
                                    tags: None,
                                })
                            }
                        }
                    }
                }
            } else if chunks.len() < 4 {
                let mut last = if chunks.len() == 1 {
                    &chunks[0]
                } else if chunks.len() == 2 {
                    if HEX_PATTERN.is_match(&chunks[0].0) {
                        return None;
                    }
                    &chunks[1]
                } else if chunks.len() == 3 {
                    if HEX_PATTERN.is_match(&chunks[0].0) {
                        return None;
                    }
                    if HEX_PATTERN.is_match(&chunks[1].0) {
                        return None;
                    }
                    &chunks[2]
                } else {
                    return None;
                };

                let temp = ParsedItem(last.0.split_at(1).1.to_owned(), last.1);
                if last.0.starts_with('@') {
                    last = &temp
                }
                let _prefix = get_prefix(pretext, &TRIGGERS_PATH);
                {
                    rain_document
                        .meta_store
                        .read()
                        .unwrap()
                        .dotrain_cache()
                        .iter()
                        .for_each(|v| {
                            if rain_document.uri.to_string() != *v.0 {
                                result.push_front(CompletionItem {
                                    label: v.0.clone(),
                                    label_details: Some(CompletionItemLabelDetails {
                                        description: Some("rain document".to_owned()),
                                        detail: None,
                                    }),
                                    kind: Some(CompletionItemKind::FILE),
                                    detail: Some(format!("rain document at: {}", v.0,)),
                                    insert_text: Some(hex::encode_prefixed(v.1)),
                                    documentation: Some(Documentation::MarkupContent(
                                        MarkupContent {
                                            kind: documentation_format.clone(),
                                            value: hex::encode_prefixed(v.1),
                                        },
                                    )),
                                    text_edit: Some(lsp_types::CompletionTextEdit::Edit(
                                        TextEdit {
                                            new_text: hex::encode_prefixed(v.1),
                                            range: Range::new(
                                                Position {
                                                    line: position.line,
                                                    character: position.character - _prefix.len() as u32,
                                                },
                                                position,
                                            ),
                                        },
                                    )),
                                    deprecated: None,
                                    preselect: None,
                                    sort_text: None,
                                    filter_text: None,
                                    insert_text_format: None,
                                    insert_text_mode: None,
                                    additional_text_edits: None,
                                    command: None,
                                    commit_characters: None,
                                    data: None,
                                    tags: None,
                                })
                            }
                        })
                }
                if META_COMPLETION.is_match(&last.0) {
                    rain_document
                        .meta_store
                        .read()
                        .unwrap()
                        .cache()
                        .iter()
                        .for_each(|v| {
                            result.push_front(CompletionItem {
                                label: "x".to_owned() + &hex::encode(v.0),
                                label_details: Some(CompletionItemLabelDetails {
                                    description: Some("meta".to_owned()),
                                    detail: None,
                                }),
                                kind: Some(CompletionItemKind::MODULE),
                                detail: Some(format!("meta hash: {}", hex::encode_prefixed(v.0))),
                                insert_text: Some(hex::encode_prefixed(v.0)),
                                documentation: None,
                                text_edit: None,
                                deprecated: None,
                                preselect: None,
                                sort_text: None,
                                filter_text: None,
                                insert_text_format: None,
                                insert_text_mode: None,
                                additional_text_edits: None,
                                command: None,
                                commit_characters: None,
                                data: None,
                                tags: None,
                            })
                        })
                }
            }
            Some(Vec::from(result))
        } else {
            None
        }
    } else if !TRIGGERS.is_match(lookahead) {
        let pretext = rain_document.text.get(
            rain_document.text.offset_at(&Position {
                line: position.line,
                character: 0,
            })..rain_document.text.offset_at(&position),
        )?;
        let mut prefix = get_prefix(pretext, &TRIGGERS);
        let is_quote = prefix.starts_with('\'');
        if is_quote {
            prefix = prefix.split_at(1).1.to_owned();
        }
        if NAMESPACE_PATTERN.is_match(&prefix) {
            let offset = rain_document.text.offset_at(&position);
            if prefix.contains('.') {
                if let Some(ns_match) = search_namespace(&prefix, &rain_document.namespace) {
                    for (key, ns_item) in ns_match {
                        if key != "Dispair" {
                            match ns_item {
                                NamespaceItem::Namespace(_ns) => {
                                    result.push_front(CompletionItem {
                                        label: key.clone(),
                                        label_details: Some(CompletionItemLabelDetails {
                                            description: Some("namespace".to_owned()),
                                            detail: None,
                                        }),
                                        kind: Some(CompletionItemKind::FIELD),
                                        detail: Some(format!("namespace: {}", key)),
                                        insert_text: Some(key.clone()),
                                        documentation: None,
                                        deprecated: None,
                                        preselect: None,
                                        sort_text: None,
                                        filter_text: None,
                                        insert_text_format: None,
                                        insert_text_mode: None,
                                        text_edit: None,
                                        additional_text_edits: None,
                                        command: None,
                                        commit_characters: None,
                                        data: None,
                                        tags: None,
                                    })
                                }
                                NamespaceItem::Node(n) => match &n.element {
                                    NamespaceNodeElement::Binding(b) => match &b.item {
                                        BindingItem::Constant(c) => {
                                            result.push_front(CompletionItem {
                                                label: key.clone(),
                                                label_details: Some(CompletionItemLabelDetails {
                                                    description: Some("binding".to_owned()),
                                                    detail: None,
                                                }),
                                                kind: Some(CompletionItemKind::CLASS),
                                                detail: Some(format!("constant binding: {}", key)),
                                                insert_text: Some(key.clone()),
                                                documentation: Some(Documentation::MarkupContent(
                                                    MarkupContent {
                                                        kind: documentation_format.clone(),
                                                        value: c.value.clone(),
                                                    },
                                                )),
                                                deprecated: None,
                                                preselect: None,
                                                sort_text: None,
                                                filter_text: None,
                                                insert_text_format: None,
                                                insert_text_mode: None,
                                                text_edit: None,
                                                additional_text_edits: None,
                                                command: None,
                                                commit_characters: None,
                                                data: None,
                                                tags: None,
                                            })
                                        }
                                        BindingItem::Elided(e) => {
                                            result.push_front(CompletionItem {
                                                label: key.clone(),
                                                label_details: Some(CompletionItemLabelDetails {
                                                    description: Some("binding".to_owned()),
                                                    detail: None,
                                                }),
                                                kind: Some(CompletionItemKind::CLASS),
                                                detail: Some(format!("elided binding: {}", key)),
                                                insert_text: Some(key.clone()),
                                                documentation: Some(Documentation::MarkupContent(
                                                    MarkupContent {
                                                        kind: documentation_format.clone(),
                                                        value: e.msg.clone(),
                                                    },
                                                )),
                                                deprecated: None,
                                                preselect: None,
                                                sort_text: None,
                                                filter_text: None,
                                                insert_text_format: None,
                                                insert_text_mode: None,
                                                text_edit: None,
                                                additional_text_edits: None,
                                                command: None,
                                                commit_characters: None,
                                                data: None,
                                                tags: None,
                                            })
                                        }
                                        BindingItem::Exp(_e) => result.push_front(CompletionItem {
                                            label: key.clone(),
                                            label_details: Some(CompletionItemLabelDetails {
                                                description: Some("binding".to_owned()),
                                                detail: None,
                                            }),
                                            kind: Some(CompletionItemKind::CLASS),
                                            detail: Some(format!("expression binding: {}", key)),
                                            insert_text: Some(key.clone()),
                                            documentation: Some(Documentation::MarkupContent(
                                                MarkupContent {
                                                    kind: documentation_format.clone(),
                                                    value: match documentation_format {
                                                        MarkupKind::Markdown => {
                                                            ["```rainlang", b.content.trim(), "```"]
                                                                .join("\n")
                                                                .to_string()
                                                        }
                                                        MarkupKind::PlainText => {
                                                            b.content.trim().to_string()
                                                        }
                                                    },
                                                },
                                            )),
                                            deprecated: None,
                                            preselect: None,
                                            sort_text: None,
                                            filter_text: None,
                                            insert_text_format: None,
                                            insert_text_mode: None,
                                            text_edit: None,
                                            additional_text_edits: None,
                                            command: None,
                                            commit_characters: None,
                                            data: None,
                                            tags: None,
                                        }),
                                    },
                                    NamespaceNodeElement::ContextAlias(c) => {
                                        let following = if c.row.is_none() {
                                            "<>()".to_owned()
                                        } else {
                                            "()".to_owned()
                                        };
                                        result.push_front(CompletionItem {
                                            label: key.clone(),
                                            label_details: Some(CompletionItemLabelDetails {
                                                description: Some(
                                                    "context alias opcode".to_owned(),
                                                ),
                                                detail: Some(following.clone()),
                                            }),
                                            kind: Some(CompletionItemKind::FUNCTION),
                                            detail: Some(format!(
                                                "context alias opcode: {}{}",
                                                key,
                                                if following == "<>()" {
                                                    format!("<>() with column index {}", c.column)
                                                } else {
                                                    format!(
                                                        "() with column index {} and row index {}",
                                                        c.column,
                                                        c.row.unwrap()
                                                    )
                                                }
                                            )),
                                            insert_text: Some(format!("{}{}", key, following)),
                                            documentation: Some(Documentation::MarkupContent(
                                                MarkupContent {
                                                    kind: documentation_format.clone(),
                                                    value: c.description.clone(),
                                                },
                                            )),
                                            deprecated: None,
                                            preselect: None,
                                            sort_text: None,
                                            filter_text: None,
                                            insert_text_format: None,
                                            insert_text_mode: None,
                                            text_edit: None,
                                            additional_text_edits: None,
                                            command: None,
                                            commit_characters: None,
                                            data: None,
                                            tags: None,
                                        })
                                    }
                                    NamespaceNodeElement::Dispair(_) => {}
                                },
                            }
                        }
                    }
                } else {
                    return None;
                }
            } else {
                if !is_quote {
                    if let Some(am) = &rain_document.authoring_meta {
                        for v in &am.0 {
                            // let following = if c.row.is_none() {
                            //     "<>()".to_owned()
                            // } else {
                            //     "()".to_owned()
                            // };
                            result.push_front(CompletionItem {
                                label: v.word.clone(),
                                label_details: Some(CompletionItemLabelDetails {
                                    description: Some("opcode".to_owned()),
                                    detail: None,
                                }),
                                kind: Some(CompletionItemKind::FUNCTION),
                                detail: Some(format!("opcode: {}", v.word)),
                                insert_text: Some(v.word.clone()),
                                documentation: Some(Documentation::MarkupContent(MarkupContent {
                                    kind: documentation_format.clone(),
                                    value: v.description.clone(),
                                })),
                                deprecated: None,
                                preselect: None,
                                sort_text: None,
                                filter_text: None,
                                insert_text_format: None,
                                insert_text_mode: None,
                                text_edit: None,
                                additional_text_edits: None,
                                command: None,
                                commit_characters: None,
                                data: None,
                                tags: None,
                            })
                        }
                    }
                    for (key, value) in RAIN_DOCUMENT_CONSTANTS {
                        result.push_front(CompletionItem {
                            label: key.to_string(),
                            label_details: Some(CompletionItemLabelDetails {
                                description: Some("reserved constant alias".to_owned()),
                                detail: None,
                            }),
                            kind: Some(CompletionItemKind::CONSTANT),
                            detail: Some(format!("reserved constant alias: {}", key)),
                            insert_text: Some(key.to_string()),
                            documentation: Some(Documentation::MarkupContent(MarkupContent {
                                kind: documentation_format.clone(),
                                value: format!("value: {}", value),
                            })),
                            deprecated: None,
                            preselect: None,
                            sort_text: None,
                            filter_text: None,
                            insert_text_format: None,
                            insert_text_mode: None,
                            text_edit: None,
                            additional_text_edits: None,
                            command: None,
                            commit_characters: None,
                            data: None,
                            tags: None,
                        })
                    }
                }
                for (key, ns_item) in &rain_document.namespace {
                    if key != "Dispair" {
                        match ns_item {
                            NamespaceItem::Namespace(_ns) => result.push_front(CompletionItem {
                                label: key.clone(),
                                label_details: Some(CompletionItemLabelDetails {
                                    description: Some("namespace".to_owned()),
                                    detail: None,
                                }),
                                kind: Some(CompletionItemKind::FIELD),
                                detail: Some(format!("namespace: {}", key)),
                                insert_text: Some(key.clone()),
                                documentation: None,
                                deprecated: None,
                                preselect: None,
                                sort_text: None,
                                filter_text: None,
                                insert_text_format: None,
                                insert_text_mode: None,
                                text_edit: None,
                                additional_text_edits: None,
                                command: None,
                                commit_characters: None,
                                data: None,
                                tags: None,
                            }),
                            NamespaceItem::Node(n) => match &n.element {
                                NamespaceNodeElement::Binding(b) => match &b.item {
                                    BindingItem::Constant(c) => result.push_front(CompletionItem {
                                        label: key.clone(),
                                        label_details: Some(CompletionItemLabelDetails {
                                            description: Some("binding".to_owned()),
                                            detail: None,
                                        }),
                                        kind: Some(CompletionItemKind::CLASS),
                                        detail: Some(format!("constant binding: {}", key)),
                                        insert_text: Some(key.clone()),
                                        documentation: Some(Documentation::MarkupContent(
                                            MarkupContent {
                                                kind: documentation_format.clone(),
                                                value: c.value.clone(),
                                            },
                                        )),
                                        deprecated: None,
                                        preselect: None,
                                        sort_text: None,
                                        filter_text: None,
                                        insert_text_format: None,
                                        insert_text_mode: None,
                                        text_edit: None,
                                        additional_text_edits: None,
                                        command: None,
                                        commit_characters: None,
                                        data: None,
                                        tags: None,
                                    }),
                                    BindingItem::Elided(e) => result.push_front(CompletionItem {
                                        label: key.clone(),
                                        label_details: Some(CompletionItemLabelDetails {
                                            description: Some("binding".to_owned()),
                                            detail: None,
                                        }),
                                        kind: Some(CompletionItemKind::CLASS),
                                        detail: Some(format!("elided binding: {}", key)),
                                        insert_text: Some(key.clone()),
                                        documentation: Some(Documentation::MarkupContent(
                                            MarkupContent {
                                                kind: documentation_format.clone(),
                                                value: e.msg.clone(),
                                            },
                                        )),
                                        deprecated: None,
                                        preselect: None,
                                        sort_text: None,
                                        filter_text: None,
                                        insert_text_format: None,
                                        insert_text_mode: None,
                                        text_edit: None,
                                        additional_text_edits: None,
                                        command: None,
                                        commit_characters: None,
                                        data: None,
                                        tags: None,
                                    }),
                                    BindingItem::Exp(_e) => result.push_front(CompletionItem {
                                        label: key.clone(),
                                        label_details: Some(CompletionItemLabelDetails {
                                            description: Some("binding".to_owned()),
                                            detail: None,
                                        }),
                                        kind: Some(CompletionItemKind::CLASS),
                                        detail: Some(format!("expression binding: {}", key)),
                                        insert_text: Some(key.clone()),
                                        documentation: Some(Documentation::MarkupContent(
                                            MarkupContent {
                                                kind: documentation_format.clone(),
                                                value: match documentation_format {
                                                    MarkupKind::Markdown => {
                                                        ["```rainlang", b.content.trim(), "```"]
                                                            .join("\n")
                                                            .to_string()
                                                    }
                                                    MarkupKind::PlainText => {
                                                        b.content.trim().to_string()
                                                    }
                                                },
                                            },
                                        )),
                                        deprecated: None,
                                        preselect: None,
                                        sort_text: None,
                                        filter_text: None,
                                        insert_text_format: None,
                                        insert_text_mode: None,
                                        text_edit: None,
                                        additional_text_edits: None,
                                        command: None,
                                        commit_characters: None,
                                        data: None,
                                        tags: None,
                                    }),
                                },
                                NamespaceNodeElement::ContextAlias(c) => {
                                    let following = if c.row.is_none() {
                                        "<>()".to_owned()
                                    } else {
                                        "()".to_owned()
                                    };
                                    result.push_front(CompletionItem {
                                        label: key.clone(),
                                        label_details: Some(CompletionItemLabelDetails {
                                            description: Some("context alias opcode".to_owned()),
                                            detail: Some(following.clone()),
                                        }),
                                        kind: Some(CompletionItemKind::FUNCTION),
                                        detail: Some(format!(
                                            "context alias opcode: {}{}",
                                            key,
                                            if following == "<>()" {
                                                format!("<>() with column index {}", c.column)
                                            } else {
                                                format!(
                                                    "() with column index {} and row index {}",
                                                    c.column,
                                                    c.row.unwrap()
                                                )
                                            }
                                        )),
                                        insert_text: Some(format!("{}{}", key, following)),
                                        documentation: Some(Documentation::MarkupContent(
                                            MarkupContent {
                                                kind: documentation_format.clone(),
                                                value: c.description.clone(),
                                            },
                                        )),
                                        deprecated: None,
                                        preselect: None,
                                        sort_text: None,
                                        filter_text: None,
                                        insert_text_format: None,
                                        insert_text_mode: None,
                                        text_edit: None,
                                        additional_text_edits: None,
                                        command: None,
                                        commit_characters: None,
                                        data: None,
                                        tags: None,
                                    })
                                }
                                NamespaceNodeElement::Dispair(_) => {}
                            },
                        }
                    }
                }
                if !is_quote {
                    if let Some(binding) = rain_document
                        .bindings
                        .iter()
                        .find(|v| v.content_position[0] <= offset && v.content_position[1] > offset)
                    {
                        if let BindingItem::Exp(exp) = &binding.item {
                            if let Some(src) = exp.ast.iter().find(|v| {
                                v.position[0] + binding.content_position[0] <= offset
                                    && v.position[1] + binding.content_position[0] > offset
                            }) {
                                if let Some(last_line) = &src.lines.last() {
                                    if let Some(t) =
                                        rain_document.text.get(last_line.position[0]..offset)
                                    {
                                        if t.contains(':') {
                                            for line in &src.lines {
                                                if line.position[1]
                                                    + binding.content_position[0]
                                                    + 1
                                                    < offset
                                                {
                                                    for alias in &line.aliases {
                                                        if alias.name != "_" {
                                                            result.push_front(CompletionItem {
                                                                label: alias.name.clone(),
                                                                label_details: Some(
                                                                    CompletionItemLabelDetails {
                                                                        description: Some(
                                                                            "stack alias"
                                                                                .to_owned(),
                                                                        ),
                                                                        detail: None,
                                                                    },
                                                                ),
                                                                kind: Some(
                                                                    CompletionItemKind::VARIABLE,
                                                                ),
                                                                detail: Some(format!(
                                                                    "stack alias: {}",
                                                                    alias.name
                                                                )),
                                                                insert_text: Some(
                                                                    alias.name.clone(),
                                                                ),
                                                                documentation: Some(
                                                                    Documentation::MarkupContent(
                                                                        MarkupContent {
                                                                            kind:
                                                                                documentation_format
                                                                                    .clone(),
                                                                            value: "stack alias"
                                                                                .to_owned(),
                                                                        },
                                                                    ),
                                                                ),
                                                                deprecated: None,
                                                                preselect: None,
                                                                sort_text: None,
                                                                filter_text: None,
                                                                insert_text_format: None,
                                                                insert_text_mode: None,
                                                                text_edit: None,
                                                                additional_text_edits: None,
                                                                command: None,
                                                                commit_characters: None,
                                                                data: None,
                                                                tags: None,
                                                            })
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return Some(Vec::from(result));
        } else {
            return None;
        }
    } else {
        return None;
    }
}

/// Search in a Namespace for a given name
fn search_namespace<'a>(name: &str, namespace: &'a Namespace) -> Option<&'a Namespace> {
    let mut names = VecDeque::from(exclusive_parse(name, &NAMESPACE_SEGMENT_PATTERN, 0, true));
    if name.starts_with('.') {
        names.pop_front();
    }
    if names.len() > 32 {
        return None;
    }
    let _last = match names.pop_back() {
        Some(v) => {
            if !v.0.is_empty() && !WORD_PATTERN.is_match(&v.0) {
                return None;
            }
            v
        }
        None => return None,
    };
    if names.iter().any(|v| !WORD_PATTERN.is_match(&v.0)) {
        return None;
    }
    if !names.is_empty() {
        if let Some(ns_item) = namespace.get(&names[0].0) {
            let mut result = ns_item;
            for n in names.range(1..) {
                match result {
                    NamespaceItem::Namespace(ns) => {
                        if let Some(item) = ns.get(&n.0) {
                            result = item;
                        } else {
                            return None;
                        }
                    }
                    NamespaceItem::Node(_node) => {
                        return None;
                    }
                }
            }
            match result {
                NamespaceItem::Node(_) => None,
                NamespaceItem::Namespace(ns) => Some(ns),
            }
        } else {
            None
        }
    } else {
        Some(namespace)
    }
}

/// Method to get the last set of chars from a char that match a given pattern
fn get_prefix(text: &str, pattern: &Regex) -> String {
    let mut prefix = String::new();
    let mut iter = text.chars();
    while let Some(char) = iter.next_back() {
        if pattern.is_match(&char.to_string()) {
            prefix.insert(0, char)
        } else {
            break;
        }
    }
    prefix
}
