# **Rain Language - Standalone**
The Rain language (rainlang) standalone encapsulates the Rain language compiler (rlc) and Rain language services (in [LSP specs](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)) that are written in typescript. This is well suited for editors and IDE support, which can be intracted with directly through API and/or be used in tools like Slate and/or be utilized in any text editor that supports [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) such as vscode, monaco or codemirror.
- Rainlang has been implemented for vscode and codemirror, see [rainlang-vscode](https://github.com/rainprotocol/rainlang-vscode) and [rainlang-codemirror](https://github.com/rainprotocol/rainlang-codemirror) repositories for more deatils.
- Rainlang vscode extension can be found [here](https://marketplace.visualstudio.com/items?itemName=rainprotocol.rainlang-vscode).


The primary goal of the Rain language is to make smart contract development accessible for as many people as possible. This is fundamentally grounded in our belief that accessibility is the difference between theoretical and practical decentralisation. There are many people who would like to participate in authoring and auditing crypto code but currently cannot. When someone wants/needs to do something but cannot, then they delegate to someone who can, this is by definition centralisation.

For more info and details, please read this [article](https://hackmd.io/@REJeq0MuTUiqnjx9w5SsUA/HJj9s-nfi#Rainlang-has-a-spectrum-of-representations-from-concise-gtexplicit)

If you find an issue or you want to propose an improvement, please feel free to post it on: [issues](https://github.com/rainprotocol/rainlang/issues)


## **Tutorial**
To get started, install the package:
```bash
npm install @rainprotocol/rainlang
```
or
```bash
yarn add @rainprotocol/rainlang
```
<br>


### **Language Services**
Rain Language Services provide validation of a Rain docuemtn and services like completion, hover, etc.
```typescript
// importing
import { getRainLanguageServices } from "@rainprotocol/rainlang";

// initiating the services (clientCapabilities and metaStore are optional arguments)
const langServices = getRainLanguageServices({clientCapabilities, metaStore});

// getting validation results (lsp Diagnostics)
const diagnostics = await langServices.doValidate(myTextDocument);
```
<br>

### **Rain Language Compiler and Decompiler**
Rain Language compiler/decompiler, compiles a Rain document to a valid ExpressionConfig and vice versa for decompiler.
```typescript
// importing
import { rainlangc, rainlangd } from "@rainprotocol/rainlang";

// compiling a Rain document to get ExpressionConfig aka deployable bytes
const expressionConfig = await rainlangc(myDocument, ...[ metaStore ]);

// decompiling an ExpressionConfig to a valid Rain document
const rainDocument = await rainlangd(expressionConfig, ...[ metaStore ]);
```

<br>

## CLI
Dotrain compiler/decompiler can be executed through CLI with:
- if on current repo:
```bash
node cli/dotrain [options]
```
- if the package is already installed:
```bash
npx dotrain [options]
```
- for executing the command if package is not installed (executing remotely): 
`--yes` will accept the prompt to cache the package
```bash
npx @rainprotocol/rainlang [options] --yes
```
or
```bash
npx --p @rainprotocol/rainlang dotrain [options] --yes
```

<br>

Command details:

    CLI command to compile/decompile dotrain.

    Options:
      -c, --compile <expressions...>  Use compiling mode with specified expression names, to compile a .rain file to ExpressionConfig output in a .json
      -d, --decompile <opmeta hash>  Use decompiling mode with a specific opmeta hash, to decompile an ExpressionConfig in a .json to a .rain
      -i, --input <path>              Path to input file, either a .rain file for compiling or .json for decompiling
      -o, --output <path>             Path to output file, will output .json for compile mode and .rain for decompile mode
      -b, --batch-compile <path>      Path to a json file of mappings of dotrain files paths, expression names and output json files paths to batch compile
      -s, --stdout                    Log the result in terminal
      -V, --version                   output the version number
      -h, --help                      display help for command

<br>

example of a mapping file content (see `./example.mapping.json`):
```json
[
  {
    "dotrain": "./path/to/dotrain1.rain",
    "json": "./path/to/compiled1.json",
    "expressions": [
      "exp-1", 
      "exp-2"
    ]
  },
  {
    "dotrain": "./path/to/dotrain12.rain",
    "json": "./path/to/compiled2.json",
    "expressions": [
      "main"
    ]
  }
]


## **Developers**
To get started, clone the repo and install the dependencies:
```bash
git clone https://github.com/rouzwelt/rainlang.git
cd rainlang
npm install
```

To build from source code:
```bash
npm run build
```

To generate documents:
```bash
npm run docgen
```

To run tests:
```bash
npm test
```
