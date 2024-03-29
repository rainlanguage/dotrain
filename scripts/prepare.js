const fs = require("fs");

// create directories
fs.mkdirSync("./dist/cjs", { recursive: true });
fs.mkdirSync("./dist/esm", { recursive: true });

// encode wasm as base64 into a json that can be natively imported
// in js modules in order to avoid using fetch or fs operations
const wasmBytes = fs.readFileSync("./temp/node/dotrain_lsp_bg.wasm");
fs.writeFileSync(
    "./dist/wasm.json",
    JSON.stringify({ wasm: Buffer.from(wasmBytes, "binary").toString("base64") }),
);

// prepare the dts
let dts = fs.readFileSync("./temp/node/dotrain_lsp.d.ts", { encoding: "utf-8" });
dts = dts.replace(
    `/* tslint:disable */
/* eslint-disable */`,
    "",
);
dts = dts.replace(
    `import { SemanticTokensPartialResult } from "vscode-languageserver-protocol";
import { Hover, Position, MarkupKind, Diagnostic, CompletionItem, TextDocumentItem } from "vscode-languageserver-types";`,
    "",
);
dts =
    `/* this file is auto-generated, do not modify */
import { SemanticTokensPartialResult } from "vscode-languageserver-protocol";
import { Hover, Position, MarkupKind, Diagnostic, CompletionItem, TextDocumentItem } from "vscode-languageserver-types";
export * from "vscode-languageserver-types";
export * from "vscode-languageserver-protocol";

/**
 * Method to be used as Tagged Templates to activate embedded rainlang in
 * javascript/typescript in vscode that highlights the rainlang syntax.
 * Requires rainlang vscode extension to be installed.
 */
export declare function rainlang(stringChunks: TemplateStringsArray, ...vars: any[]): string;
` + dts;
dts = dts.replaceAll("Promise<any>", "Promise<Diagnostic[]>");
fs.writeFileSync("./dist/cjs/index.d.ts", dts);
fs.writeFileSync("./dist/esm/index.d.ts", dts);

// prepare cjs
let cjs = fs.readFileSync("./temp/node/dotrain_lsp.js", { encoding: "utf-8" });
cjs = cjs.replace(
    `const path = require('path').join(__dirname, 'dotrain_lsp_bg.wasm');
const bytes = require('fs').readFileSync(path);`,
    `
/**
 * Method to be used as Tagged Templates to activate embedded rainlang in
 * javascript/typescript in vscode that highlights the rainlang syntax.
 * Requires rainlang vscode extension to be installed.
 */
function rainlang(stringChunks, ...vars) {
    let result = "";
    for (let i = 0; i < stringChunks.length; i++) {
        result = result + stringChunks[i] + (vars[i] ?? "");
    }
    return result;
}
module.exports.rainlang = rainlang;

module.exports = {
    ...module.exports,
    ...require("vscode-languageserver-types"),
    ...require("vscode-languageserver-protocol"),
};

const { Buffer } = require('buffer');
const wasmB64 = require('../wasm.json');
const bytes = Buffer.from(wasmB64.wasm, 'base64');`,
);
cjs = cjs.replace("const { TextDecoder, TextEncoder } = require(`util`);", "");
cjs = "/* this file is auto-generated, do not modify */\n" + cjs;
fs.writeFileSync("./dist/cjs/index.js", cjs);

// prepare esm
let esm = fs.readFileSync("./temp/web/dotrain_lsp.js", { encoding: "utf-8" });
const index = esm.indexOf("function __wbg_init_memory(imports, maybe_memory)");
esm = esm.slice(0, index);
esm =
    "let imports = {};" +
    "\n" +
    esm +
    `
/**
 * Method to be used as Tagged Templates to activate embedded rainlang in
 * javascript/typescript in vscode that highlights the rainlang syntax.
 * Requires rainlang vscode extension to be installed.
 */
export function rainlang(stringChunks, ...vars) {
    let result = "";
    for (let i = 0; i < stringChunks.length; i++) {
        result = result + stringChunks[i] + (vars[i] ?? "");
    }
    return result;
}

imports = __wbg_get_imports();

export * from "vscode-languageserver-types";
export * from "vscode-languageserver-protocol";

import { Buffer } from 'buffer';
import wasmB64 from '../wasm.json';
const bytes = Buffer.from(wasmB64.wasm, 'base64');

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;`;
esm = esm.replaceAll("imports.wbg", "imports.__wbindgen_placeholder__");
esm = "/* this file is auto-generated, do not modify */\n" + esm;
fs.writeFileSync("./dist/esm/index.js", esm);

fs.writeFileSync("./cjs.js", '"use strict";\n\nmodule.exports = require("./dist/cjs/index");\n');
fs.writeFileSync("./cjs.d.ts", 'export * from "./dist/cjs/index";\n');
fs.writeFileSync("./esm.js", 'export * from "./dist/esm/index";\n');
fs.writeFileSync("./esm.d.ts", 'export * from "./dist/esm/index";\n');
