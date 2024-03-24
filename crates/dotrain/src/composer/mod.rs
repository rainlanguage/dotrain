use rain_metadata::Store;
use std::{
    sync::{Arc, RwLock},
    collections::VecDeque,
};
use magic_string::{MagicString, OverwriteOptions, GenerateDecodedMapOptions};
use crate::types::ast::PragmaStatement;

use super::{
    error::{ComposeError, ErrorCode},
    parser::{RainlangDocument, RainDocument, exclusive_parse, Rebind},
    types::{
        patterns::{WORD_PATTERN, NAMESPACE_SEGMENT_PATTERN},
        ast::{
            Offsets, Problem, Node, Namespace, NamespaceItem, NamespaceLeaf, Binding, BindingItem,
            Import,
        },
    },
};

/// a composing target element
#[derive(Debug, PartialEq, Clone)]
pub(crate) struct ComposeTargetElement<'a> {
    pub(crate) name: &'a str,
    pub(crate) name_position: Offsets,
    pub(crate) content: &'a str,
    pub(crate) content_position: Offsets,
    pub(crate) position: Offsets,
    pub(crate) problems: &'a [Problem],
    pub(crate) item: RainlangDocument,
}

/// a composing target
#[derive(Debug, PartialEq, Clone)]
pub(crate) struct ComposeTarget<'a> {
    pub(crate) namespace_path: String,
    pub(crate) namespace: &'a Namespace,
    pub(crate) hash: &'a str,
    pub(crate) import_index: isize,
    pub(crate) element: ComposeTargetElement<'a>,
}

impl<'a> ComposeTarget<'a> {
    fn create(
        namespace_path: String,
        leaf: &'a NamespaceLeaf,
        binding: &'a Binding,
        rainlang_doc: RainlangDocument,
        namespace: &'a Namespace,
    ) -> Self {
        ComposeTarget {
            namespace_path,
            namespace,
            hash: &leaf.hash,
            import_index: leaf.import_index,
            element: ComposeTargetElement {
                name: &binding.name,
                name_position: binding.name_position,
                content: &binding.content,
                content_position: binding.content_position,
                position: binding.position,
                problems: &binding.problems,
                item: rainlang_doc,
            },
        }
    }

    fn build_name_comment(&self, index: usize) -> String {
        let header = "/* ".to_string() + &index.to_string() + ". ";
        if self.namespace_path.is_empty() {
            header + self.element.name + " */ \n"
        } else {
            header + &self.namespace_path + "." + self.element.name + " */ \n"
        }
    }
}

/// Type of a compsoing item details
#[derive(Debug, PartialEq, Clone)]
pub(crate) struct ComposeSourcemap<'a> {
    pub(crate) target: ComposeTarget<'a>,
    pub(crate) generated_string: String,
    pub(crate) mappings: Vec<Vec<Vec<i64>>>,
}

impl RainDocument {
    /// composes to rainlang text from the specified entrypoints
    pub fn compose(&self, entrypoints: &[&str]) -> Result<String, ComposeError> {
        let sourcemaps = self.build_targets_sourcemap(entrypoints)?;
        let rainlang_string = sourcemaps
            .iter()
            .map(|s| s.generated_string.as_str())
            .collect::<Vec<_>>()
            .join("\n\n");
        Ok(rainlang_string)
    }

    /// composes a given text as RainDocument into rainlang with remote meta search disabled for parsing
    pub fn compose_text(
        text: &str,
        entrypoints: &[&str],
        meta_store: Option<Arc<RwLock<Store>>>,
        rebinds: Option<Vec<Rebind>>,
    ) -> Result<String, ComposeError> {
        RainDocument::create(text.to_string(), meta_store, None, rebinds).compose(entrypoints)
    }

    /// composes a given text as RainDocument into rainlang with remote meta search enabled for parsing
    pub async fn compose_text_async(
        text: &str,
        entrypoints: &[&str],
        meta_store: Option<Arc<RwLock<Store>>>,
        rebinds: Option<Vec<Rebind>>,
    ) -> Result<String, ComposeError> {
        RainDocument::create_async(text.to_string(), meta_store, None, rebinds)
            .await
            .compose(entrypoints)
    }
}

impl RainDocument {
    /// builds composing targets sourcemaps
    pub(crate) fn build_targets_sourcemap(
        &self,
        entrypoints: &[&str],
    ) -> Result<Vec<ComposeSourcemap>, ComposeError> {
        if entrypoints.is_empty() {
            return Err(ComposeError::Reject("no entrypoints specified".to_owned()));
        }
        if !self.problems.is_empty() {
            return Err(ComposeError::Problems(self.problems.clone()));
        }

        let mut nodes: Vec<ComposeTarget> = vec![];

        // resolve the entrypoints, check their validity and put them at top of compose target list
        for entrypoint in entrypoints {
            match search_namespace(entrypoint, &self.namespace, "") {
                Ok((parent_namespace, leaf, binding, namespace_path)) => {
                    if !binding.problems.is_empty() {
                        return Err(ComposeError::from_problems(
                            &binding.problems,
                            leaf.import_index,
                            &self.imports,
                        ));
                    }
                    let rainlang_doc =
                        RainlangDocument::create(binding.content.clone(), parent_namespace, None);
                    if !rainlang_doc.problems.is_empty() {
                        return Err(ComposeError::from_problems(
                            &rainlang_doc.problems,
                            leaf.import_index,
                            &self.imports,
                        ));
                    }
                    nodes.push(ComposeTarget::create(
                        namespace_path,
                        leaf,
                        binding,
                        rainlang_doc,
                        parent_namespace,
                    ));
                }
                Err(e) => {
                    return Err(ComposeError::Reject(e));
                }
            }
        }

        // resolve deps of deps recursively and return the array of deps indexes that
        // will be used to replace with dep identifiers in the text
        let mut deps_indexes = self.resolve_deps(&mut nodes)?;

        // validate each node dep path
        for (index, _) in deps_indexes.iter().enumerate() {
            let chain = vec![index as u8];
            validate_dep_path(index, &deps_indexes, &chain).map_err(|_| {
                if nodes[index].import_index == -1 {
                    ComposeError::Problems(vec![ErrorCode::CircularDependency
                        .to_problem(vec![], nodes[index].element.name_position)])
                } else {
                    ComposeError::Problems(vec![ErrorCode::CircularDependency.to_problem(
                        vec![],
                        self.imports[nodes[index].import_index as usize].hash_position,
                    )])
                }
            })?;
        }

        // represents sourcemap details of each composing node
        let mut sourcemaps: Vec<ComposeSourcemap> = vec![];

        // sourcemap mappings generation options
        let mapping_opts = GenerateDecodedMapOptions {
            hires: true, // enabled high resolution, makes it easier to decode back
            ..Default::default()
        };

        // build composing sourcemap struct for each target node
        for (index, node) in nodes.iter().enumerate() {
            let generator = &mut MagicString::new(node.element.content);
            if let Some(deps) = deps_indexes.pop_front().as_mut() {
                // sourcemap binding name comment
                generator
                    .prepend(&node.build_name_comment(index))
                    .or(Err("could not build sourcemap".to_owned()))
                    .map_err(ComposeError::Reject)?;

                // sourcemap pragmas
                for PragmaStatement { sources, .. } in &node.element.item.pragmas {
                    for (source, literal) in sources {
                        if let Some(v) = literal {
                            generator
                                .overwrite(
                                    source.1[0] as i64,
                                    source.1[1] as i64,
                                    v,
                                    OverwriteOptions::default(),
                                )
                                .or(Err("could not build sourcemap".to_owned()))
                                .map_err(ComposeError::Reject)?;
                        }
                    }
                }
                build_sourcemap(
                    node.element
                        .item
                        .ast
                        .iter()
                        .flat_map(|src| src.lines.iter().flat_map(|line| &line.nodes)),
                    generator,
                    deps,
                )
                .map_err(ComposeError::Reject)?;

                sourcemaps.push(ComposeSourcemap {
                    target: node.clone(),
                    generated_string: generator.to_string(),
                    mappings: generator
                        .generate_decoded_map(mapping_opts.clone())
                        .or(Err(ComposeError::Reject(
                            "cannot build sourcemap".to_owned(),
                        )))?
                        .mappings,
                })
            } else {
                return Err(ComposeError::Reject(
                    "cannot resolve dependecies".to_owned(),
                ));
            }
        }
        Ok(sourcemaps)
    }

    /// resolves dependencies recuresively
    /// this means resolving deps of deps recursively as long as any of them have nested deps
    /// gathers all the deps into 'nodes' array for building the sourcemap and returns deps indexes
    /// which represent node indexes in the nodes array.
    /// this ensures that each composing node (being entrypoint or dep) will get its own array of dep
    /// indexes, for example [[], [2, 3], [], []],  will indicate that composing- node[0], node[2] and node[3]
    /// have no deps, node[1] has 2 deps with index 2 and 3 in order, so when first dependency is reached
    /// when building the sourcemap for node[1], it will be replaced with '2' and the next one with '3'
    fn resolve_deps<'a>(
        &'a self,
        nodes: &mut Vec<ComposeTarget<'a>>,
    ) -> Result<VecDeque<VecDeque<u8>>, ComposeError> {
        let mut deps_indexes: VecDeque<VecDeque<u8>> = VecDeque::new();
        let mut len = nodes.len();
        let mut ignore_offset = 0;
        while len - ignore_offset > 0 {
            let mut new_nested_nodes = vec![];
            for node in nodes[ignore_offset..].iter() {
                let mut this_node_deps_indexes = VecDeque::new();
                for dep in &node.element.item.dependencies {
                    match search_namespace(dep, node.namespace, &node.namespace_path) {
                        Ok((parent_node, leaf, binding, namespace_path)) => {
                            if !binding.problems.is_empty() {
                                return Err(ComposeError::from_problems(
                                    &binding.problems,
                                    leaf.import_index,
                                    &self.imports,
                                ));
                            }
                            let rainlang_doc = RainlangDocument::create(
                                binding.content.clone(),
                                parent_node,
                                None,
                            );
                            if !rainlang_doc.problems.is_empty() {
                                return Err(ComposeError::from_problems(
                                    &rainlang_doc.problems,
                                    leaf.import_index,
                                    &self.imports,
                                ));
                            }
                            // first search in composing nodes list to see if the current dep
                            // is already present and if so capture its index, if not repeat
                            // the same process with newly found nested nodes, if still not present
                            // add this target to the nodes and then capture its index
                            let new_compse_target = ComposeTarget::create(
                                namespace_path,
                                leaf,
                                binding,
                                rainlang_doc,
                                parent_node,
                            );
                            if let Some((index, _)) = &nodes
                                .iter()
                                .enumerate()
                                .find(|(_, found)| **found == new_compse_target)
                            {
                                this_node_deps_indexes.push_back(*index as u8);
                            } else if let Some((index, _)) = &new_nested_nodes
                                .iter()
                                .enumerate()
                                .find(|(_, found)| **found == new_compse_target)
                            {
                                this_node_deps_indexes.push_back((nodes.len() + index) as u8);
                            } else {
                                this_node_deps_indexes
                                    .push_back((nodes.len() + new_nested_nodes.len()) as u8);
                                new_nested_nodes.push(new_compse_target);
                            }
                        }
                        Err(e) => {
                            return Err(ComposeError::Reject(format!("dependency binding: {}", e)));
                        }
                    }
                }
                deps_indexes.push_back(this_node_deps_indexes);
            }
            ignore_offset = nodes.len();
            nodes.extend(new_nested_nodes);
            len = nodes.len();
        }
        Ok(deps_indexes)
    }
}

fn validate_dep_path(index: usize, deps: &VecDeque<VecDeque<u8>>, path: &[u8]) -> Result<(), ()> {
    for dep in &deps[index] {
        let mut current_path = path.to_vec();
        if current_path.contains(dep) {
            return Err(());
        }
        current_path.push(*dep);
        validate_dep_path(*dep as usize, deps, &current_path)?;
    }
    Ok(())
}

/// Searchs in a Namespace for a given name
fn search_namespace<'a>(
    name: &str,
    namespace: &'a Namespace,
    namepsapce_path: &str,
) -> Result<(&'a Namespace, &'a NamespaceLeaf, &'a Binding, String), String> {
    let mut segments = VecDeque::from(exclusive_parse(name, &NAMESPACE_SEGMENT_PATTERN, 0, true));
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
        let mut path_segments = vec![namepsapce_path.to_string()];
        path_segments.extend(segments.range(0..segments.len() - 1).map(|v| v.0.clone()));
        let new_ns_path = path_segments.join(".");
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
            NamespaceItem::Leaf(leaf) => match &leaf.element.item {
                BindingItem::Elided(e) => Err(format!("elided entrypoint: {}, {}", name, e.msg)),
                BindingItem::Literal(_c) => Err(format!(
                    "invalid entrypoint: {}, constants cannot be entrypoint",
                    name
                )),
                BindingItem::Exp(_e) => Ok((parent, leaf, &leaf.element, new_ns_path)),
                BindingItem::Quote(q) => search_namespace(&q.quote, namespace, namepsapce_path),
            },
        }
    } else {
        Err(format!("undefined identifier: {}", name))
    }
}

/// builds sourcemaps for a given array of AST Nodes recursively
fn build_sourcemap<'a>(
    nodes: impl Iterator<Item = &'a Node>,
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
                let args_details = if let Some(operand_args) = &opcode.operand_args {
                    operand_args
                        .args
                        .iter()
                        .filter_map(|v| {
                            v.binding_id
                                .as_ref()
                                .map(|(id, typ)| (v.value.as_deref(), id.as_str(), typ, v.position))
                        })
                        .collect()
                } else {
                    vec![]
                };
                if !args_details.is_empty() {
                    if deps_indexes.is_empty() && args_details.iter().any(|v| v.1.starts_with('\''))
                    {
                        return Err("cannot resolve dependecies".to_owned());
                    }
                    for arg in args_details {
                        if arg.1.starts_with('\'') || *arg.2 {
                            if let Some(dep_index) = deps_indexes.pop_front() {
                                generator
                                    .overwrite(
                                        arg.3[0] as i64,
                                        arg.3[1] as i64,
                                        &dep_index.to_string(),
                                        OverwriteOptions::default(),
                                    )
                                    .or(Err("could not build sourcemap".to_owned()))?;
                            } else {
                                return Err("cannot resolve dependecies".to_owned());
                            }
                        } else if let Some(val) = arg.0 {
                            generator
                                .overwrite(
                                    arg.3[0] as i64,
                                    arg.3[1] as i64,
                                    val,
                                    OverwriteOptions::default(),
                                )
                                .or(Err("could not build sourcemap".to_owned()))?;
                        } else {
                            return Err("cannot resolve dependecies".to_owned());
                        }
                    }
                }
                if !opcode.inputs.is_empty() {
                    build_sourcemap(opcode.inputs.iter(), generator, deps_indexes)?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

impl ComposeError {
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
    use super::*;
    use crate::error::ErrorCode;
    use crate::parser::Rebind;
    use futures::executor::block_on;
    use rain_metadata::{
        types::authoring::v1::{AuthoringMetaItem, AuthoringMeta},
        NPE2Deployer,
    };

    #[test]
    fn test_compose() -> anyhow::Result<()> {
        let mut store = rain_metadata::Store::new();
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

        let dotrain_text = r"
        some 
        front 
        matter
---
/* this is test */

#exp-binding
_: opcode-1(0xabcd 456);
";
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = "/* 0. exp-binding */ \n_: opcode-1(0xabcd 456);";
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"
        some 
        front 
        matter
---

#const-binding 4e18
#exp-binding
_: opcode-1(0xabcd 456),
some-name _: opcode-2(opcode-1(1 2) const-binding) 0xab34;
";
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = "/* 0. exp-binding */ 
_: opcode-1(0xabcd 456),
some-name _: opcode-2(opcode-1(1 2) 4e18) 0xab34;";
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"some front matter
---

#some-value 4e18

/** this is test */
#exp-binding-1
_: opcode-1<'exp-binding-2>(0xabcd 456),
some-name _: 0xab34;

#exp-binding-2
_: opcode-2(0xabcd some-value);
";
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = "/* 0. exp-binding-1 */ 
_: opcode-1<1>(0xabcd 456),
some-name _: 0xab34;

/* 1. exp-binding-2 */ 
_: opcode-2(0xabcd 4e18);";
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"
        some 
        front 
        matter
---

/** some comment */
#some-value 4e18

#exp-binding-1
_: opcode-1(0xabcd 456),
some-name _: 0xab34;

#exp-binding-2
_: opcode-2(0xabcd some-value);
";
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1", "exp-binding-2"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = "/* 0. exp-binding-1 */ 
_: opcode-1(0xabcd 456),
some-name _: 0xab34;

/* 1. exp-binding-2 */ 
_: opcode-2(0xabcd 4e18);";
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#main
_: opcode-1<'exp-binding-2>(0xabcd 456);

#exp-binding-1
_: opcode-1(0xabcd 456);

#exp-binding-2
_: opcode-1<'exp-binding-3>(0xabcd 456);

#exp-binding-3
some-name: opcode-2(0xabcd some-value),
_: opcode-2(some-name some-other-value);
";
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["main", "exp-binding-1", "exp-binding-2"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = "/* 0. main */ 
_: opcode-1<2>(0xabcd 456);

/* 1. exp-binding-1 */ 
_: opcode-1(0xabcd 456);

/* 2. exp-binding-2 */ 
_: opcode-1<3>(0xabcd 456);

/* 3. exp-binding-3 */ 
some-name: opcode-2(0xabcd 4e18),
_: opcode-2(some-name 0xabcdef1234);";
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#exp-binding-1
using-words-from 0x1234abced
_: some-sub-parser-word<1 2>(some-value some-other-value);
";
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = "/* 0. exp-binding-1 */ 
using-words-from 0x1234abced
_: some-sub-parser-word<1 2>(4e18 0xabcdef1234);";
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r#"---
#some-value 4e18
#literal-binding "some literal value"

#exp-binding-1
using-words-from 0x1234abced
abcd: " this is literal string ",
_: some-sub-parser-word<1 2>(some-value literal-binding);
"#;
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = r#"/* 0. exp-binding-1 */ 
using-words-from 0x1234abced
abcd: " this is literal string ",
_: some-sub-parser-word<1 2>(4e18 "some literal value");"#;
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r#"---
#some-value 4e18
#literal-binding "some literal value"

#exp-binding-1
using-words-from 0x1234abced
abcd: " this is literal string ",
_: some-sub-parser-word<some-value " some literal as operand " "test">(some-value literal-binding);
"#;
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = r#"/* 0. exp-binding-1 */ 
using-words-from 0x1234abced
abcd: " this is literal string ",
_: some-sub-parser-word<4e18 " some literal as operand " "test">(4e18 "some literal value");"#;
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r#"---
#some-value 4e18

#exp-binding-1
/* some comment with quote: dont't */
using-words-from 0x1234abced
_: [some-sub-parser 123 4 kjh],
_: "abcd",
_: [test],
_: some-sub-parser-word<1 2>(some-value 44);
"#;
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = r#"/* 0. exp-binding-1 */ 
/* some comment with quote: dont't */
using-words-from 0x1234abced
_: [some-sub-parser 123 4 kjh],
_: "abcd",
_: [test],
_: some-sub-parser-word<1 2>(4e18 44);"#;
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"some front matter
---
#some-value--- 4e18

/** below exp with front matter splitter syntax ---  */
#exp-binding-1---
/** some other comment with --- */
_: opcode-1(0xabcd some-value---);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1---"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = r"/* 0. exp-binding-1--- */ 
/** some other comment with --- */
_: opcode-1(0xabcd 4e18);";
        assert_eq!(result, expected_rainlang);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#main
_: opcode-3(0xabcd 456);

#exp-binding-1
_: opcode-1<exp-binding-2>(0xabcd 456);

#exp-binding-2 'exp-binding-3

#exp-binding-3
_: opcode-3(some-value some-other-value);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1", "main"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = r"/* 0. exp-binding-1 */ 
_: opcode-1<2>(0xabcd 456);

/* 1. main */ 
_: opcode-3(0xabcd 456);

/* 2. exp-binding-3 */ 
_: opcode-3(4e18 0xabcdef1234);";
        assert_eq!(result, expected_rainlang);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#main
_: opcode-3(0xabcd 456);

#exp-binding-1
_: opcode-1<'exp-binding-2>(0xabcd 456);

#exp-binding-2 'exp-binding-3

#exp-binding-3
_: opcode-3(some-value some-other-value);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1", "main"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = r"/* 0. exp-binding-1 */ 
_: opcode-1<2>(0xabcd 456);

/* 1. main */ 
_: opcode-3(0xabcd 456);

/* 2. exp-binding-3 */ 
_: opcode-3(4e18 0xabcdef1234);";
        assert_eq!(result, expected_rainlang);

        let dotrain_text = r"
        some 
        front 
        matter
---

#some-value 4e18
#some-other-value 0xabcdef12346

#exp-binding-1
_: opcode-1(0xabcd 456);

#exp-binding-2
_: opcode-1(0xabcd 456);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1", "exp-binding-2"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::OddLenHex.to_problem(vec![], [85, 98])
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r"some front matter
---

#some-value 4e18

/** elided binding */
#elided ! this is elided

#exp-binding-1
_: opcode-1(0xabcd elided);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::ElidedBinding.to_problem(vec!["elided", "this is elided"], [123, 129])
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r"some front matter
---

#some-value 4e18

#exp-binding-1
_: opcode-1(0xabcd elided);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Reject(
            "undefined identifier: exp-binding".to_owned(),
        ));
        assert_eq!(result, expected_err);

        let dotrain_text = r"
#some-value 4e18

#exp-binding-1
_: opcode-1(0xabcd elided);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::NoFrontMatterSplitter.to_problem(vec![], [0, 0]),
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r"
#some-value 4e18
/* some comment with --- */

#exp-binding-1
_: opcode-1(0xabcd elided);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::UnexpectedToken.to_problem(vec![], [43, 45])
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r"
#some-value 4e18

/** below exp with front matter splitter syntax */
#exp-binding-1---
_: opcode-1(0xabcd elided);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1---"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::UnexpectedToken.to_problem(vec![], [88, 90]),
            ErrorCode::UnexpectedToken.to_problem(vec![], [91, 106]),
            ErrorCode::UnexpectedToken.to_problem(vec![], [107, 115]),
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#main
_: opcode-3(0xabcd 456);

#exp-binding-1
_: opcode-1<'exp-binding-2>(0xabcd 456);

#exp-binding-2
_: opcode-1<'exp-binding-3>(0xabcd 456);

#exp-binding-3
some-name: opcode-2<'exp-binding-2>(0xabcd some-value),
_: opcode-2(some-name some-other-value);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1", "main"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::CircularDependency.to_problem(vec![], [86, 99])
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#main
_: opcode-3(0xabcd 456);

#exp-binding-1
_: opcode-1<exp-binding-2>(0xabcd 456);

#exp-binding-2 'exp-binding-3

#exp-binding-3 'exp-binding-2
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1", "main"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::CircularDependency.to_problem(vec![], [112, 125])
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#main
_: opcode-3(0xabcd 456);

#exp-binding-1
_: opcode-1<exp-binding-2>(0xabcd 456);

#exp-binding-2 'exp-binding-3

#exp-binding-3 'exp-binding-4

#exp-binding-4
_: opcode(1 2);
";
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1", "main"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::DeepQuote.to_problem(vec![], [112, 125])
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r#"---
#some-value 0x1234abcedf
#literal-binding "some literal value"

#exp-binding-1
using-words-from some-value " some string literal " "abcd"
abcd: " this is literal string ",
_: some-sub-parser-word<1 2>(4e18 literal-binding);
"#;
        let rainlang_text = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1"],
            Some(meta_store.clone()),
            None,
        )?;
        let expected_rainlang = r#"/* 0. exp-binding-1 */ 
using-words-from 0x1234abcedf " some string literal " "abcd"
abcd: " this is literal string ",
_: some-sub-parser-word<1 2>(4e18 "some literal value");"#;
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r#"---
#some-value 0x1234abcedf
#literal-binding "some literal value"

#exp-binding-1
using-words-from some-value
using-words-from " some string literal " extra
using-words-from "abcd"
abcd: " this is literal string ",
_: some-sub-parser-word<1 2>(4e18 literal-binding);
"#;
        let result = RainDocument::compose_text(
            dotrain_text,
            &["exp-binding-1", "main"],
            Some(meta_store.clone()),
            None,
        );
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::UndefinedIdentifier.to_problem(vec!["extra"], [152, 157]),
            ErrorCode::UnexpectedPragma.to_problem(vec![], [111, 157]),
            ErrorCode::UnexpectedPragma.to_problem(vec![], [158, 181]),
        ]));
        assert_eq!(result, expected_err);

        Ok(())
    }

    #[test]
    fn test_compose_with_rebinds() -> anyhow::Result<()> {
        let store = rain_metadata::Store::new();
        let meta_store = Arc::new(RwLock::new(store));

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#exp-binding-1
_: opcode-1(0xabcd 456);

#exp-binding-2
_: opcode-1<'exp-binding-3>(0xabcd 456);

#exp-binding-3
some-name: opcode-2(0xabcd some-value some-override-value),
_: opcode-2(some-name some-other-value);
";
        let mut rain_document =
            RainDocument::new(dotrain_text.to_owned(), Some(meta_store.clone()), 0, None);
        let rebinds = vec![Rebind("some-override-value".to_owned(), "567".to_owned())];
        block_on(rain_document.parse(false, Some(rebinds)));
        let rainlang_text = rain_document.compose(&["exp-binding-1", "exp-binding-2"])?;
        let expected_rainlang = "/* 0. exp-binding-1 */ 
_: opcode-1(0xabcd 456);

/* 1. exp-binding-2 */ 
_: opcode-1<2>(0xabcd 456);

/* 2. exp-binding-3 */ 
some-name: opcode-2(0xabcd 4e18 567),
_: opcode-2(some-name 0xabcdef1234);";
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#exp-binding-1
_: opcode-1(0xabcd 456);

#exp-binding-2
_: opcode-1<'exp-binding-3>(0xabcd 456);

#exp-binding-3
some-name: opcode-2(0xabcd some-value some-override-value),
_: opcode-2(some-name some-other-value);
";
        let mut rain_document =
            RainDocument::new(dotrain_text.to_owned(), Some(meta_store.clone()), 0, None);
        let rebinds = vec![
            Rebind("some-override-value".to_owned(), "567".to_owned()),
            Rebind("some-value".to_owned(), r#"0x123456"#.to_owned()),
        ];
        block_on(rain_document.parse(false, Some(rebinds)));
        let rainlang_text = rain_document.compose(&["exp-binding-1", "exp-binding-2"])?;
        let expected_rainlang = r#"/* 0. exp-binding-1 */ 
_: opcode-1(0xabcd 456);

/* 1. exp-binding-2 */ 
_: opcode-1<2>(0xabcd 456);

/* 2. exp-binding-3 */ 
some-name: opcode-2(0xabcd 0x123456 567),
_: opcode-2(some-name 0xabcdef1234);"#;
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#exp-binding-1
_: opcode-1(0xabcd 456);

#exp-binding-2
_: opcode-1<'exp-binding-3>(0xabcd 456);

#exp-binding-3
some-name: opcode-2(0xabcd some-value some-override-value),
_: opcode-2(some-name some-other-value);
";
        let mut rain_document =
            RainDocument::new(dotrain_text.to_owned(), Some(meta_store.clone()), 0, None);
        let rebinds = vec![
            Rebind("some-override-value".to_owned(), "567".to_owned()),
            Rebind("some-value".to_owned(), r#"0x123456"#.to_owned()),
            Rebind(
                "some-other-value".to_owned(),
                r#"" some new literal string ""#.to_owned(),
            ),
        ];
        block_on(rain_document.parse(false, Some(rebinds)));
        let rainlang_text = rain_document.compose(&["exp-binding-1", "exp-binding-2"])?;
        let expected_rainlang = r#"/* 0. exp-binding-1 */ 
_: opcode-1(0xabcd 456);

/* 1. exp-binding-2 */ 
_: opcode-1<2>(0xabcd 456);

/* 2. exp-binding-3 */ 
some-name: opcode-2(0xabcd 0x123456 567),
_: opcode-2(some-name " some new literal string ");"#;
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#exp-binding-1
_: opcode-1<exp-binding-2>(0xabcd 456);

#exp-binding-2 'exp-binding-3

#exp-binding-3
some-name: opcode-2(0xabcd some-value some-override-value),
_: opcode-2(some-name some-other-value);

#other-exp-binding
_: opcode(1 2);
";
        let mut rain_document =
            RainDocument::new(dotrain_text.to_owned(), Some(meta_store.clone()), 0, None);
        let rebinds = vec![
            Rebind("some-override-value".to_owned(), "567".to_owned()),
            Rebind("some-value".to_owned(), r#"0x123456"#.to_owned()),
            Rebind(
                "some-other-value".to_owned(),
                r#"" some new literal string ""#.to_owned(),
            ),
            Rebind(
                "exp-binding-2".to_owned(),
                r#"'other-exp-binding"#.to_owned(),
            ),
        ];
        block_on(rain_document.parse(false, Some(rebinds)));
        let rainlang_text = rain_document.compose(&["exp-binding-1"])?;
        let expected_rainlang = r#"/* 0. exp-binding-1 */ 
_: opcode-1<1>(0xabcd 456);

/* 1. other-exp-binding */ 
_: opcode(1 2);"#;
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r"---
#some-value 4e18
#some-other-value 0xabcdef1234

#exp-binding-1
_: opcode-1(0xabcd 456);
";
        let mut rain_document =
            RainDocument::new(dotrain_text.to_owned(), Some(meta_store.clone()), 0, None);
        let rebinds = vec![Rebind(
            "deep.some-override-value".to_owned(),
            "567".to_owned(),
        )];
        block_on(rain_document.parse(false, Some(rebinds)));
        let result = rain_document.compose(&["exp-binding-1"]);
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::InvalidSuppliedRebindings
                .to_problem(vec!["rebind too deep: deep.some-override-value"], [0, 0]),
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r"---
#exp-binding-1
_: opcode-1(0xabcd 456);
";
        let mut rain_document =
            RainDocument::new(dotrain_text.to_owned(), Some(meta_store.clone()), 0, None);
        let rebinds = vec![Rebind(
            "deep.some-quote-binding".to_owned(),
            "'some-quote".to_owned(),
        )];
        block_on(rain_document.parse(false, Some(rebinds)));
        let result = rain_document.compose(&["exp-binding-1"]);
        let expected_err = Err(ComposeError::Problems(vec![
            ErrorCode::InvalidSuppliedRebindings
                .to_problem(vec!["rebind too deep: deep.some-quote-binding"], [0, 0]),
        ]));
        assert_eq!(result, expected_err);

        let dotrain_text = r#"---
#a !some msg.
#b !some other msg.

#some-binding
  _: get(opcode-4(opcode-1() 1));

#some-other-binding
  :set(opcode-4(opcode-1() 1) 2);

#another-binding
  _: opcode-2(1 0 [something]);

#e1
  _: opcode-3(1 call<rebind-item>());

#e2
  :call<b>(2 1);
"#;
        let mut rain_document =
            RainDocument::new(dotrain_text.to_owned(), Some(meta_store.clone()), 0, None);
        let rebinds = vec![
            Rebind("a".to_owned(), "'some-binding".to_owned()),
            Rebind("b".to_owned(), "'some-other-binding".to_owned()),
            Rebind("rebind-item".to_owned(), "'another-binding".to_owned()),
        ];
        block_on(rain_document.parse(false, Some(rebinds)));
        let rainlang_text = rain_document.compose(&["e1", "e2"])?;
        let expected_rainlang = r#"/* 0. e1 */ 
_: opcode-3(1 call<2>());

/* 1. e2 */ 
:call<3>(2 1);

/* 2. another-binding */ 
_: opcode-2(1 0 [something]);

/* 3. some-other-binding */ 
:set(opcode-4(opcode-1() 1) 2);"#;
        assert_eq!(rainlang_text, expected_rainlang);

        let dotrain_text = r#"---
#some-binding
  _: opcode-2<0 b>(1 0 [something]);

#some-other-binding
  _: opcode-2<1 6>(1 0 [something]);
"#;
        let mut rain_document =
            RainDocument::new(dotrain_text.to_owned(), Some(meta_store.clone()), 0, None);
        let rebinds = vec![
            Rebind("a".to_owned(), "'b".to_owned()),
            Rebind("b".to_owned(), "'some-other-binding".to_owned()),
        ];
        block_on(rain_document.parse(false, Some(rebinds)));
        let rainlang_text = rain_document.compose(&["some-binding"])?;
        let expected_rainlang = "/* 0. some-binding */ 
_: opcode-2<0 1>(1 0 [something]);

/* 1. some-other-binding */ 
_: opcode-2<1 6>(1 0 [something]);";
        assert_eq!(rainlang_text, expected_rainlang);

        Ok(())
    }
}
