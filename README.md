# **Dotrain/Rainlang - Standalone**
The Rain language (dotrain and rainlang) standalone package written in typescript encapsulates language compiler/decompiler and language services (in [LSP specs](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)). This is well suited for editors and IDE support, which can be intracted with directly through API and/or be used in tools like Slate and/or be utilized in any text editor that supports [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) such as vscode, monaco or codemirror.
- Dotrain specs can be found [here](https://github.com/rainprotocol/specs/blob/main/dotrain.md)
- Rainlang specs can be found [here](https://github.com/rainprotocol/specs/blob/main/rainlang.md)
- Dotrain has been implemented for vscode and codemirror, see [rainlang-vscode](https://github.com/rainprotocol/rainlang-vscode) and [rainlang-codemirror](https://github.com/rainprotocol/rainlang-codemirror) repositories for more details.
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

### **Compiler**
- Compiling a `RainDocument` aka dotrain instances:
```typescript
// importing
import { Compile } from "@rainprotocol/rainlang";

// compiling a RainDocument to get ExpressionConfig
const expressionConfig = await Compile.RainDocument(myDocument, ["entrypoint-1" , "entrypoint-2"], options);
```
<br>

- Compiling `Rainlang` instances:
```typescript
// importing
import { Compile } from "@rainprotocol/rainlang";

// compiling a rainlang text to get ExpressionConfig
const expressionConfig = await Compile.Rainlang(rainlangText, bytecodeSource, entrypoints, options);
```

<br>

## CLI
`npx` command to compile dotrain file(s) to `ExpressionConfig` in json format.
 - if on current repo:
```bash
node cli/dotrain [options] [command]
```
 - if the package is already installed:
```bash
npx dotrain [options] [command]
```
 - if package is not installed (executing remotely): 
 `--yes` will accept the prompt to cache the package for execution
```bash
npx @rainprotocol/rainlang [options] [command] --yes
```
 or
```bash
npx --p @rainprotocol/rainlang dotrain [options] [command] --yes
```
<br>
Command details:

    Usage: dotrain [options] [command]

    CLI command to run dotrain compiler.

    Options:
      -c, --config <path>  Path to a config json file(default is './config.rain.json' if not specified) that contains configurations, which can contain: list of mapping details for compiling, path of local meta files, list of subgraph endpoints, see 'example.config.rain.json' for more details.
      -s, --silent         Print no std logs.
      -V, --version        output the version number
      -h, --help           display help for command

    Commands:
      compile [options]    compile a single .rain file.

<br>
Compile subcommand details:

    Usage: dotrain compile [options]

    compile a single .rain file.

    Options:
      -e, --entrypoints <bindings...>  Entrypoints to compile
      -i, --input <path>               Path to .rain file
      -o, --output <path>              Path to output file, output format is .json
      -l, --log                        Log the compilation result in terminal
      -c, --config <path>              Path to a config json file(default is './config.rain.json' if not specified) that contains configurations to get local meta files and subgraphs, see 'example.config.rain.json' for more details.
      -s, --silent                     Print no informative logs, except compilation results if --log is used
      -h, --help                       display help for command

<br>

example of a config file content (see `./example.mapping.json`):
```json
{
  // list of mapping details of dotrain files to get compiled to the specified output with specified entrypoints
  "src": [
    {
      "input": "./path/to/file1.rain",
      "output": "./path/to/compiled-file1.json",
      "entrypoints": ["entrypoint1", "entrypoint2"]
    },
    {
      "input": "./path/to/file2.rain",
      "output": "./path/to/compiled-file2.json",
      "entrypoints": ["entrypoint1", "entrypoint2"]
    }
  ],
  // path of local meta files to use when compiling, fields are optional
  "meta": {
    // for meta files that are binary
    "binary": ["./path/to/binary-meta", "./path/to/binary-another-meta"],
    // for meta files that are utf8 encoded hex string starting with 0x
    "hex": ["./path/to/hex-meta", "./path/to/hex-another-meta"]
  },
  // list of subgraph endpoints to use when compiling
  "subgraphs": [
    "https://subgraph1-uril",
    "https://subgraph2-uril",
    "https://subgraph3-uril"
  ]
}
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
