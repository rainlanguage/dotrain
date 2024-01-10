![](./assets/rainlang-banner.svg)

# **Rain Language**
The Rain language server protocol ([LSP](https://microsoft.github.io/language-server-protocol/)) implementation (language services) and .rain compiler written in rust and made available for NodeJs and broswers through [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/) in Typescript/Javascript which makes it well suited for editors and IDEs (as it is used in Rainlang vscode and codemirror language extension).
- Dotrain specs can be found [here](https://github.com/rainprotocol/specs/blob/main/dotrain.md)
- Rainlang specs can be found [here](https://github.com/rainprotocol/specs/blob/main/rainlang.md)
- Dotrain has been implemented for vscode and codemirror, see [rainlang-vscode](https://github.com/rainprotocol/rainlang-vscode) and [rainlang-codemirror](https://github.com/rainprotocol/rainlang-codemirror) repositories for more details.
- Dotrain vscode extension can be found [here](https://marketplace.visualstudio.com/items?itemName=rainprotocol.rainlang-vscode).

The primary goal of the Rain language is to make smart contract development accessible for as many people as possible. This is fundamentally grounded in our belief that accessibility is the difference between theoretical and practical decentralisation. There are many people who would like to participate in authoring and auditing crypto code but currently cannot. When someone wants/needs to do something but cannot, then they delegate to someone who can, this is by definition centralisation.

For more info and details, please read this [article](https://hackmd.io/@REJeq0MuTUiqnjx9w5SsUA/HJj9s-nfi#Rainlang-has-a-spectrum-of-representations-from-concise-gtexplicit)

If you find an issue or you want to propose an improvement, please feel free to post it on: [issues](https://github.com/rainprotocol/rainlang/issues)


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
import { TextDocumentItem } from "vscode-languageserver-types";
import { RainLanguageServices, MetaStore } from "@rainlanguage/dotrain";

// instantiate a MetaStore which is a in-memory CAS for Rain metadata
const metaStore = new MetaStore();

// some text document
const textDocument = TextDocumentItem.create(
  "file:///file-name.rain",
  "rainlang",
  0,
  "some dotrain text"
);

// initiating the services (clientCapabilities and metaStore are optional arguments)
const langServices = new RainLanguageServices(metaStore);

// getting validation results (lsp Diagnostics)
const diagnostics = await langServices.doValidate(textDocument);

// instantiate a new RainDocument
const rainDocument = await langServices.newRainDocument(textDocument)

// compiling a RainDocument to get ExpressionConfig
const expressionConfig = await rainDocument.compile(["entrypoint-1" , "entrypoint-2"]);
```
<br>

## **Rust**
To get started, install the package:
```bash
cargo add dotrain
```

### Features
Rust library includes 3 features:
- `cli`: A [clap](https://docs.rs/clap/latest/clap/) based module (CLI app) for functionalities of this library, this features is required for building the **binary**
- `lsp`: includes all LSP (language services) related implementation.
- `js-api`: includes wrappers around main structs and functionalities to provide an API through [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/) (this feature is always enabled when building for wasm family targets)

<br>

```rust
use std::sync::{Arc, RwLock};
use dotrain::{Store, RainLanguageServices, TextDocumentItem, Url, LanguageServiceParams, RainDocument};

let text = "some text".to_string();
let uri = Url::parse("some-url").unwrap();

// instantiate arc locked Store
let meta_store = Arc::new(RwLock::new(Store::default()));

// instantiate
let rain_document = RainDocument::new(text, uri, Some(meta_store));

// compiles this instance of RainDocument
let compile_result = rain_document.compile(&vec!["entrypoint1", "entrypoint2"], None);


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
let diagnostics = lang_services.do_validate(&text_document, true)

```

## CLI
The CLI app can be built form the source (read next section) or be installed with the following command:
```bash
cargo install dotrain
```
this will install the dotrain binary in your path which then can be used to compile .rain files and generate outputs.

### Examples
compiles all files specified in `src` of the `rainconfig.json` in the root dir:
```bash
dotrain
```
optionally, path to `rainconfig.json` can be provided:
```bash
dotrain -c path/to/rainconfig.json
```
compile only a specific .rain:
```bash
dotrain target -i path/to/file.rain -o path/to/output.json --entrypoints main
```

## **rainconfig**
Configuration details for .rain compiler (source files, meta store configurations, etc).
Following command will print info about rainconfig and its fields:
```bash
dotrain rainconfig <COMMAND>
```
Here is an example of a `rainconfig.json`:
```json
{
  "include": ["./folder1", "./folder2"],
  "src": [
    {
      "input": "./path/to/file1.rain",
      "output": "./path/to/compiled-file1.json",
      "entrypoints": ["entrypoint1", "entrypoint2"]
    },
    {
      "input": "./path/to/file2.rain",
      "output": "./path/to/compiled-file2.json",
      "entrypoints": ["entrypoint1"]
    }
  ],
  "subgraphs": [
    "https://subgraph1-uril",
    "https://subgraph2-uril",
    "https://subgraph3-uril"
  ],
  "meta": [
    {
      "hex": "./path/to/hex-meta"
    },
    {
      "binary": "./path/to/binary-meta"
    }
  ],
  "deployers": {
    "0x78fd1edb0bdb928db6015990fecafbb964b44692e2d435693062dd4efc6254dd": {
      "constructionMeta": {
        "binary": "./path/to/binary-construction-meta"
      },
      "expressionDeployer": "./path/to/deployer-json-artifact.json",
      "parser": "./path/to/parser-artifact.json",
      "store": "./path/to/store-artifact.json",
      "interpreter": "./path/to/interpreter-artifact.json"
    },
    "0xa60a26b92501195b72f34dad09dc163ff65d3a86109e76b8c80110904f574dbb": {
      "constructionMeta": {
        "hex": "./path/to/hex-construction-meta"
      },
      "expressionDeployer": "./path/to/deployer-json-artifact.json",
      "parser": "./path/to/parser-artifact.json",
      "store": "./path/to/store-artifact.json",
      "interpreter": "./path/to/interpreter-artifact.json"
    }
  }
}
```

## **Developers**
## **Build From Source**
To build from the source first clone this repo and make sure the following items are already installed:
- [rust](https://www.rust-lang.org/learn/get-started)
- [nodejs](https://nodejs.org/en) (only required for building the js/ts modules)
- [wasm-bindgen-cli](https://rustwasm.github.io/docs/wasm-bindgen/reference/cli.html) (only required for building the js/ts modules)
if you already have nixOS installed you can simply run the following command which pulls all the required binaries and packages into nix store and put them in your PATH:
```bash
nix-shell
```
rust lib/bin can be built using `cargo build` command with desired features.
for building the js modules simply run:
```bash
npm run build
```
This will build the rust library with `wasm32-unknown-unknown` target in release mode with `lsp` and `js-api` features enabled and then generates bindings using `wasm-bindgen-cli` into `./dist` directory by encoding the wasm binary into a json as importing json is native in js/ts and elimiates the need for using fetch/fs operations when loading the wasm module.

To generate documents:
```bash
npm run docgen
```

To run tests:
```bash
npm test
```
