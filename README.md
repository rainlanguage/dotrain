![](https://raw.githubusercontent.com/rainlanguage/rain.brand/main/Rainlang%20lockup%20light.svg)

# **Rain Language Composer and LSP**
The Rain language server protocol ([LSP](https://microsoft.github.io/language-server-protocol/)) services implementation (language services) and .rain composer written in rust and made available for NodeJs and broswers through [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/) in Typescript/Javascript which makes it well suited for editors and IDEs (as it is used in Rainlang vscode and codemirror language extension).
- Dotrain specs can be found [here](https://github.com/rainlanguage/specs/blob/main/dotrain.md)
- Rainlang specs can be found [here](https://github.com/rainlanguage/specs/blob/main/rainlang.md)
- Dotrain has been implemented for vscode and codemirror, see [rainlang-vscode](https://github.com/rainlanguage/rainlang-vscode) and [rainlang-codemirror](https://github.com/rainlanguage/rainlang-codemirror) repositories for more details.
- Dotrain vscode extension can be found [here](https://marketplace.visualstudio.com/items?itemName=rainprotocol.rainlang-vscode).

The primary goal of the Rain language is to make smart contract development accessible for as many people as possible. This is fundamentally grounded in our belief that accessibility is the difference between theoretical and practical decentralisation. There are many people who would like to participate in authoring and auditing crypto code but currently cannot. When someone wants/needs to do something but cannot, then they delegate to someone who can, this is by definition centralisation.

For more info and details, please read this [article](https://hackmd.io/@REJeq0MuTUiqnjx9w5SsUA/HJj9s-nfi#Rainlang-has-a-spectrum-of-representations-from-concise-gtexplicit)

If you find an issue or you want to propose an improvement, please feel free to post it on: [issues](https://github.com/rainlanguage/dotrain/issues)

---
# **Tutorial**
## **Javascript/Typescript**
To get started, install the package:
```bash
npm install @rainlanguage/dotrain
```
or
```bash
yarn add @rainlanguage/dotrain
```
<br>

```typescript
// imports
import { RainLanguageServices, MetaStore, TextDocumentItem } from "@rainlanguage/dotrain";

// instantiate a MetaStore which is a in-memory CAS for Rain metadata
const metaStore = new MetaStore();

// some text document
const textDocument = TextDocumentItem.create(
  "file:///file-name.rain",
  "rainlang",
  0,
  "some dotrain text"
);

// initiating the services (metaStore is optional)
const langServices = new RainLanguageServices(metaStore);

// getting validation results (lsp Diagnostics)
const diagnostics = await langServices.doValidate(textDocument);

// instantiate a new RainDocument
const rainDocument = await langServices.newRainDocument(textDocument)

// composing a RainDocument to get rainlang string
const rainlangText = await rainDocument.compose(["entrypoint-1" , "entrypoint-2"]);
```
<br>

## **Rust**
## dotrain crate
To get started, install the package:
```bash
cargo add dotrain
```

### Features
- `cli`: A [clap](https://docs.rs/clap/latest/clap/) based module (CLI app) for functionalities of this library, this features is required for building the **binary**
- `js-api`: includes wrappers around main structs and functionalities to provide an API through [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/)

<br>

```rust
use std::sync::{Arc, RwLock};
use dotrain::{Store, RainDocument};

let text = "some text".to_string();

// instantiate arc locked Store
let meta_store = Arc::new(RwLock::new(Store::default()));

// instantiate
let rain_document = RainDocument::new(text, Some(meta_store));

// compose this instance of RainDocument to get rainlang string
let rainlang_text = rain_document.compose(&vec!["entrypoint1", "entrypoint2"], None)?;
```
<br>

## dotrain_lsp crate
To get started, install the package:
```bash
cargo add dotrain-lsp
```

### Features
- `js-api`: includes wrappers around main structs and functionalities to provide an API through [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/)

```rust
use std::sync::{Arc, RwLock};
use dotrain::{Store, RainLanguageServices, TextDocumentItem, LanguageServiceParams, RainDocument};

// instantiate arc locked Store
let meta_store = Arc::new(RwLock::new(Store::default()));

// the following needs 'lsp' feature to be enabled
let lang_params = LanguageServiceParams {
  meta_store: Some(meta_store)
}

// a LSP TextdocumentItem
let text_document = TextDocumentItem {
  uri,
  text,
  version: 0,
  language_id: "rainlang".to_string()
}

// instantiate RainLanguageServices
let lang_services = RainLanguageServices::new(lang_params);

// get LSP diagnostics of the given text document
let diagnostics = lang_services.do_validate(&text_document, true);
```

## CLI
The CLI app can be built using nix (requires nix package manager to be installed):
```bash
nix build github:rainlanguage/dotrain
```
or installed with the following command from cargo:
```bash
cargo install dotrain
```

this will install the dotrain binary in your path which then can be used to compose .rain files and generate outputs.

### Examples
composes a .rain file with specified entrypoints
```bash
dotrain compose --input path/to/some.rain --entrypoints first --entrypoints second
```
optionally, path to `rainconfig.json` can be provided:
```bash
dotrain -c path/to/rainconfig.json --input path/to/some.rain --entrypoints first --entrypoints second
```
<br>

Dotrain cli is also available in [Rain CLI app](https://github.com/rainlanguage/rain.cli) which can be easily run with nix:
```bash
nix run github:rainlanguage/rain.cli -- --help
```
<br>

## **rainconfig**
Configuration details for .rain composer (source files and subgraphs).
Following command will print info about rainconfig and its fields:
```bash
dotrain rainconfig <COMMAND>
```
Here is an example of a `rainconfig.json`:
```json
{
  "include": ["./folder1", "./folder2"],
  "subgraphs": [
    "https://subgraph1-url",
    "https://subgraph2-url",
    "https://subgraph3-url"
  ]
}
```

## **Building JS/TS Bindings**
From the root of this repo, simply run the following to build the js bindings:
```bash
nix run .#build-js-bindings
```

This will build the rust library with `wasm32-unknown-unknown` target in release mode with `js-api` feature enabled and then generates bindings using `wasm-bindgen-cli` into `./dist` directory by encoding the wasm binary into a json as importing json is native in js/ts and eliminates the need for using fetch/fs operations when loading the wasm module.

To generate js/ts documents:
```bash
nix run .#js-bindings-docs
```

To run tests:
```bash
nix run .#test-js-bindings
```