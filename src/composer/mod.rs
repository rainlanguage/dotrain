use regex::Regex;
use rain_meta::Store;
use std::{
    collections::VecDeque,
    sync::{Arc, RwLock},
};
use magic_string::{MagicString, OverwriteOptions, DecodedMap, GenerateDecodedMapOptions};
use super::{
    error::RainDocumentComposeError,
    types::{
        patterns::{WORD_PATTERN, NUMERIC_PATTERN},
        ast::{
            Offsets, Problem, Node, Namespace, NamespaceItem, NamespaceLeaf, Binding, BindingItem,
            NamespaceLeafElement, Import,
        },
    },
    parser::{RainlangDocument, RainDocument, exclusive_parse},
};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;

#[derive(Debug, PartialEq, Clone)]
struct ComposeTargetElement {
    name: String,
    name_position: Offsets,
    content: String,
    content_position: Offsets,
    position: Offsets,
    problems: Vec<Problem>,
    dependencies: Vec<String>,
    item: RainlangDocument,
}

#[derive(Debug, PartialEq, Clone)]
struct ComposeTarget {
    hash: String,
    import_index: isize,
    element: ComposeTargetElement,
}

impl ComposeTarget {
    fn create(leaf: &NamespaceLeaf, binding: &Binding, rainlang_doc: RainlangDocument) -> Self {
        ComposeTarget {
            hash: leaf.hash.clone(),
            import_index: leaf.import_index,
            element: ComposeTargetElement {
                name: binding.name.to_owned(),
                name_position: binding.name_position,
                content: binding.content.to_owned(),
                content_position: binding.content_position,
                position: binding.position,
                problems: binding.problems.clone(),
                dependencies: binding.dependencies.clone(),
                item: rainlang_doc,
            },
        }
    }
}

impl RainDocument {
    /// composes a given text as RainDocument into rainlang with remote meta search disabled for parsing
    pub fn compose_text(
        text: &str,
        entrypoints: &[&str],
        meta_store: Option<Arc<RwLock<Store>>>,
    ) -> Result<String, RainDocumentComposeError> {
        RainDocument::create(text.to_string(), meta_store).compose(entrypoints)
    }

    /// composes a given text as RainDocument into rainlang with remote meta search enabled for parsing
    pub async fn compose_text_async(
        text: &str,
        entrypoints: &[&str],
        meta_store: Option<Arc<RwLock<Store>>>,
    ) -> Result<String, RainDocumentComposeError> {
        RainDocument::create_async(text.to_string(), meta_store)
            .await
            .compose(entrypoints)
    }

    /// composes to rainlang text from the specified entrypoints
    pub fn compose(&self, entrypoints: &[&str]) -> Result<String, RainDocumentComposeError> {
        if entrypoints.is_empty() {
            return Err(RainDocumentComposeError::Reject(
                "no entrypoints specified".to_owned(),
            ));
        }
        if !self.problems.is_empty() {
            return Err(RainDocumentComposeError::Problems(self.problems.clone()));
        }

        let mut nodes: Vec<ComposeTarget> = vec![];

        // resolve the entrypoints, check their validity and put them at top of compose target list
        for entrypoint in entrypoints {
            match search_namespace(entrypoint, &self.namespace) {
                Ok((parent_node, leaf, binding)) => {
                    if !binding.problems.is_empty() {
                        return Err(RainDocumentComposeError::from_problems(
                            &binding.problems,
                            leaf.import_index,
                            &self.imports,
                        ));
                    } else {
                        let rainlang_doc = RainlangDocument::create(
                            binding.content.clone(),
                            parent_node,
                            self.authoring_meta.as_ref(),
                            self.ignore_undefined_words,
                        );
                        if !rainlang_doc.problems.is_empty() {
                            return Err(RainDocumentComposeError::from_problems(
                                &rainlang_doc.problems,
                                leaf.import_index,
                                &self.imports,
                            ));
                        } else {
                            nodes.push(ComposeTarget::create(leaf, binding, rainlang_doc));
                        }
                    }
                }
                Err(e) => {
                    return Err(RainDocumentComposeError::Reject(e));
                }
            }
        }

        // resolve deps of deps recursively and return the array of deps indexes that
        // will be used to replace with dep identifiers in the text
        let mut deps_indexes = self.resolve_deps(&mut nodes)?;

        // represents sourcemap details of each composing node
        let mut sourcemaps: Vec<(&ComposeTarget, &String, String, DecodedMap, usize)> = vec![];
        for node in &nodes {
            let generator = &mut MagicString::new(&node.element.content);
            if let Some(deps) = deps_indexes.pop_front().as_mut() {
                build_sourcemap(
                    node.element
                        .item
                        .ast
                        .iter()
                        .flat_map(|src| src.lines.iter().flat_map(|line| &line.nodes))
                        .collect::<Vec<_>>(),
                    generator,
                    deps,
                )
                .map_err(RainDocumentComposeError::Reject)?;
                let opts = GenerateDecodedMapOptions {
                    hires: true,
                    ..Default::default()
                };
                let offset = if sourcemaps.is_empty() {
                    0usize
                } else {
                    let last = &sourcemaps[sourcemaps.len() - 1];
                    last.4 + last.2.len() + 1
                };
                sourcemaps.push((
                    node,
                    &node.element.content,
                    generator.to_string(),
                    generator.generate_decoded_map(opts.clone()).or(Err(
                        RainDocumentComposeError::Reject("cannot build sourcemap".to_owned()),
                    ))?,
                    offset,
                ))
            } else {
                return Err(RainDocumentComposeError::Reject(
                    "cannot resolve dependecies".to_owned(),
                ));
            }
        }

        let rainlang_string = sourcemaps
            .iter()
            .map(|s| s.2.as_str())
            .collect::<Vec<_>>()
            .join("\n\n");
        Ok(rainlang_string)
    }

    /// resolves dependencies recuresively
    /// this means resolving deps of deps recursively as long as any of them have nested deps
    /// gathers all the deps into 'nodes' array for building the sourcemap and returns deps indexes
    /// which represent node indexes in the nodes array.
    /// this ensures that each composing node (being entrypoint or dep) will get its own array of dep
    /// indexes, for example [[], [2, 3], [], []],  will indicate that composing- node[0], node[2] and node[3]
    /// have no deps, node[1] has 2 deps with index 2 and 3 in order, so when first dependency is reached
    /// when building the sourcemap for node[1], it will be replaced with '2' and the next one with '3'
    fn resolve_deps(
        &self,
        nodes: &mut Vec<ComposeTarget>,
    ) -> Result<VecDeque<VecDeque<u8>>, RainDocumentComposeError> {
        let mut deps_indexes: VecDeque<VecDeque<u8>> = VecDeque::new();
        let mut len = nodes.len();
        let mut ignore_offset = 0;
        while len - ignore_offset > 0 {
            let mut deps_nodes = vec![];
            for node in nodes[ignore_offset..].iter() {
                let mut temp_deps_indexes = VecDeque::new();
                for dep in node.element.dependencies.iter() {
                    match search_namespace(dep, &self.namespace) {
                        Ok((parent_node, leaf, binding)) => {
                            if !binding.problems.is_empty() {
                                return Err(RainDocumentComposeError::from_problems(
                                    &binding.problems,
                                    leaf.import_index,
                                    &self.imports,
                                ));
                            } else {
                                let rainlang_doc = RainlangDocument::create(
                                    binding.content.clone(),
                                    parent_node,
                                    self.authoring_meta.as_ref(),
                                    self.ignore_undefined_words,
                                );
                                if !rainlang_doc.problems.is_empty() {
                                    return Err(RainDocumentComposeError::from_problems(
                                        &rainlang_doc.problems,
                                        leaf.import_index,
                                        &self.imports,
                                    ));
                                } else {
                                    let comp_target =
                                        ComposeTarget::create(leaf, binding, rainlang_doc);
                                    if let Some((index, _)) = &nodes
                                        .iter()
                                        .enumerate()
                                        .find(|(_, middle)| **middle == comp_target)
                                    {
                                        temp_deps_indexes.push_back(*index as u8);
                                    } else if let Some((index, _)) = &deps_nodes
                                        .iter()
                                        .enumerate()
                                        .find(|(_, middle)| **middle == comp_target)
                                    {
                                        temp_deps_indexes.push_back((nodes.len() + index) as u8);
                                    } else {
                                        temp_deps_indexes
                                            .push_back((nodes.len() + deps_nodes.len()) as u8);
                                        deps_nodes.push(comp_target);
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            return Err(RainDocumentComposeError::Reject(format!(
                                "dependency binding: {}",
                                e
                            )));
                        }
                    }
                }
                deps_indexes.push_back(temp_deps_indexes);
            }
            ignore_offset = nodes.len();
            nodes.extend(deps_nodes);
            len = nodes.len();
        }
        Ok(deps_indexes)
    }
}

/// Searchs in a Namespace for a given name
fn search_namespace<'a>(
    name: &str,
    namespace: &'a Namespace,
) -> Result<(&'a Namespace, &'a NamespaceLeaf, &'a Binding), String> {
    let mut segments = VecDeque::from(exclusive_parse(name, &Regex::new(r"\.").unwrap(), 0, true));
    if name.starts_with('.') {
        segments.pop_front();
    }
    if segments.len() > 32 {
        return Err("namespace too deep".to_owned());
    }
    if let Some(last) = segments.back() {
        if last.0.is_empty() {
            return Err("expected to end with a node".to_owned());
        }
    }
    if segments.iter().any(|v| !WORD_PATTERN.is_match(&v.0)) {
        return Err("invalid word pattern".to_owned());
    }

    if let Some(ns_item) = namespace.get(&segments[0].0) {
        let mut result = ns_item;
        let mut parent = namespace;
        for segment in segments.range(1..) {
            match result {
                NamespaceItem::Node(node) => {
                    if let Some(item) = node.get(&segment.0) {
                        parent = node;
                        result = item;
                    } else {
                        return Err(format!("undefined identifier: {}", name));
                    }
                }
                NamespaceItem::Leaf(_leaf) => {
                    return Err(format!("undefined identifier: {}", name));
                }
            }
        }
        match &result {
            NamespaceItem::Node(_) => Err(format!(
                "invalid entrypoint: {}, entrypoint must be bindings",
                name
            )),
            NamespaceItem::Leaf(leaf) => {
                if let NamespaceLeafElement::Binding(binding) = &leaf.element {
                    match &binding.item {
                        BindingItem::Elided(e) => {
                            Err(format!("elided entrypoint: {}, {}", name, e.msg))
                        }
                        BindingItem::Constant(_c) => Err(format!(
                            "invalid entrypoint: {}, constants cannot be entrypoint",
                            name
                        )),
                        BindingItem::Exp(_e) => Ok((parent, leaf, binding)),
                    }
                } else {
                    Err(format!(
                        "invalid entrypoint: {}, entrypoint must be bindings",
                        name
                    ))
                }
            }
        }
    } else {
        Err(format!("undefined identifier: {}", name))
    }
}

/// Builds sourcemaps for a given array of AST Nodes
fn build_sourcemap(
    nodes: Vec<&Node>,
    generator: &mut MagicString,
    deps_indexes: &mut VecDeque<u8>,
) -> Result<(), String> {
    for node in nodes {
        match node {
            Node::Literal(literal) => {
                if literal.id.is_some() {
                    generator
                        .overwrite(
                            literal.position[0] as i64,
                            literal.position[1] as i64,
                            &literal.value,
                            OverwriteOptions::default(),
                        )
                        .or(Err("could not build sourcemap".to_owned()))?;
                }
            }
            Node::Opcode(opcode) => {
                let quotes = if let Some(operand_args) = &opcode.operand_args {
                    operand_args
                        .args
                        .iter()
                        .filter(|v| !NUMERIC_PATTERN.is_match(&v.value))
                        .collect()
                } else {
                    vec![]
                };
                if !quotes.is_empty() {
                    if deps_indexes.is_empty() {
                        return Err("cannot resolve dependecies".to_owned());
                    }
                    for quote in quotes {
                        if let Some(di) = deps_indexes.pop_front() {
                            generator
                                .overwrite(
                                    quote.position[0] as i64,
                                    quote.position[1] as i64,
                                    &di.to_string(),
                                    OverwriteOptions::default(),
                                )
                                .or(Err("could not build sourcemap".to_owned()))?;
                        } else {
                            return Err("cannot resolve dependecies".to_owned());
                        }
                    }
                }
                if !opcode.inputs.is_empty() {
                    build_sourcemap(opcode.inputs.iter().collect(), generator, deps_indexes)?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

impl RainDocumentComposeError {
    fn from_problems(problems: &[Problem], import_index: isize, imports: &[Import]) -> Self {
        Self::Problems(
            problems
                .iter()
                .map(|p| Problem {
                    msg: p.msg.clone(),
                    code: p.code,
                    position: if import_index == -1 {
                        p.position
                    } else {
                        imports[import_index as usize].hash_position
                    },
                })
                .collect(),
        )
    }
}

#[cfg(test)]
mod tests {
    use crate::ErrorCode;

    use super::*;
    // use crate::parser::RainDocument;
    use rain_meta::{
        types::authoring::v1::{AuthoringMetaItem, AuthoringMeta},
        NPE2Deployer,
    };

    #[test]
    fn test_compose() -> anyhow::Result<()> {
        let mut store = rain_meta::Store::new();
        let authoring_meta = AuthoringMeta(vec![
            AuthoringMetaItem {
                word: "opcode-1".to_owned(),
                operand_parser_offset: 0,
                description: String::new(),
            },
            AuthoringMetaItem {
                word: "opcode-2".to_owned(),
                operand_parser_offset: 0,
                description: String::new(),
            },
        ]);
        let hash = "0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184";
        let hash_bytes = alloy_primitives::hex::decode(hash).unwrap();
        let npe2_deployer_mock = NPE2Deployer {
            meta_hash: "meta-hash".as_bytes().to_vec(),
            meta_bytes: "meta-bytes".as_bytes().to_vec(),
            bytecode: "bytecode".as_bytes().to_vec(),
            parser: "parser".as_bytes().to_vec(),
            store: "store".as_bytes().to_vec(),
            interpreter: "interpreter".as_bytes().to_vec(),
            authoring_meta: Some(authoring_meta.clone()),
        };
        store.set_deployer(&hash_bytes, &npe2_deployer_mock, None);
        let meta_store = Arc::new(RwLock::new(store));

        let text = r"some front matter
---
/** this is test */
@dispair 0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184

#exp-binding
_: opcode-1(0xabcd 456);
";
        let rainlang_text =
            RainDocument::compose_text(text, &["exp-binding"], Some(meta_store.clone()))?;
        let expected_rainlang = "_: opcode-1(0xabcd 456);";
        assert_eq!(rainlang_text, expected_rainlang);

        let text = r"some front matter
---
@0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184

#const-binding 4e18
#exp-binding
_: opcode-1(0xabcd 456),
some-name _: opcode-2(opcode-1(1 2) const-binding) 0xab34;
";
        let rainlang_text =
            RainDocument::compose_text(text, &["exp-binding"], Some(meta_store.clone()))?;
        let expected_rainlang = "_: opcode-1(0xabcd 456),
some-name _: opcode-2(opcode-1(1 2) 4e18) 0xab34;";
        assert_eq!(rainlang_text, expected_rainlang);

        let text = r"some front matter
---
@0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184

#some-value 4e18

/** this is test */
#exp-binding-1
_: opcode-1<'exp-binding-2>(0xabcd 456),
some-name _: 0xab34;

#exp-binding-2
_: opcode-2(0xabcd some-value);
";
        let rainlang_text =
            RainDocument::compose_text(text, &["exp-binding-1"], Some(meta_store.clone()))?;
        let expected_rainlang = "_: opcode-1<1>(0xabcd 456),
some-name _: 0xab34;

_: opcode-2(0xabcd 4e18);";
        assert_eq!(rainlang_text, expected_rainlang);

        let text = r"some front matter
---
@0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184

/** some comment */
#some-value 4e18

#exp-binding-1
_: opcode-1(0xabcd 456),
some-name _: 0xab34;

#exp-binding-2
_: opcode-2(0xabcd some-value);
";
        let rainlang_text = RainDocument::compose_text(
            text,
            &["exp-binding-1", "exp-binding-2"],
            Some(meta_store.clone()),
        )?;
        let expected_rainlang = "_: opcode-1(0xabcd 456),
some-name _: 0xab34;

_: opcode-2(0xabcd 4e18);";
        assert_eq!(rainlang_text, expected_rainlang);

        let text = r"some front matter
---
@0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184

#some-value 4e18
#some-other-value 0xabcdef1234

#exp-binding-1
_: opcode-1(0xabcd 456);

#exp-binding-2
_: opcode-1<'exp-binding-3>(0xabcd 456);

#exp-binding-3
some-name: opcode-2(0xabcd some-value),
_: opcode-2(some-name some-other-value);
";
        let rainlang_text = RainDocument::compose_text(
            text,
            &["exp-binding-1", "exp-binding-2"],
            Some(meta_store.clone()),
        )?;
        let expected_rainlang = "_: opcode-1(0xabcd 456);

_: opcode-1<2>(0xabcd 456);

some-name: opcode-2(0xabcd 4e18),
_: opcode-2(some-name 0xabcdef1234);";
        assert_eq!(rainlang_text, expected_rainlang);

        let text = r"some front matter
---
@dispair 0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184

#some-value 4e18
#some-other-value 0xabcdef12346

#exp-binding-1
_: opcode-1(0xabcd 456);

#exp-binding-2
_: opcode-1(0xabcd 456);
";
        let rainlang_text = RainDocument::compose_text(
            text,
            &["exp-binding-1", "exp-binding-2"],
            Some(meta_store.clone()),
        );
        let expected_problems = Err(RainDocumentComposeError::Problems(vec![
            ErrorCode::OddLenHex.to_problem(vec![], [134, 147]),
        ]));
        assert_eq!(rainlang_text, expected_problems);

        let text = r"some front matter
---
@dispair 0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184

#some-value 4e18

/** elided binding */
#elided ! this is elided

#exp-binding-1
_: opcode-1(0xabcd elided);
";
        let rainlang_text =
            RainDocument::compose_text(text, &["exp-binding-1"], Some(meta_store.clone()));
        let expected_problems = Err(RainDocumentComposeError::Problems(vec![
            ErrorCode::ElidedBinding.to_problem(vec!["this is elided"], [199, 205]),
        ]));
        assert_eq!(rainlang_text, expected_problems);

        let text = r"some front matter
---
@dispair 0x6518ec1930d8846b093dcff41a6ee6f6352c72b82e48584cce741a9e8a6d6184

#some-value 4e18

#exp-binding-1
_: opcode-1(0xabcd elided);
";
        let rainlang_text =
            RainDocument::compose_text(text, &["exp-binding"], Some(meta_store.clone()));
        let expected_problems = Err(RainDocumentComposeError::Reject(
            "undefined identifier: exp-binding".to_owned(),
        ));
        assert_eq!(rainlang_text, expected_problems);

        Ok(())
    }
}
