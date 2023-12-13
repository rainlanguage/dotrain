use lsp_types::{Position, MarkupKind, Hover, HoverContents, Range, MarkupContent};
use super::super::{
    types::ast::{Node, BindingItem},
    parser::{OffsetAt, PositionAt, raindocument::RainDocument},
};

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
                        return search(
                            e.ast
                                .iter()
                                .flat_map(|src| src.lines.iter().flat_map(|line| &line.nodes))
                                .collect::<Vec<_>>(),
                            b.content_position[0],
                            0,
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
                                            value: [arg.name.clone(), arg.description.clone()]
                                                .join("\n\n"),
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
                        value.push_str("Placeholder")
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

// export async function getHover(
//     document: RainDocument | TextDocument,
//     position: Position,
//     setting?: LanguageServiceParams
// ): Promise<Hover | null> {
//     let _contentType: MarkupKind = "plaintext";
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
//     if (format && format[0]) _contentType = format[0];

//     let _targetOffset = _td.offsetAt(position);
//     try {
//         const _hash = _rd.imports.find(
//             v => v.position[0] <= _targetOffset && v.position[1] >= _targetOffset
//         );
//         // const _index = _rd.getImports().findIndex(
//         //     v => v.position[0] <= _targetOffset && v.position[1] >= _targetOffset
//         // );
//         if (_hash && _hash.sequence && Object.keys(_hash.sequence).length) return {
//             range: Range.create(
//                 _td.positionAt(_hash.position[0]),
//                 _td.positionAt(_hash.position[1] + 1)
//             ),
//             contents: {
//                 kind: _contentType,
//                 value: `this import contains:${
//                     _hash.sequence.dispair ? "\n - DISPair" : ""
//                 }${
//                     _hash.sequence.ctxmeta ? "\n - ContractMeta" : ""
//                 }${
//                     _hash.sequence.dotrain ? "\n - RainDocument" : ""
//                 }`
//             }
//         };
//         else {
//             let _at = "";
//             const _binding = _rd.bindings.find(v => {
//                 if (v.namePosition[0] <= _targetOffset && v.namePosition[1] >= _targetOffset) {
//                     _at = "name";
//                     return true;
//                 }
//                 if (
//                     v.contentPosition[0] <= _targetOffset &&
//                     v.contentPosition[1] >= _targetOffset
//                 ) {
//                     _at = "content";
//                     return true;
//                 }
//                 return false;
//             });
//             if (_at) {
//                 if (_at === "content") {
//                     _targetOffset -= _binding!.contentPosition[0];
//                     return search(
//                         _binding!.exp?.ast.find(v =>
//                             v.position[0] <= _targetOffset &&
//                             v.position[1] >= _targetOffset
//                         )?.lines.flatMap(v => [...v.nodes, ...v.aliases]) ?? [],
//                         _binding!.contentPosition[0]
//                     );
//                 }
//                 else if (_at === "name") {
//                     const _type = _binding!.elided !== undefined ? "Elided " :
//                         _binding!.constant !== undefined ? "Constant " : "";
//                     return {
//                         range: Range.create(
//                             _td.positionAt(_binding!.namePosition[0]),
//                             _td.positionAt(_binding!.namePosition[1] + 1)
//                         ),
//                         contents: {
//                             kind: _contentType,
//                             value: _type + "Binding" + (_type ? " (cannot be referenced as entrypoint)" : "")
//                         }
//                     } as Hover;
//                 }
//                 else return null;
//             }
//             else return null;
//         }
//     }
//     catch (err) {
//         console.log(err);
//         return null;
//     }
// }

// const search = async(nodes: AST.Node[], offset: number): Promise<Hover | null> => {
//   for (let i = 0; i < nodes.length; i++) {
//       const _n = nodes[i];
//       if (
//           _n.position[0] <= _targetOffset &&
//           _n.position[1] >= _targetOffset
//       ) {
//           if ("opcode" in _n) {
//               if (
//                   _n.parens[0] < _targetOffset &&
//                   _n.parens[1] > _targetOffset
//               ) return search(_n.parameters, offset);
//               else {
//                   if (
//                       _n.operandArgs &&
//                       _n.operandArgs.position[0] < _targetOffset &&
//                       _n.operandArgs.position[1] > _targetOffset
//                   ) {
//                       for (const _operandArg of _n.operandArgs.args) {
//                           if (
//                               _operandArg.position[0] <= _targetOffset &&
//                               _operandArg.position[1] >= _targetOffset
//                           ) return {
//                               range: Range.create(
//                                   _td.positionAt(_operandArg.position[0] + offset),
//                                   _td.positionAt(_operandArg.position[1] + offset + 1)
//                               ),
//                               contents: {
//                                   kind: _contentType,
//                                   value: [
//                                       _operandArg.name,
//                                       ...(
//                                           _operandArg.description
//                                               ? [_operandArg.description]
//                                               : []
//                                       )
//                                   ].join(_contentType === "markdown" ? "\n\n" : ", ")
//                               }
//                           } as Hover;
//                       }
//                       return null;
//                   }
//                   else return {
//                       range: Range.create(
//                           _td.positionAt(_n.opcode.position[0] + offset),
//                           _td.positionAt(_n.parens[1] + offset + 1)
//                       ),
//                       contents: {
//                           kind: _contentType,
//                           value: _n.opcode.description
//                       }
//                   } as Hover;
//               }
//           }
//           else if ("value" in _n) {
//               return {
//                   range: Range.create(
//                       _td.positionAt(_n.position[0] + offset),
//                       _td.positionAt(_n.position[1] + offset + 1)
//                   ),
//                   contents: {
//                       kind: _contentType,
//                       value: _n.id ? _n.value : "Value"
//                   }
//               } as Hover;
//           }
//           else return {
//               range: Range.create(
//                   _td.positionAt(_n.position[0] + offset),
//                   _td.positionAt(_n.position[1] + offset + 1)
//               ),
//               contents: {
//                   kind: _contentType,
//                   value: "Stack Alias" + (_n.name === "_" ? " Placeholder" : "")
//               }
//           } as Hover;
//       }
//   }
//   return null;
// };
