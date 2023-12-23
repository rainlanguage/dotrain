![](./assets/rain-logo-800px.png)
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
      -c, --config <path>  Path to the rainconfig json file(default is './rainconfig.json' or './.rainconfig.json' if not specified) that contains configurations, see './example.rainconfig.json' for more details.
      -s, --silent         Print no std logs.
      -V, --version        output the version number
      -h, --help           display help for command

    Commands:
      compile [options]    compile a single .rain file.
      rainconfig           show detailed information about rainconfig.json

<br>
Compile subcommand details (compiling specific file):

    Usage: dotrain compile [options]

    compile a single .rain file.

    Options:
      -e, --entrypoints <bindings...>  Entrypoints to compile
      -i, --input <path>               Path to .rain file
      -o, --output <path>              Path to output file, output format is .json
      -l, --log                        Log the compilation result in terminal
      -c, --config <path>              Path to the rainconfig json file(default is './rainconfig.json' or './.rainconfig.json' if not specified) that contains configurations, see './example.rainconfig.json' for more details.
      -s, --silent                     Print no informative logs, except compilation results if --log is used
      -h, --help                       display help for command

<br>
rainconfig information:

    Description:
    rainconfig.json provides configuration details and information required for .rain compiler.

    usually it should be placed at the root directory of the working workspace and named as 
    'rainconfig.json' or '.rainconfig.json', as by doing so it will automatically be read 
    and having rainlang vscode extension, it will provide autocomplete and information on 
    each field, however if this is not desired at times, it is possible to pass any path for 
    rainconfig when using the dotrain command using --config option.

    all fields in the rainconfig are optional and are as follows:

    - src: Specifies list of .rain source files mappings for compilation, where specified 
    .rain input files will get compiled and results written into output json file.

    - include: Specifies a list of directories (files/folders) to be included and watched. 
    'src' files are included by default and folders will be watched recursively for .rain files. 
    These files will be available as dotrain meta in the cas so if their hash is specified in a
    compilation target they will get resolved.

    - subgraphs: Additional subgraph endpoint URLs to include when searching for metas of 
    specified meta hashes in a rainlang document.

    - meta: Lis of paths (or object of path and hash) of local meta files as binary or utf8 
    encoded text file containing hex string starting with 0x. Binary meta files should go 
    under 'meta.binary' field and hex meta files should go under 'meta.hex' field.

<br>

example of a config file content (see `./example.rainconfig.json`):
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
      "entrypoints": ["entrypoint1", "entrypoint2"]
    }
  ],
  "subgraphs": [
    "https://subgraph1-uril",
    "https://subgraph2-uril",
    "https://subgraph3-uril"
  ],
  "meta": [
    {
      "binary": {
        "path": "./path/to/another-binary-meta",
        "hash": "0x123456789abcdef..."
      }
    },
    {
      "hex": "./path/to/hex-meta"
    },
    {
      "binary": "./path/to/binary-meta"
    },
    {
      "hex": {
        "path": "./path/to/another-hex-meta",
        "hash": "0x123456789abcdef..."
      }
    }
  ],
  "deployers": {
    "0x1234...": {
      "constructionMeta": {
        "binary": "./path/to/binary-construction-meta"
      },
      "bytecode": {
        "json": "./path/to/deployer-json-artifact"
      },
      "parser": {
        "binary": "./path/to/binary-parser-bytecode"
      },
      "store": {
        "hex": "./path/to/hex-store-bytecode"
      },
      "interpreter": {
        "binary": "./path/to/binary-interpreter-bytecode"
      }
    },
    "0xabcd...": {
      "constructionMeta": {
        "binary": "./path/to/binary-construction-meta"
      },
      "bytecode": {
        "binary": "./path/to/binary-deployer-bytecode"
      },
      "parser": {
        "json": "./path/to/parser-json-artifact"
      },
      "store": {
        "hex": "./path/to/hex-parser-bytecode"
      },
      "interpreter": {
        "json": "./path/to/interpreter-json-artifact"
      }
    }
  }
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
