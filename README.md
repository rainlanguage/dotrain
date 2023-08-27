# **Dotrain/Rainlang - Standalone**
The Rain language (dotrain and rainlang) standalone package written in typescript encapsulates language compiler/decompiler and language services (in [LSP specs](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)). This is well suited for editors and IDE support, which can be intracted with directly through API and/or be used in tools like Slate and/or be utilized in any text editor that supports [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) such as vscode, monaco or codemirror.
- Dotrain specs can be found [here](https://github.com/rainprotocol/specs/blob/main/dotrain.md)
- Rainlang specs can be found [here](https://github.com/rainprotocol/specs/blob/main/rainlang.md)
- Dotrain has been implemented for vscode and codemirror, see [rainlang-vscode](https://github.com/rainprotocol/rainlang-vscode) and [rainlang-codemirror](https://github.com/rainprotocol/rainlang-codemirror) repositories for more deatils.
- Dotrain vscode extension can be found [here](https://marketplace.visualstudio.com/items?itemName=rainprotocol.rainlang-vscode).

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
Rain Language Services provide validation of a Rain document and services like completion, hover, etc.
```typescript
// importing
import { getRainLanguageServices } from "@rainprotocol/rainlang";

// initiating the services (clientCapabilities and metaStore are optional arguments)
const langServices = getRainLanguageServices({clientCapabilities, metaStore});

// getting validation results (lsp Diagnostics)
const diagnostics = await langServices.doValidate(myTextDocument);
```
<br>

### **Compiler and Decompiler**
- `dotrainc()` and `dotraind()` for compiling/decompiling `RainDocument` aka dotrain instances:
```typescript
// importing
import { dotrainc, dotraind } from "@rainprotocol/rainlang";

// compiling a RainDocument to get ExpressionConfig aka deployable bytes
const expressionConfig = await dotrainc(myDocument, [...metaStore]);

// decompiling an ExpressionConfig to a valid RainDocument
const rainDocument = await dotraind(expressionConfig, [...metaStore]);
```
<br>

- `rainlangc()` and `rainlangd()` for compiling/decompiling `Rainlang` instances:
```typescript
// importing
import { rainlangc, rainlangd } from "@rainprotocol/rainlang";

// compiling a rainlang text to get ExpressionConfig aka deployable bytes
const expressionConfig = await rainlangc(rainlangText, opMetaOrOpMetaHash);

// decompiling an ExpressionConfig to a valid Rainlang instance
const rainlangInstance = await rainlangd(expressionConfig, opMetaOrOpMetaHash);
```

<br>

## CLI
`npx` command to compile a dotrain file to `ExpressionConfig` in json format or to decompiler an `ExpressionConfig` in json format to a dotrain file.
 - if on current repo:
```bash
node cli/dotrain [options]
```
 - if the package is already installed:
```bash
npx dotrain [options]
```
 - if package is not installed (executing remotely): 
 `--yes` will accept the prompt to cache the package for execution
```bash
npx @rainprotocol/rainlang [options] --yes
```
 or
```bash
npx --p @rainprotocol/rainlang dotrain [options] --yes
```
 <br>
 Command details:

    Usage: dotrain [options]

    CLI command to compile/decompile a source file.

    Options:
      -c, --compile <expressions...>  Use compiling mode with specified expression names, to compile a .rain file to ExpressionConfig output in a .json
      -d, --decompile <op meta hash>  Use decompiling mode with a specific opmeta hash, to decompile an ExpressionConfig in a .json to a .rain
      -i, --input <path>              Path to input file, either a .rain file for compiling or .json for decompiling (always required)
      -o, --output <path>             Path to output file, will output .json for compile mode and .rain for decompile mode (always required)
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
```

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
