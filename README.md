# **Rain Language**
A WIP Parser and Formatter written in TypeScript used to read and write in Rain Language.
The primary goal of the rain language is to make smart contract development accessible for as many people as possible.

This is fundamentally grounded in our belief that accessibility is the difference between theoretical and practical decentralisation. There are many people who would like to participate in authoring and auditing crypto code but currently cannot. When someone wants/needs to do something but cannot, then they delegate to someone who can, this is by definition centralisation.

For more info and details, please read this [article](https://hackmd.io/@REJeq0MuTUiqnjx9w5SsUA/HJj9s-nfi#Rainlang-has-a-spectrum-of-representations-from-concise-gtexplicit)

If you find an issue or you want to propose an improvement, please feel free to post it on: [issues](https://github.com/rouzwelt/rainlang/issues)


## **Tutorial**
To get started, install the package:
```bash
yarn add --dev https://github.com/rouzwelt/rainlang.git
or
npm install --save-dev https://github.com/rouzwelt/rainlang.git
```


### **Parser**
Parser is a compiler to generate a valid ExpressionConfig (deployable bytes) from rain expressions.
```typescript
// to import
import { Parser } from "@beehiveinnovation/rainlang";

// to execute the parsing and get parse tree object and ExpressionConfig
let parseTree;
let stateConfig;
[ parseTree, stateConfig ] = Parser.get(expression opMeta);

// to get parse tree object only
let parseTree = Parser.getParseTree(expression, opMeta);

// to get ExpressionConfig only
let stateConfig = Parser.getExpressionConfig(expression, opMeta);

// to build(compile) ExpressionConfig from ParseTree object or a Node or array of Node
let argument: Node || Node[] || ParseTree = objectInstanceOfSpecifiedType;
let stateConfig = Parser.compile(argument)
```


### **Formatter**
The generator of human friendly readable source.
Format an ExpressionConfig to a more human readable form, making easier to understand. This form allows users read exactly
what the Script will do, like the conditions, values used, etc. Also, anyone can learn to write their own scripts
if use the Human Form to see the output for each combination that they made.


## **Developers**
To get started, clone the repo and install the dependencies:
```bash
git clone https://github.com/rouzwelt/rainlang.git
cd rainlang
yarn install
```


To build from source code:
```bash
yarn run build
```


To generate documents:
```bash
yar run docgen
```


To run tests:
```bash
yarn run test
```
