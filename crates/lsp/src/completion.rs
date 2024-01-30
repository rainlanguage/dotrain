use regex::Regex;
use super::OffsetAt;
use once_cell::sync::Lazy;
use alloy_primitives::hex;
use std::collections::VecDeque;
use lsp_types::{
    Range, TextEdit, CompletionItem, Position, MarkupKind, Documentation, MarkupContent,
    CompletionItemLabelDetails, CompletionItemKind, Url, CompletionTextEdit,
};
use dotrain::{
    RainlangDocument, RainDocument, exclusive_parse,
    types::{
        ast::{Namespace, NamespaceItem, BindingItem, ParsedItem, Binding, ImportSequence},
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
    uri: &Url,
    position: Position,
    documentation_format: MarkupKind,
) -> Option<Vec<CompletionItem>> {
    let target_offset = rain_document.text().offset_at(&position);
    let lookahead = rain_document
        .text()
        .get(target_offset..target_offset + 1)
        .unwrap_or("");

    let mut result = VecDeque::new();
    if !TRIGGERS.is_match(lookahead) {
        if let Some(import) = rain_document
            .imports()
            .iter()
            .find(|v| v.position[0] <= target_offset && v.position[1] >= target_offset)
        {
            let pretext = rain_document
                .text()
                .get(import.position[0]..rain_document.text().offset_at(&position))?;
            let chunks = exclusive_parse(pretext, &WS_PATTERN, 0, false);
            if let Some(configurations) = &import.configuration {
                if configurations
                    .groups
                    .iter()
                    .any(|v| v.0 .1[1] == target_offset)
                {
                    let prefix = get_prefix(pretext, &TRIGGERS);
                    if let Some(ImportSequence {
                        dotrain: Some(raindoc),
                    }) = &import.sequence
                    {
                        if WORD_PATTERN.is_match(&prefix) {
                            result.extend(get_namespace_completions(
                                raindoc.namespace(),
                                documentation_format.clone(),
                            ));
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
                    if HEX_PATTERN.is_match(&chunks[0].0) || HEX_PATTERN.is_match(&chunks[1].0) {
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
                // completion items from local path with its equivelant hash that is stored in CAS
                {
                    rain_document
                        .store()
                        .read()
                        .unwrap()
                        .dotrain_cache()
                        .iter()
                        .for_each(|v| {
                            if uri.to_string() != *v.0 {
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
                                    text_edit: Some(CompletionTextEdit::Edit(TextEdit {
                                        new_text: hex::encode_prefixed(v.1),
                                        range: Range::new(
                                            Position {
                                                line: position.line,
                                                character: position.character
                                                    - _prefix.len() as u32,
                                            },
                                            position,
                                        ),
                                    })),
                                    ..Default::default()
                                })
                            }
                        })
                }
                // all cached meta hash in CAS
                if META_COMPLETION.is_match(&last.0) {
                    rain_document
                        .store()
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
                                ..Default::default()
                            })
                        })
                }
            }
            Some(Vec::from(result))
        } else {
            let pretext = rain_document.text().get(
                rain_document.text().offset_at(&Position {
                    line: position.line,
                    character: 0,
                })..rain_document.text().offset_at(&position),
            )?;
            let mut prefix = get_prefix(pretext, &TRIGGERS);
            let is_quote = prefix.starts_with('\'');
            if is_quote {
                prefix = prefix.split_at(1).1.to_owned();
            }
            if NAMESPACE_PATTERN.is_match(&prefix) {
                let offset = rain_document.text().offset_at(&position);
                if let Some(namespace_node) = search_namespace(&prefix, rain_document.namespace()) {
                    result.extend(get_namespace_completions(
                        namespace_node,
                        documentation_format.clone(),
                    ));
                }
                if !is_quote {
                    if let Some(am) = &rain_document.known_words() {
                        for v in &am.0 {
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
                                ..Default::default()
                            })
                        }
                    }
                    if let Some(binding) = rain_document
                        .bindings()
                        .iter()
                        .find(|v| v.content_position[0] <= offset && v.content_position[1] > offset)
                    {
                        if let BindingItem::Exp(rainlang_doc) = &binding.item {
                            result.extend(get_rainlang_src_alias_completions(
                                offset,
                                rainlang_doc,
                                binding,
                                rain_document.text(),
                                documentation_format.clone(),
                            ));
                        }
                    }
                }
                Some(Vec::from(result))
            } else {
                None
            }
        }
    } else {
        None
    }
}

/// Search in a Namespace for a given name
fn search_namespace<'a>(name: &str, namespace: &'a Namespace) -> Option<&'a Namespace> {
    let mut segments = VecDeque::from(exclusive_parse(name, &NAMESPACE_SEGMENT_PATTERN, 0, true));
    if name.starts_with('.') {
        segments.pop_front();
    }
    if segments.len() > 32 {
        return None;
    }
    match segments.pop_back() {
        Some(v) => {
            if !v.0.is_empty() && !WORD_PATTERN.is_match(&v.0) {
                return None;
            }
        }
        None => return None,
    };
    if segments.iter().any(|v| !WORD_PATTERN.is_match(&v.0)) {
        return None;
    }
    if !segments.is_empty() {
        if let Some(ns_item) = namespace.get(&segments[0].0) {
            let mut result = ns_item;
            for segment in segments.range(1..) {
                match result {
                    NamespaceItem::Node(node) => {
                        result = node.get(&segment.0)?;
                    }
                    NamespaceItem::Leaf(_leaf) => {
                        return None;
                    }
                }
            }
            match result {
                NamespaceItem::Leaf(_) => None,
                NamespaceItem::Node(node) => Some(node),
            }
        } else {
            None
        }
    } else {
        Some(namespace)
    }
}

/// Method to get the last set of chars that matches the given pattern
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

/// get the rainlang source's lhs aliases completions
fn get_rainlang_src_alias_completions(
    offset: usize,
    rainlang_doc: &RainlangDocument,
    binding: &Binding,
    dotrain_text: &str,
    documentation_format: MarkupKind,
) -> Vec<CompletionItem> {
    let mut result = vec![];
    if let Some(src) = rainlang_doc.ast().iter().find(|v| {
        v.position[0] + binding.content_position[0] <= offset
            && v.position[1] + binding.content_position[0] > offset
    }) {
        if let Some(last_line) = &src.lines.last() {
            if let Some(item_str) = dotrain_text.get(last_line.position[0]..offset) {
                if item_str.contains(':') {
                    for line in &src.lines {
                        if line.position[1] + binding.content_position[0] + 1 < offset {
                            for alias in &line.aliases {
                                if alias.name != "_" {
                                    result.push(CompletionItem {
                                        label: alias.name.clone(),
                                        label_details: Some(CompletionItemLabelDetails {
                                            description: Some("stack alias".to_owned()),
                                            detail: None,
                                        }),
                                        kind: Some(CompletionItemKind::VARIABLE),
                                        detail: Some(format!("stack alias: {}", alias.name)),
                                        insert_text: Some(alias.name.clone()),
                                        documentation: Some(Documentation::MarkupContent(
                                            MarkupContent {
                                                kind: documentation_format.clone(),
                                                value: "stack alias".to_owned(),
                                            },
                                        )),
                                        ..Default::default()
                                    })
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    result
}

// get completion items of a namespace root items
fn get_namespace_completions(
    namespace_node: &Namespace,
    documentation_format: MarkupKind,
) -> Vec<CompletionItem> {
    let mut result = vec![];
    for (key, ns_item) in namespace_node {
        match ns_item {
            NamespaceItem::Node(_node) => result.push(CompletionItem {
                label: key.clone(),
                label_details: Some(CompletionItemLabelDetails {
                    description: Some("namespace".to_owned()),
                    detail: None,
                }),
                kind: Some(CompletionItemKind::FIELD),
                detail: Some(format!("namespace: {}", key)),
                insert_text: Some(key.clone()),
                ..Default::default()
            }),
            NamespaceItem::Leaf(leaf) => match &leaf.element.item {
                BindingItem::Constant(c) => result.push(CompletionItem {
                    label: key.clone(),
                    label_details: Some(CompletionItemLabelDetails {
                        description: Some("binding".to_owned()),
                        detail: None,
                    }),
                    kind: Some(CompletionItemKind::CLASS),
                    detail: Some(format!("constant binding: {}", key)),
                    insert_text: Some(key.clone()),
                    documentation: Some(Documentation::MarkupContent(MarkupContent {
                        kind: documentation_format.clone(),
                        value: c.value.clone(),
                    })),
                    ..Default::default()
                }),
                BindingItem::Elided(e) => result.push(CompletionItem {
                    label: key.clone(),
                    label_details: Some(CompletionItemLabelDetails {
                        description: Some("binding".to_owned()),
                        detail: None,
                    }),
                    kind: Some(CompletionItemKind::CLASS),
                    detail: Some(format!("elided binding: {}", key)),
                    insert_text: Some(key.clone()),
                    documentation: Some(Documentation::MarkupContent(MarkupContent {
                        kind: documentation_format.clone(),
                        value: e.msg.clone(),
                    })),
                    ..Default::default()
                }),
                BindingItem::Exp(_e) => result.push(CompletionItem {
                    label: key.clone(),
                    label_details: Some(CompletionItemLabelDetails {
                        description: Some("binding".to_owned()),
                        detail: None,
                    }),
                    kind: Some(CompletionItemKind::CLASS),
                    detail: Some(format!("expression binding: {}", key)),
                    insert_text: Some(key.clone()),
                    documentation: Some(Documentation::MarkupContent(MarkupContent {
                        kind: documentation_format.clone(),
                        value: match documentation_format {
                            MarkupKind::Markdown => {
                                ["```rainlang", leaf.element.content.trim(), "```"]
                                    .join("\n")
                                    .to_string()
                            }
                            MarkupKind::PlainText => leaf.element.content.trim().to_string(),
                        },
                    })),
                    ..Default::default()
                }),
            },
        }
    }
    result
}
