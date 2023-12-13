use regex::Regex;
use once_cell::sync::Lazy;
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
        WORD_PATTERN, WS_PATTERN, HEX_PATTERN, NAMESPACE_PATTERN, NAMESPACE_SEGMENT_PATTERN,
    },
};

const META_COMPLETION: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0?x").unwrap());
const TRIGGERS: Lazy<Regex> = Lazy::new(|| Regex::new(r"[a-zA-Z0-9-.']").unwrap());
const TRIGGERS_PATH: Lazy<Regex> = Lazy::new(|| Regex::new(r"[a-zA-Z0-9-.'\\/]").unwrap());

pub fn get_completion(
    rain_document: &RainDocument,
    position: Position,
    documentation_format: MarkupKind,
) -> Option<Vec<CompletionItem>> {
    let target_offset = rain_document.text.offset_at(&position);
    if let Some(lookahead) = rain_document.text.get(target_offset..target_offset + 1) {
        let mut result = VecDeque::new();
        if let Some(import) = rain_document
            .imports
            .iter()
            .find(|v| v.position[0] <= target_offset && v.position[1] >= target_offset)
        {
            if !TRIGGERS.is_match(lookahead) {
                let pretext = if let Some(s) = rain_document
                    .text
                    .get(import.position[0]..rain_document.text.offset_at(&position))
                {
                    s
                } else {
                    return None;
                };
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
                } else {
                    if chunks.len() < 4 {
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
                        if last.0.starts_with("@") {
                            last = &temp
                        }
                        let prefix = get_prefix(pretext, &TRIGGERS_PATH);
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
                                            insert_text: Some(v.1.clone()),
                                            documentation: Some(Documentation::MarkupContent(
                                                MarkupContent {
                                                    kind: documentation_format.clone(),
                                                    value: v.1.clone(),
                                                },
                                            )),
                                            text_edit: Some(lsp_types::CompletionTextEdit::Edit(
                                                TextEdit {
                                                    new_text: v.1.clone(),
                                                    range: Range::new(
                                                        Position {
                                                            line: position.line,
                                                            character: position.character
                                                                - prefix.len() as u32,
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
                                    if rain_document.uri.to_string() != *v.0 {
                                        result.push_front(CompletionItem {
                                            label: v.0.split_at(1).1.to_string(),
                                            label_details: Some(CompletionItemLabelDetails {
                                                description: Some("meta".to_owned()),
                                                detail: None,
                                            }),
                                            kind: Some(CompletionItemKind::MODULE),
                                            detail: Some(format!("meta hash: {}", v.0)),
                                            insert_text: Some(v.0.clone()),
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
                                    }
                                })
                        }
                    }
                }
                return Some(Vec::from(result));
            } else {
                return None;
            }
        } else {
            if !TRIGGERS.is_match(lookahead) {
                let pretext = if let Some(s) = rain_document.text.get(
                    rain_document.text.offset_at(&Position {
                        line: position.line,
                        character: 0,
                    })..rain_document.text.offset_at(&position),
                ) {
                    s
                } else {
                    return None;
                };
                let mut prefix = get_prefix(pretext, &TRIGGERS);
                let is_quote = prefix.starts_with('\'');
                if is_quote {
                    prefix = prefix.split_at(1).1.to_owned();
                }
                if NAMESPACE_PATTERN.is_match(&prefix) {
                    let offset = rain_document.text.offset_at(&position);
                    if prefix.contains('.') {
                        if let Some(ns_match) = search_namespace(&prefix, &rain_document.namespace)
                        {
                            for (key, ns_item) in ns_match {
                                if key != "Dispair" {
                                    match ns_item {
                                        NamespaceItem::Namespace(_ns) => {
                                            result.push_front(CompletionItem {
                                                label: key.clone(),
                                                label_details: Some(CompletionItemLabelDetails {
                                                    description: Some("namespace".to_owned()),
                                                    detail: None
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
                                                tags: None
                                            })
                                        },
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
                                                },
                                                NamespaceNodeElement::Dispair(_) => {}
                                            }
                                        }
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
                                        documentation: Some(Documentation::MarkupContent(
                                            MarkupContent {
                                                kind: documentation_format.clone(),
                                                value: v.description.clone(),
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
                                    documentation: Some(Documentation::MarkupContent(
                                        MarkupContent {
                                            kind: documentation_format.clone(),
                                            value: format!("value: {}", value),
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
                        for (key, ns_item) in &rain_document.namespace {
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
                                                    label_details: Some(
                                                        CompletionItemLabelDetails {
                                                            description: Some("binding".to_owned()),
                                                            detail: None,
                                                        },
                                                    ),
                                                    kind: Some(CompletionItemKind::CLASS),
                                                    detail: Some(format!(
                                                        "constant binding: {}",
                                                        key
                                                    )),
                                                    insert_text: Some(key.clone()),
                                                    documentation: Some(
                                                        Documentation::MarkupContent(
                                                            MarkupContent {
                                                                kind: documentation_format.clone(),
                                                                value: c.value.clone(),
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
                                            BindingItem::Elided(e) => {
                                                result.push_front(CompletionItem {
                                                    label: key.clone(),
                                                    label_details: Some(
                                                        CompletionItemLabelDetails {
                                                            description: Some("binding".to_owned()),
                                                            detail: None,
                                                        },
                                                    ),
                                                    kind: Some(CompletionItemKind::CLASS),
                                                    detail: Some(format!(
                                                        "elided binding: {}",
                                                        key
                                                    )),
                                                    insert_text: Some(key.clone()),
                                                    documentation: Some(
                                                        Documentation::MarkupContent(
                                                            MarkupContent {
                                                                kind: documentation_format.clone(),
                                                                value: e.msg.clone(),
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
                                            BindingItem::Exp(_e) => {
                                                result.push_front(CompletionItem {
                                                    label: key.clone(),
                                                    label_details: Some(
                                                        CompletionItemLabelDetails {
                                                            description: Some("binding".to_owned()),
                                                            detail: None,
                                                        },
                                                    ),
                                                    kind: Some(CompletionItemKind::CLASS),
                                                    detail: Some(format!(
                                                        "expression binding: {}",
                                                        key
                                                    )),
                                                    insert_text: Some(key.clone()),
                                                    documentation: Some(
                                                        Documentation::MarkupContent(
                                                            MarkupContent {
                                                                kind: documentation_format.clone(),
                                                                value: match documentation_format {
                                                                    MarkupKind::Markdown => [
                                                                        "```rainlang",
                                                                        b.content.trim(),
                                                                        "```",
                                                                    ]
                                                                    .join("\n")
                                                                    .to_string(),
                                                                    MarkupKind::PlainText => {
                                                                        b.content.trim().to_string()
                                                                    }
                                                                },
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
                                    },
                                }
                            }
                        }
                        if !is_quote {
                            if let Some(binding) = rain_document.bindings.iter().find(|v| {
                                v.content_position[0] <= offset && v.content_position[1] > offset
                            }) {
                                if let BindingItem::Exp(exp) = &binding.item {
                                    if let Some(src) = exp.ast.iter().find(|v| {
                                        v.position[0] + binding.content_position[0] <= offset
                                            && v.position[1] + binding.content_position[0] > offset
                                    }) {
                                        if let Some(last_line) = &src.lines.last() {
                                            if let Some(t) = rain_document
                                                .text
                                                .get(last_line.position[0]..offset)
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
                                                                        label_details: Some(CompletionItemLabelDetails {
                                                                            description: Some("stack alias".to_owned()),
                                                                            detail: None
                                                                        }),
                                                                        kind: Some(CompletionItemKind::VARIABLE),
                                                                        detail: Some(format!("stack alias: {}", alias.name)),
                                                                        insert_text: Some(alias.name.clone()),
                                                                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                                                                            kind: documentation_format.clone(),
                                                                            value: "stack alias".to_owned()
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
    } else {
        return None;
    };
}

// export async function getCompletion(
//     document: TextDocument | RainDocument,
//     position: Position,
//     setting?: LanguageServiceParams
// ): Promise<CompletionItem[] | null> {
//     const _triggers = /[a-zA-Z0-9-.']/;
//     const _triggersPath = /[a-zA-Z0-9-.'\\/]/;
//     let _documentionType: MarkupKind = "plaintext";
//     let _rd: RainDocument;
//     let _td: TextDocument;
//     if (document instanceof RainDocument) {
//         _rd = document;
//         _td = _rd.textDocument;
//         if (setting?.metaStore && _rd.metaStore !== setting.metaStore) {
//             _rd.metaStore.update(setting.metaStore);
//             if (setting?.noMetaSearch) (_rd as any)._shouldSearch = false;
//             await _rd.parse();
//         }
//     }
//     else {
//         _td = document;
//         _rd = new RainDocument(document, setting?.metaStore);
//         if (setting?.noMetaSearch) (_rd as any)._shouldSearch = false;
//         await _rd.parse();
//     }
//     const format = setting
//         ?.clientCapabilities
//         ?.textDocument
//         ?.completion
//         ?.completionItem
//         ?.documentationFormat;
//     if (format && format[0]) _documentionType = format[0];

//     const _targetOffset = _td.offsetAt(position);
//     const _lookahead = _td.getText(
//         Range.create(
//             position,
//             { line: position.line, character: position.character + 1 }
//         )
//     );
//     try {
//         const _import = _rd.imports.find(
//             v => v.position[0] <= _targetOffset && v.position[1] + 1 >= _targetOffset
//         );
//         if (_import) {
//             if (!_triggers.test(_lookahead)) {
//                 // let _prefix;
//                 const _result: CompletionItem[] = [];
//                 const _preText = _td.getText(
//                     Range.create(_td.positionAt(_import.position[0]), position)
//                 );
//                 const _chunks = exclusiveParse(_preText, /\s+/gd, undefined, false);
//                 const _reconf = _import.reconfigs?.find(v => v[0][1][1] + 1 === _targetOffset);
//                 if (_reconf) {
//                     const _prefix = getPrefix(_preText, _triggers);
//                     // for (let i = 0; i < _preText.length; i++) {
//                     //     if (_triggers.test(_preText[_preText.length - i - 1])) {
//                     //         _prefix = _preText[_preText.length - i - 1] + _prefix;
//                     //     }
//                     //     else break;
//                     // }
//                     if (!_prefix.includes(".") && _import.sequence?.dotrain) Object.entries(
//                         _import.sequence.dotrain.namespace
//                     ).forEach(v => {
//                         if (!("Element" in v[1])) _result.unshift({
//                             label: v[0],
//                             labelDetails: {
//                                 description: "namespace"
//                             },
//                             kind: CompletionItemKind.Field,
//                             detail: `namespace: ${v[0]}`,
//                             insertText: v[0]
//                         });
//                         else {
//                             if ("column" in v[1].Element) {
//                                 const _following = isNaN(v[1].Element.row as number)
//                                     ? "<>()" : "()";
//                                 _result.unshift({
//                                     label: v[0],
//                                     labelDetails: {
//                                         detail: _following,
//                                         description: "context alias opcode"
//                                     },
//                                     kind: CompletionItemKind.Function,
//                                     detail: "context alias opcode: " + v[0] + (
//                                         _following === "<>()"
//                                             ? `<>() with column index ${v[1].Element.column}`
//                                             : `() with column index ${
//                                                 v[1].Element.column
//                                             } and row index ${v[1].Element.row}`
//                                     ),
//                                     documentation: {
//                                         kind: _documentionType,
//                                         value: v[1].Element.description as string,
//                                     },
//                                     insertText: v[0] + _following
//                                 });
//                             }
//                             else if ("content" in v[1].Element) {
//                                 const _t = v[1].Element.elided !== undefined ? ["elided", v[1].Element.elided]
//                                     : v[1].Element.constant !== undefined ? ["constant", v[1].Element.constant]
//                                     : [
//                                         "expression",
//                                         _documentionType === "markdown" ? [
//                                             "```rainlang",
//                                             (v[1].Element.content as string).trim(),
//                                             "```"
//                                         ].join("\n")
//                                         : v[1].Element.content
//                                     ];
//                                 if (_t[0] === "expression") _result.unshift({
//                                     label: v[0],
//                                     labelDetails: {
//                                         description: "binding"
//                                     },
//                                     kind: CompletionItemKind.Class,
//                                     detail: _t[0] + " binding: " + v[0],
//                                     documentation: {
//                                         kind: _documentionType,
//                                         value: (_t[1] as string).trim()
//                                     },
//                                     insertText: v[0]
//                                 });
//                             }
//                         }
//                     });
//                     if (_import.sequence?.ctxmeta) _result.push(
//                         ..._import.sequence.ctxmeta.map(v => {
//                             const _following = isNaN(v.row) ? "<>()" : "()";
//                             return {
//                                 label: v.name,
//                                 labelDetails: {
//                                     detail: _following,
//                                     description: "context alias opcode"
//                                 },
//                                 kind: CompletionItemKind.Function,
//                                 detail: "context alias opcode: " + v.name + (
//                                     _following === "<>()"
//                                         ? `<>() with column index ${v.column}`
//                                         : `() with column index ${
//                                             v.column
//                                         } and row index ${v.row}`
//                                 ),
//                                 documentation: {
//                                     kind: _documentionType,
//                                     value: v.description as string,
//                                 },
//                                 insertText: v.name + _following
//                             };
//                         })
//                     );
//                     // _result = _result.filter(v => v.label.includes(_prefix));
//                 }
//                 else if (_chunks.length < 4) {
//                     let _lastChunk;
//                     if (_chunks.length === 1) _lastChunk = _chunks[0];
//                     else if (_chunks.length === 2) {
//                         if (/^0x[a-fA-F0-9]*$/.test(_chunks[0][0])) return null;
//                         _lastChunk = _chunks[1];
//                     }
//                     else if (_chunks.length === 3) {
//                         if (/^0x[a-fA-F0-9]*$/.test(_chunks[0][0])) return null;
//                         if (/^0x[a-fA-F0-9]*$/.test(_chunks[1][0])) return null;
//                         _lastChunk = _chunks[2];
//                     }
//                     else return null;

//                     if (_lastChunk[0].startsWith("@")) _lastChunk[0] = _lastChunk[0].slice(1);
//                     const _prefix = getPrefix(_preText, _triggersPath);
//                     // for (let i = 0; i < _preText.length; i++) {
//                     //     if (_triggersPath.test(_preText[_preText.length - i - 1])) {
//                     //         _prefix = _preText[_preText.length - i - 1] + _prefix;
//                     //     }
//                     //     else break;
//                     // }
//                     _result.push(
//                         ...Object.entries(
//                             _rd.metaStore.dotrainCache
//                         ).filter(
//                             v => v[0] !== _td.uri
//                         ).map(v => ({
//                             label: v[0],
//                             labelDetails: {
//                                 description: "rain document"
//                             },
//                             kind: CompletionItemKind.File,
//                             detail: `rain document at: ${v[0]}`,
//                             documentation: {
//                                 kind: _documentionType,
//                                 value: v[1]
//                             },
//                             insertText: v[1],
//                             textEdit: {
//                                 newText: v[1],
//                                 range: Range.create(
//                                     {
//                                         line: position.line,
//                                         character: position.character - _prefix.length
//                                     },
//                                     position
//                                 )
//                             }
//                         })).filter(v => v.label !== _rd.textDocument.uri)
//                     );
//                     if (/^0?x/.test(_lastChunk[0])) _result.push(
//                         ...Object.keys(_rd.metaStore.getCache()).map(v => ({
//                             label: v.slice(1),
//                             labelDetails: {
//                                 description: "meta"
//                             },
//                             kind: CompletionItemKind.Module,
//                             detail: `meta hash: ${v}`,
//                             insertText: v
//                         }))
//                     );
//                     return _result;
//                 }
//                 return _result;
//             }
//             return null;
//         }
//         else if (!_triggers.test(_lookahead)) {
//             const _preText = _td.getText(
//                 Range.create(Position.create(position.line, 0), position)
//             );
//             let _prefix = getPrefix(_preText, _triggers);
//             // for (let i = 0; i < _preText.length; i++) {
//             //     if (_triggers.test(_preText[_preText.length - i - 1])) {
//             //         _prefix = _preText[_preText.length - i - 1] + _prefix;
//             //     }
//             //     else break;
//             // }
//             const _isQuote = _prefix.startsWith("'");
//             if (_isQuote) _prefix = _prefix.slice(1);
//             if (/^'?(\.?[a-z][0-9a-z-]*)*\.?$/.test(_prefix)) {
//                 const _offset = _td.offsetAt(position);
//                 if (_prefix.includes(".")) {
//                     const _match = findNamespace(_prefix, _rd.namespace);
//                     if (_match !== undefined) return _match.map(v => {
//                         if (!("Element" in v[1])) return {
//                             label: v[0],
//                             labelDetails: {
//                                 description: "namespace"
//                             },
//                             kind: CompletionItemKind.Field,
//                             detail: `namespace: ${v[0]}`,
//                             insertText: v[0]
//                         };
//                         else {
//                             if ("column" in v[1].Element) {
//                                 const _following = isNaN(v[1].Element.row as number)
//                                     ? "<>()" : "()";
//                                 return {
//                                     label: v[0],
//                                     labelDetails: {
//                                         detail: _following,
//                                         description: "context alias opcode"
//                                     },
//                                     kind: CompletionItemKind.Function,
//                                     detail: "context alias opcode: " + v[0] + (
//                                         _following === "<>()"
//                                             ? `<>() with column index ${v[1].Element.column}`
//                                             : `() with column index ${
//                                                 v[1].Element.column
//                                             } and row index ${v[1].Element.row}`
//                                     ),
//                                     documentation: {
//                                         kind: _documentionType,
//                                         value: v[1].Element.description as string,
//                                     },
//                                     insertText: v[0] + _following
//                                 };
//                             }
//                             else if ("word" in v[1].Element) {
//                                 // const _following = v[1].Element.operand === 0
//                                 //     ? "()"
//                                 //     : (v[1].Element.operand as any).find(
//                                 //         (i: any) => i.name !== "inputs"
//                                 //     ) ? "<>()" : "()";
//                                 return {
//                                     label: v[0],
//                                     labelDetails: {
//                                         // detail: _following,
//                                         description: "opcode"
//                                     },
//                                     kind: CompletionItemKind.Function,
//                                     detail: "opcode: " + v[0],
//                                     documentation: {
//                                         kind: _documentionType,
//                                         value: v[1].Element.description as string
//                                     },
//                                     insertText: v[0]
//                                 };
//                             }
//                             else if ("content" in v[1].Element) {
//                                 const _t = v[1].Element.elided !== undefined ? ["elided", v[1].Element.elided]
//                                     : v[1].Element.constant !== undefined ? ["constant", v[1].Element.constant]
//                                     : [
//                                         "expression",
//                                         _documentionType === "markdown" ? [
//                                             "```rainlang",
//                                             (v[1].Element.content as string).trim(),
//                                             "```"
//                                         ].join("\n")
//                                         : v[1].Element.content
//                                     ];
//                                 return {
//                                     label: v[0],
//                                     labelDetails: {
//                                         description: "binding"
//                                     },
//                                     kind: CompletionItemKind.Class,
//                                     detail: _t[0] + " binding: " + v[0],
//                                     documentation: {
//                                         kind: _documentionType,
//                                         value: (_t[1] as string).trim()
//                                     },
//                                     insertText: v[0]
//                                 };
//                             }
//                             else return null;
//                         }
//                     }).filter(v => {
//                         if (v !== null) {
//                             if (_isQuote) {
//                                 if (v.kind === CompletionItemKind.Class) {
//                                     if (v.detail.includes("expression binding: ")) return true;
//                                     else return false;
//                                 }
//                                 else if (v.kind === CompletionItemKind.Field) return true;
//                                 else return false;
//                             }
//                             else return true;
//                         }
//                         else return false;
//                     }) as CompletionItem[];
//                     else return null;
//                 }
//                 else {
//                     const _result: CompletionItem[] = [];
//                     if (!_isQuote) {
//                         // .filter(
//                         //     v => v.word.includes(_prefix)
//                         // )
//                         _result.push(..._rd.authoringMeta.map(v => ({
//                             // const _following = v.operand === 0
//                             //     ? "()"
//                             //     : v.operand.find(i => i.name !== "inputs")
//                             //         ? "<>()"
//                             //         : "()";
//                             // if (v.aliases) v.aliases.forEach(e => {
//                             //     if (e.includes(_prefix)) _names.push(e);
//                             // });
//                             label: v.word,
//                             labelDetails: {
//                                 // detail: _following,
//                                 description: "opcode"
//                             },
//                             kind: CompletionItemKind.Function,
//                             detail: "opcode: " + v.word,
//                             documentation: {
//                                 kind: _documentionType,
//                                 value: v.description
//                             },
//                             insertText: v.word
//                         })));
//                         // .filter(
//                         //     v => v.includes(_prefix)
//                         // )
//                         Object.keys(RainDocument.CONSTANTS).forEach(v => _result.unshift({
//                             label: v,
//                             labelDetails: {
//                                 description: "reserved constant alias"
//                             },
//                             kind: CompletionItemKind.Constant,
//                             detail: "reserved constant alias: " + v,
//                             documentation: {
//                                 kind: _documentionType,
//                                 value: `value: ${RainDocument.CONSTANTS[v]}`
//                             },
//                             insertText: v
//                         }));
//                     }
//                     // .filter(
//                     //     v => v[0].includes(_prefix)
//                     // )
//                     Object.entries(_rd.namespace).forEach(v => {
//                         if (!("Element" in v[1])) {
//                             if (!_isQuote) _result.unshift({
//                                 label: v[0],
//                                 labelDetails: {
//                                     description: "namespace"
//                                 },
//                                 kind: CompletionItemKind.Field,
//                                 detail: `namespace: ${v[0]}`,
//                                 insertText: v[0]
//                             });
//                         }
//                         else {
//                             if ("column" in v[1].Element) {
//                                 if (!_isQuote) {
//                                     const _following = isNaN(v[1].Element.row as number)
//                                         ? "<>()" : "()";
//                                     _result.unshift({
//                                         label: v[0],
//                                         labelDetails: {
//                                             detail: _following,
//                                             description: "context alias opcode"
//                                         },
//                                         kind: CompletionItemKind.Function,
//                                         detail: "context alias opcode: " + v[0] + (
//                                             _following === "<>()"
//                                                 ? `<>() with column index ${v[1].Element.column}`
//                                                 : `() with column index ${
//                                                     v[1].Element.column
//                                                 } and row index ${v[1].Element.row}`
//                                         ),
//                                         documentation: {
//                                             kind: _documentionType,
//                                             value: v[1].Element.description as string,
//                                         },
//                                         insertText: v[0] + _following
//                                     });
//                                 }
//                             }
//                             else if ("word" in v[1].Element) {
//                                 if (!_isQuote) {
//                                     if (!_result.find(e => e.label === v[0])) {
//                                         // const _following = v[1].Element.operand === 0
//                                         //     ? "()"
//                                         //     : (v[1].Element.operand as any).find(
//                                         //         (i: any) => i.name !== "inputs"
//                                         //     ) ? "<>()" : "()";
//                                         _result.unshift({
//                                             label: v[0],
//                                             labelDetails: {
//                                                 // detail: _following,
//                                                 description: "opcode"
//                                             },
//                                             kind: CompletionItemKind.Function,
//                                             detail: "opcode: " + v[0],
//                                             documentation: {
//                                                 kind: _documentionType,
//                                                 value: v[1].Element.description as string
//                                             },
//                                             insertText: v[0]
//                                         });
//                                     }
//                                 }
//                             }
//                             else if ("content" in v[1].Element) {
//                                 const _t = v[1].Element.elided !== undefined ? ["elided", v[1].Element.elided]
//                                     : v[1].Element.constant !== undefined ? ["constant", v[1].Element.constant]
//                                     : [
//                                         "expression",
//                                         _documentionType === "markdown" ? [
//                                             "```rainlang",
//                                             (v[1].Element.content as string).trim(),
//                                             "```"
//                                         ].join("\n")
//                                         : v[1].Element.content
//                                     ];
//                                 if (!_isQuote || _t[0] === "expression") _result.unshift({
//                                     label: v[0],
//                                     labelDetails: {
//                                         description: "binding"
//                                     },
//                                     kind: CompletionItemKind.Class,
//                                     detail: _t[0] + " binding: " + v[0],
//                                     documentation: {
//                                         kind: _documentionType,
//                                         value: (_t[1] as string).trim()
//                                     },
//                                     insertText: v[0]
//                                 });
//                             }
//                         }
//                     });
//                     if (!_isQuote) {
//                         const _binding = _rd.bindings.find(
//                             v => v.contentPosition[0] <= _offset &&
//                             v.contentPosition[1] + 1 >= _offset
//                         );
//                         if (_binding) {
//                             const _src = _binding.exp?.ast.find(v =>
//                                 v.position[0] + _binding.contentPosition[0] <= _offset &&
//                                 v.position[1] + _binding.contentPosition[0] + 1 >= _offset
//                             );
//                             let _isAtRHS = true;
//                             const _offsetPos = _td.positionAt(_offset);
//                             if (_src) _result.unshift(
//                                 ..._src.lines.filter(v =>
//                                     v.position[1] + _binding.contentPosition[0] + 1 <= _offset
//                                 ).flatMap((v, i, a) => {
//                                     if (i === a.length - 1) _isAtRHS = _td.getText(
//                                         Range.create(
//                                             _td.positionAt(v.position[0]),
//                                             _offsetPos
//                                         )
//                                     ).includes(":");
//                                     return v.aliases;
//                                 }).filter(
//                                     v => _isAtRHS &&
//                                         v.name !== "_"
//                                         // v.name.includes(_prefix)
//                                 ).map(v => ({
//                                     label: v.name,
//                                     labelDetails: {
//                                         description: "stack alias"
//                                     },
//                                     kind: CompletionItemKind.Variable,
//                                     detail: "stack alias: " + v.name,
//                                     documentation: {
//                                         kind: _documentionType,
//                                         value: "stack alias"
//                                     },
//                                     insertText: v.name
//                                 }))
//                             );
//                         }
//                     }
//                     return _result;
//                 }
//             }
//             else return null;
//         }
//         else return null;
//     }
//     catch (err) {
//         console.log(err);
//         return null;
//     }
// }

// /**
//  * @internal Searches through given namespace for a given name
//  */
// function findNamespace(
//     name: string,
//     namespace: AST.Namespace
// ): [string, (AST.Namespace | AST.NamespaceNode)][] | undefined {
//     let _ns: any = namespace;
//     const _names = exclusiveParse(name, /\./gd, undefined, true);
//     if (name.startsWith(".")) _names.shift();
//     const _last = _names.pop();
//     if (!_names.every(v => WORD_PATTERN.test(v[0]))) return undefined;
//     if (_last?.[0] && !WORD_PATTERN.test(_last[0])) return undefined;
//     for (let i = 0; i < _names.length; i++) {
//         if (_ns[_names[i][0]]) {
//             _ns = _ns[_names[i][0]];
//         }
//         else return undefined;
//     }
//     const _result = Object.entries(_ns).filter(v => !/^[EIHW]/.test(v[0]) );
//     // if (_last?.[0]) _result = _result.filter(v => v[0].includes(_last[0]));
//     return _result as [string, (AST.Namespace | AST.NamespaceNode)][];
// }

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
            NamespaceItem::Node(_) => return None,
            NamespaceItem::Namespace(ns) => return Some(ns),
        }
    } else {
        return None;
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
