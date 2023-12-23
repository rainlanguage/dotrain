// #![allow(non_snake_case)]

use regex::Regex;
use self::evm_helpers::*;
use std::collections::VecDeque;
use serde::{Serialize, Deserialize};
use alloy_sol_types::{SolCall, SolInterface};
use rain_meta::{types::authoring::v1::AuthoringMeta, NPE2Deployer};
use self::INativeParser::{INativeParserErrors, parseCall, parseReturn};
use revm::{
    EVM,
    db::{CacheDB, EmptyDB},
    primitives::{Halt, ExecutionResult},
};
use magic_string::{MagicString, OverwriteOptions, DecodedMap, GenerateDecodedMapOptions};
use super::{
    types::{
        ExpressionConfig,
        patterns::{WORD_PATTERN, BINARY_PATTERN, HEX_PATTERN, NUMERIC_PATTERN},
        ast::{
            Offsets, Problem, Node, Namespace, NamespaceItem, NamespaceNode, Binding, BindingItem,
            NamespaceNodeElement,
        },
    },
    parser::{RainlangDocument, RainDocument, exclusive_parse, binary_to_int},
};

pub mod evm_helpers;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;
#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::*;

#[derive(Debug, PartialEq, Clone)]
struct CompilationTargetElement {
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
struct CompilationTargetItem {
    hash: String,
    import_index: isize,
    element: CompilationTargetElement,
}

/// Returned by RainDocument compilation if it failed
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub enum RainDocumentCompileError {
    Reject(String),
    Problems(Vec<Problem>),
    Revert(
        #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(type = "any"))]
        INativeParserErrors,
    ),
    Halt(#[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(type = "any"))] Halt),
}

#[cfg(any(feature = "js-api", target_family = "wasm"))]
impl From<RainDocumentCompileError> for JsValue {
    fn from(value: RainDocumentCompileError) -> Self {
        serde_wasm_bindgen::to_value(&value).unwrap_or(JsValue::NULL)
    }
}

/// Result of parsing a text with NativeParser
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub enum ParseResult {
    Success(ExpressionConfig),
    Revert(
        #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(type = "any"))]
        INativeParserErrors,
    ),
    Halt(#[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(type = "any"))] Halt),
}

#[cfg(any(feature = "js-api", target_family = "wasm"))]
impl From<ParseResult> for JsValue {
    fn from(value: ParseResult) -> Self {
        serde_wasm_bindgen::to_value(&value).unwrap_or(JsValue::NULL)
    }
}

impl TryFrom<ExecutionResult> for ParseResult {
    type Error = anyhow::Error;
    fn try_from(value: ExecutionResult) -> Result<Self, Self::Error> {
        match value {
            ExecutionResult::Success { output, .. } => Ok(ParseResult::Success(
                parseCall::abi_decode_returns(output.data(), true)
                    .map_err(anyhow::Error::from)?
                    .into(),
            )),
            ExecutionResult::Revert { output, .. } => Ok(ParseResult::Revert(
                INativeParserErrors::abi_decode(&output.0, true)
                    .or(Err(anyhow::anyhow!("unknown revert error")))?,
            )),
            ExecutionResult::Halt { reason, .. } => Ok(ParseResult::Halt(reason)),
        }
    }
}

impl RainlangDocument {
    /// Compiles this instance's text by the given NativeParser bytecode
    pub fn compile(
        &self,
        npe2_deployer: &NPE2Deployer,
        evm: Option<&mut EVM<CacheDB<EmptyDB>>>,
    ) -> anyhow::Result<ParseResult> {
        npe2_parse(&self.text, npe2_deployer, evm)
    }
}

impl RainDocument {
    /// Compiles to ExpressionConfig after building a rainlang text from the specified
    /// entrypoints by building sourcemap
    pub fn compile(
        &self,
        entrypoints: &[String],
        evm: Option<&mut EVM<CacheDB<EmptyDB>>>,
    ) -> Result<ExpressionConfig, RainDocumentCompileError> {
        if entrypoints.len() == 0 {
            return Err(RainDocumentCompileError::Reject(
                "no entrypoints specified".to_owned(),
            ));
        }
        if self.problems.len() > 0 {
            return Err(RainDocumentCompileError::Problems(self.problems.clone()));
        }

        let mut nodes: Vec<CompilationTargetItem> = vec![];
        let binding_am = AuthoringMeta(vec![]);

        for ep in entrypoints.iter() {
            match search_namespace(ep, &self.namespace) {
                Ok((ns, node, b)) => {
                    if b.problems.len() > 0 {
                        return Err(RainDocumentCompileError::Problems(
                            b.problems
                                .iter()
                                .map(|p| Problem {
                                    msg: p.msg.clone(),
                                    code: p.code,
                                    position: if node.import_index == -1 {
                                        p.position
                                    } else {
                                        self.imports[node.import_index as usize].hash_position
                                    },
                                })
                                .collect(),
                        ));
                    } else {
                        let rl = RainlangDocument::create(
                            b.content.clone(),
                            if let Some(am) = &self.authoring_meta {
                                Some(am)
                            } else {
                                if self.ignore_undefined_words {
                                    None
                                } else {
                                    Some(&binding_am)
                                }
                            },
                            Some(ns),
                        );
                        if rl.problems.len() > 0 {
                            return Err(RainDocumentCompileError::Problems(
                                rl.problems
                                    .iter()
                                    .map(|p| Problem {
                                        msg: p.msg.clone(),
                                        code: p.code,
                                        position: if node.import_index == -1 {
                                            p.position
                                        } else {
                                            self.imports[node.import_index as usize].hash_position
                                        },
                                    })
                                    .collect(),
                            ));
                        } else {
                            nodes.push(CompilationTargetItem {
                                hash: node.hash.clone(),
                                import_index: node.import_index,
                                element: CompilationTargetElement {
                                    name: b.name.to_owned(),
                                    name_position: b.name_position,
                                    content: b.content.to_owned(),
                                    content_position: b.content_position,
                                    position: b.position,
                                    problems: b.problems.clone(),
                                    dependencies: b.dependencies.clone(),
                                    item: rl,
                                },
                            });
                        }
                    }
                }
                Err(e) => {
                    return Err(RainDocumentCompileError::Reject(e));
                }
            }
        }

        let mut deps_indexes: VecDeque<VecDeque<u8>> = VecDeque::new();
        let mut deps_nodes = vec![];
        for node in nodes.iter() {
            let mut d = VecDeque::new();
            for dep in node.element.dependencies.iter() {
                match search_namespace(dep, &self.namespace) {
                    Ok((ns, node, b)) => {
                        if b.problems.len() > 0 {
                            return Err(RainDocumentCompileError::Problems(
                                b.problems
                                    .iter()
                                    .map(|p| Problem {
                                        msg: p.msg.clone(),
                                        code: p.code,
                                        position: if node.import_index == -1 {
                                            p.position
                                        } else {
                                            self.imports[node.import_index as usize].hash_position
                                        },
                                    })
                                    .collect(),
                            ));
                        } else {
                            let rl = RainlangDocument::create(
                                b.content.clone(),
                                if let Some(am) = &self.authoring_meta {
                                    Some(am)
                                } else {
                                    if self.ignore_undefined_words {
                                        None
                                    } else {
                                        Some(&binding_am)
                                    }
                                },
                                Some(ns),
                            );
                            if rl.problems.len() > 0 {
                                return Err(RainDocumentCompileError::Problems(
                                    rl.problems
                                        .iter()
                                        .map(|p| Problem {
                                            msg: p.msg.clone(),
                                            code: p.code,
                                            position: if node.import_index == -1 {
                                                p.position
                                            } else {
                                                self.imports[node.import_index as usize]
                                                    .hash_position
                                            },
                                        })
                                        .collect(),
                                ));
                            } else {
                                let m = CompilationTargetItem {
                                    hash: node.hash.clone(),
                                    import_index: node.import_index,
                                    element: CompilationTargetElement {
                                        name: b.name.to_owned(),
                                        name_position: b.name_position,
                                        content: b.content.to_owned(),
                                        content_position: b.content_position,
                                        position: b.position,
                                        problems: b.problems.clone(),
                                        dependencies: b.dependencies.clone(),
                                        item: rl,
                                    },
                                };
                                if let Some((index, _)) =
                                    &nodes.iter().enumerate().find(|(_, middle)| **middle == m)
                                {
                                    d.push_back(*index as u8);
                                } else {
                                    if let Some((index, _)) = &deps_nodes
                                        .iter()
                                        .enumerate()
                                        .find(|(_, middle)| **middle == m)
                                    {
                                        d.push_back((nodes.len() + index) as u8);
                                    } else {
                                        d.push_back((nodes.len() + deps_nodes.len()) as u8);
                                        deps_nodes.push(m);
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        return Err(RainDocumentCompileError::Reject(format!(
                            "dependency binding: {}",
                            e
                        )));
                    }
                }
            }
            deps_indexes.push_back(d);
        }
        nodes.extend(deps_nodes);

        let mut sourcemaps: Vec<(&CompilationTargetItem, &String, String, DecodedMap, usize)> =
            vec![];

        for n in &nodes {
            let generator = &mut MagicString::new(&n.element.content);
            if let Some(deps) = deps_indexes.front_mut() {
                build_sourcemap(
                    n.element
                        .item
                        .ast
                        .iter()
                        .flat_map(|src| src.lines.iter().flat_map(|line| &line.nodes))
                        .collect::<Vec<_>>(),
                    generator,
                    deps,
                )
                .map_err(|e| RainDocumentCompileError::Reject(e))?;
                let mut opts = GenerateDecodedMapOptions::default();
                opts.hires = true;
                let offset = if sourcemaps.is_empty() {
                    0usize
                } else {
                    let last = &sourcemaps[sourcemaps.len() - 1];
                    last.4 + last.2.len() + 1
                };
                sourcemaps.push((
                    n,
                    &n.element.content,
                    generator.to_string(),
                    generator.generate_decoded_map(opts).or(Err(
                        RainDocumentCompileError::Reject("cannot build sourcemap".to_owned()),
                    ))?,
                    offset,
                ))
            } else {
                return Err(RainDocumentCompileError::Reject(
                    "cannot resolve dependecies".to_owned(),
                ));
            }
        }

        let rl_string: String = sourcemaps
            .iter()
            .map(|s| {
                let mut source = s.2.clone();
                source.push('\n');
                source
            })
            .collect();

        let generated_rainlang = RainlangDocument::create(
            rl_string,
            if let Some(am) = &self.authoring_meta {
                Some(am)
            } else {
                if self.ignore_undefined_words {
                    None
                } else {
                    Some(&binding_am)
                }
            },
            None,
        );

        match generated_rainlang.compile(&self.deployer, evm) {
            Err(e) => Err(RainDocumentCompileError::Reject(e.to_string())),
            Ok(v) => match v {
                ParseResult::Success(exp_conf) => Ok(exp_conf),
                ParseResult::Revert(r) => Err(RainDocumentCompileError::Revert(r)),
                ParseResult::Halt(h) => Err(RainDocumentCompileError::Halt(h)),
            },
        }
    }
}

/// Searchs in a Namespace for a given name
fn search_namespace<'a>(
    name: &str,
    namespace: &'a Namespace,
) -> Result<(&'a Namespace, &'a NamespaceNode, &'a Binding), String> {
    let mut names = VecDeque::from(exclusive_parse(name, &Regex::new(r"\.").unwrap(), 0, true));
    if name.starts_with('.') {
        names.pop_front();
    }
    if names.len() > 32 {
        return Err("namespace too deep".to_owned());
    }
    if let Some(last) = names.back() {
        if last.0.is_empty() {
            return Err("expected to end with a node".to_owned());
        }
    }
    if names.iter().any(|v| !WORD_PATTERN.is_match(&v.0)) {
        return Err("invalid word pattern".to_owned());
    }
    // let len = names.len();
    if let Some(ns_item) = namespace.get(&names[0].0) {
        let mut result = ns_item;
        let mut parent = namespace;
        for n in names.range(1..) {
            match result {
                NamespaceItem::Namespace(ns) => {
                    if let Some(item) = ns.get(&n.0) {
                        parent = ns;
                        result = item;
                    } else {
                        return Err(format!("undefined identifier: {}", name));
                    }
                }
                NamespaceItem::Node(_node) => {
                    return Err(format!("undefined identifier: {}", name));
                }
            }
        }
        match &result {
            NamespaceItem::Namespace(_) => {
                return Err(format!(
                    "invalid entrypoint: {}, entrypoint must be bindings",
                    name
                ));
            }
            NamespaceItem::Node(node) => {
                if let NamespaceNodeElement::Binding(b) = &node.element {
                    match &b.item {
                        BindingItem::Elided(e) => {
                            return Err(format!("elided entrypoint: {}, {}", name, e.msg));
                        }
                        BindingItem::Constant(_c) => {
                            return Err(format!(
                                "invalid entrypoint: {}, constants cannot be entrypoint",
                                name
                            ));
                        }
                        BindingItem::Exp(_e) => return Ok((parent, node, b)),
                    }
                } else {
                    return Err(format!(
                        "invalid entrypoint: {}, entrypoint must be bindings",
                        name
                    ));
                }
            }
        }
    } else {
        return Err(format!("undefined identifier: {}", name));
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
            Node::Value(v) => {
                if BINARY_PATTERN.is_match(&v.value) {
                    generator
                        .overwrite(
                            v.position[0] as i64,
                            v.position[1] as i64,
                            &binary_to_int(&v.value),
                            OverwriteOptions::default(),
                        )
                        .or(Err("could not build sourcemap".to_owned()))?;
                } else if HEX_PATTERN.is_match(&v.value) {
                    if v.value.len() % 2 == 1 {
                        generator
                            .overwrite(
                                v.position[0] as i64,
                                v.position[1] as i64,
                                &("0x0".to_owned() + &v.value[2..]),
                                OverwriteOptions::default(),
                            )
                            .or(Err("could not build sourcemap".to_owned()))?;
                    } else if v.id.is_some() {
                        generator
                            .overwrite(
                                v.position[0] as i64,
                                v.position[1] as i64,
                                &v.value,
                                OverwriteOptions::default(),
                            )
                            .or(Err("could not build sourcemap".to_owned()))?;
                    }
                } else if v.id.is_some() {
                    generator
                        .overwrite(
                            v.position[0] as i64,
                            v.position[1] as i64,
                            &v.value,
                            OverwriteOptions::default(),
                        )
                        .or(Err("could not build sourcemap".to_owned()))?;
                }
            }
            Node::Opcode(o) => {
                let quotes = if let Some(operand_args) = &o.operand_args {
                    operand_args
                        .args
                        .iter()
                        .filter(|v| !NUMERIC_PATTERN.is_match(&v.value))
                        .collect()
                } else {
                    vec![]
                };
                if let Some((col, row_opt)) = o.is_ctx {
                    generator
                        .overwrite(
                            o.opcode.position[0] as i64,
                            o.opcode.position[1] as i64,
                            "context",
                            OverwriteOptions::default(),
                        )
                        .or(Err("could not build sourcemap".to_owned()))?;

                    if o.operand_args.is_some() {
                        if row_opt.is_none() {
                            let mut s = col.to_string();
                            s.push(' ');
                            match generator.append_left((o.opcode.position[1] + 1) as u32, &s) {
                                Ok(_g) => {}
                                Err(_g) => Err("could not build sourcemap".to_owned())?,
                            }
                            // generator.append_left(
                            //     (o.opcode.position[1] + 1) as u32,
                            //     &s
                            // ).or(Err("could not build sourcemap".to_owned()))?;
                        }
                    } else {
                        if let Some(row) = row_opt {
                            let mut s = "<".to_owned();
                            s.extend([
                                col.to_string().as_str(),
                                " ",
                                row.to_string().as_str(),
                                ">",
                            ]);
                            generator
                                .append_left((o.opcode.position[1]) as u32, &s)
                                .or(Err("could not build sourcemap".to_owned()))?;
                        }
                    }
                }
                // else if o.opcode.name.contains('.') {
                //     let last_segement = o.opcode.name.split('.').last().unwrap();
                //     println!("bad8");
                //     generator.overwrite(
                //         o.opcode.position[0] as i64,
                //         o.opcode.position[1] as i64,
                //         last_segement,
                //         OverwriteOptions::default()
                //     ).or(Err("could not build sourcemap".to_owned()))?;
                // }

                if quotes.len() > 0 {
                    if deps_indexes.is_empty() {
                        return Err("cannot resolve dependecies".to_owned());
                    }
                    for q in quotes {
                        if let Some(di) = deps_indexes.pop_front() {
                            generator
                                .overwrite(
                                    q.position[0] as i64,
                                    q.position[1] as i64,
                                    &di.to_string(),
                                    OverwriteOptions::default(),
                                )
                                .or(Err("could not build sourcemap".to_owned()))?;
                        } else {
                            return Err("cannot resolve dependecies".to_owned());
                        }
                    }
                }
                if !o.parameters.is_empty() {
                    build_sourcemap(
                        o.parameters.iter().map(|p| p).collect(),
                        generator,
                        deps_indexes,
                    )?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

impl From<parseReturn> for ExpressionConfig {
    fn from(value: parseReturn) -> Self {
        ExpressionConfig {
            bytecode: value._0,
            constants: value._1,
        }
    }
}
