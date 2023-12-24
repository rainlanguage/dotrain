[Home](../index.md) &gt; [RainDocument](./raindocument.md)

# Class RainDocument

\# RainDocument RainDocument is the main implementation block that enables parsing of a .rain file contents to its building blocks and parse tree by handling and resolving imports, namespaces, etc which later are used by LSP services and compiler as well as providing all the functionalities in between.

A portable, extensible and composable format for describing Rainlang fragments, .rain serve as a wrapper/container/medium for Rainlang to be shared and audited simply in a permissionless and adversarial environment such as a public blockchain.

\#\# Examples

\`\`\` \`\`\`

<b>Signature:</b>

```typescript
class RainDocument 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [allProblems](./raindocument.md#allProblems-property) | `Problem[]` | This instance's all problems (bindings + top) |
|  [authoringMeta](./raindocument.md#authoringMeta-property) | `IAuthoringMeta \| undefined` | This instance's AuthoringMeta |
|  [bindingProblems](./raindocument.md#bindingProblems-property) | `Problem[]` | This instance's bindings problems |
|  [bindings](./raindocument.md#bindings-property) | `Binding[]` | This instance's bindings |
|  [comments](./raindocument.md#comments-property) | `Comment[]` | This instance's comments |
|  [deployer](./raindocument.md#deployer-property) | [INPE2Deployer](../interfaces/inpe2deployer.md) | This instance's NPE2 Deployer details |
|  [error](./raindocument.md#error-property) | `string \| undefined` | The error msg if parsing had resulted in an error |
|  [ignoreUndefinedWords](./raindocument.md#ignoreUndefinedWords-property) | `boolean` | If 'ignore\_undefined\_words' lint option is enabled or not |
|  [ignoreWords](./raindocument.md#ignoreWords-property) | `boolean` | If 'ignore\_words' lint option is enabled or not |
|  [imports](./raindocument.md#imports-property) | `Import[]` | This instance's imports |
|  [metaStore](./raindocument.md#metaStore-property) | [MetaStore](./metastore.md) | This instance's MetaStore |
|  [namespace](./raindocument.md#namespace-property) | [Namespace](../types/namespace.md) | This instance's namespace |
|  [problems](./raindocument.md#problems-property) | `Problem[]` | This instance's top problems |
|  [text](./raindocument.md#text-property) | `string` | This instance's current text |
|  [uri](./raindocument.md#uri-property) | `string` | This instance's current URI |
|  [version](./raindocument.md#version-property) | `number` | This instance's current version |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [compileText(text, entrypoints, meta\_store, uri)](./raindocument.md#compileText-method-static-1) | Compiles a text as RainDocument with remote meta search disabled for parsing |
|  [compileTextAsync(text, entrypoints, meta\_store, uri)](./raindocument.md#compileTextAsync-method-static-1) | Compiles a text as RainDocument with remote meta search enabled for parsing |
|  [compileTextRaw(text, entrypoints, uri)](./raindocument.md#compileTextRaw-method-static-1) | Compiles a text as RainDocument with remote meta search disabled for parsing |
|  [compileTextRawAsync(text, entrypoints, uri)](./raindocument.md#compileTextRawAsync-method-static-1) | Compiles a text as RainDocument with remote meta search enabled for parsing |
|  [create(text, uri, meta\_store)](./raindocument.md#create-method-static-1) | Creates an instance with the given MetaStore and parses with remote meta search disabled (cached metas only) |
|  [createAsync(text, uri, meta\_store)](./raindocument.md#createAsync-method-static-1) | Creates an instance with the given MetaStore and parses with remote meta search enabled |
|  [createAsyncRaw(text, uri)](./raindocument.md#createAsyncRaw-method-static-1) | creates an instance with a new raw MetaStore and parses with searching for metas from remote |
|  [createRaw(text, uri)](./raindocument.md#createRaw-method-static-1) | Creates an instance with a new raw MetaStore and parses with remote meta search disabled (cached metas only) |
|  [fromInterface(value, meta\_store)](./raindocument.md#fromInterface-method-static-1) |  |
|  [fromInterfaceRaw(value)](./raindocument.md#fromInterfaceRaw-method-static-1) |  |

## Methods

|  Method | Description |
|  --- | --- |
|  [compile(entrypoints)](./raindocument.md#compile-method-1) | Compiles this instance |
|  [free()](./raindocument.md#free-method-1) |  |
|  [parse()](./raindocument.md#parse-method-1) | Parses this instance's text with remote meta search disabled (cached metas only) |
|  [parseAsync()](./raindocument.md#parseAsync-method-1) | Parses this instance's text with remote meta search enabled |
|  [toInterface()](./raindocument.md#toInterface-method-1) |  |
|  [update(new\_text, uri, version)](./raindocument.md#update-method-1) | Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only) |
|  [updateAsync(new\_text, uri, version)](./raindocument.md#updateAsync-method-1) | Updates the text, uri, version and parses right away with remote meta search enabled |
|  [updateText(new\_text)](./raindocument.md#updateText-method-1) | Updates the text and parses right away with remote meta search disabled (cached metas only) |
|  [updateTextAsync(new\_text)](./raindocument.md#updateTextAsync-method-1) | Updates the text and parses right away with remote meta search enabled |

## Property Details

<a id="allProblems-property"></a>

### allProblems

This instance's all problems (bindings + top)

<b>Signature:</b>

```typescript
readonly allProblems: Problem[];
```

<a id="authoringMeta-property"></a>

### authoringMeta

This instance's AuthoringMeta

<b>Signature:</b>

```typescript
readonly authoringMeta: IAuthoringMeta | undefined;
```

<a id="bindingProblems-property"></a>

### bindingProblems

This instance's bindings problems

<b>Signature:</b>

```typescript
readonly bindingProblems: Problem[];
```

<a id="bindings-property"></a>

### bindings

This instance's bindings

<b>Signature:</b>

```typescript
readonly bindings: Binding[];
```

<a id="comments-property"></a>

### comments

This instance's comments

<b>Signature:</b>

```typescript
readonly comments: Comment[];
```

<a id="deployer-property"></a>

### deployer

This instance's NPE2 Deployer details

<b>Signature:</b>

```typescript
readonly deployer: INPE2Deployer;
```

<a id="error-property"></a>

### error

The error msg if parsing had resulted in an error

<b>Signature:</b>

```typescript
readonly error: string | undefined;
```

<a id="ignoreUndefinedWords-property"></a>

### ignoreUndefinedWords

If 'ignore\_undefined\_words' lint option is enabled or not

<b>Signature:</b>

```typescript
readonly ignoreUndefinedWords: boolean;
```

<a id="ignoreWords-property"></a>

### ignoreWords

If 'ignore\_words' lint option is enabled or not

<b>Signature:</b>

```typescript
readonly ignoreWords: boolean;
```

<a id="imports-property"></a>

### imports

This instance's imports

<b>Signature:</b>

```typescript
readonly imports: Import[];
```

<a id="metaStore-property"></a>

### metaStore

This instance's MetaStore

<b>Signature:</b>

```typescript
readonly metaStore: MetaStore;
```

<a id="namespace-property"></a>

### namespace

This instance's namespace

<b>Signature:</b>

```typescript
readonly namespace: Namespace;
```

<a id="problems-property"></a>

### problems

This instance's top problems

<b>Signature:</b>

```typescript
readonly problems: Problem[];
```

<a id="text-property"></a>

### text

This instance's current text

<b>Signature:</b>

```typescript
readonly text: string;
```

<a id="uri-property"></a>

### uri

This instance's current URI

<b>Signature:</b>

```typescript
readonly uri: string;
```

<a id="version-property"></a>

### version

This instance's current version

<b>Signature:</b>

```typescript
readonly version: number;
```

## Static Method Details

<a id="compileText-method-static-1"></a>

### compileText(text, entrypoints, meta\_store, uri)

Compiles a text as RainDocument with remote meta search disabled for parsing

<b>Signature:</b>

```typescript
static compileText(
        text: string,
        entrypoints: string[],
        meta_store: MetaStore,
        uri?: string,
    ): Promise<ExpressionConfig>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  entrypoints | `string[]` |  |
|  meta\_store | [MetaStore](./metastore.md) |  |
|  uri | `string` |  |

<b>Returns:</b>

`Promise<ExpressionConfig>`

{<!-- -->Promise<ExpressionConfig>}

<a id="compileTextAsync-method-static-1"></a>

### compileTextAsync(text, entrypoints, meta\_store, uri)

Compiles a text as RainDocument with remote meta search enabled for parsing

<b>Signature:</b>

```typescript
static compileTextAsync(
        text: string,
        entrypoints: string[],
        meta_store: MetaStore,
        uri?: string,
    ): Promise<ExpressionConfig>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  entrypoints | `string[]` |  |
|  meta\_store | [MetaStore](./metastore.md) |  |
|  uri | `string` |  |

<b>Returns:</b>

`Promise<ExpressionConfig>`

{<!-- -->Promise<ExpressionConfig>}

<a id="compileTextRaw-method-static-1"></a>

### compileTextRaw(text, entrypoints, uri)

Compiles a text as RainDocument with remote meta search disabled for parsing

<b>Signature:</b>

```typescript
static compileTextRaw(
        text: string,
        entrypoints: string[],
        uri?: string,
    ): Promise<ExpressionConfig>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  entrypoints | `string[]` |  |
|  uri | `string` |  |

<b>Returns:</b>

`Promise<ExpressionConfig>`

{<!-- -->Promise<ExpressionConfig>}

<a id="compileTextRawAsync-method-static-1"></a>

### compileTextRawAsync(text, entrypoints, uri)

Compiles a text as RainDocument with remote meta search enabled for parsing

<b>Signature:</b>

```typescript
static compileTextRawAsync(
        text: string,
        entrypoints: string[],
        uri?: string,
    ): Promise<ExpressionConfig>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  entrypoints | `string[]` |  |
|  uri | `string` |  |

<b>Returns:</b>

`Promise<ExpressionConfig>`

{<!-- -->Promise<ExpressionConfig>}

<a id="create-method-static-1"></a>

### create(text, uri, meta\_store)

Creates an instance with the given MetaStore and parses with remote meta search disabled (cached metas only)

<b>Signature:</b>

```typescript
static create(text: string, uri: string, meta_store: MetaStore): RainDocument;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  uri | `string` |  |
|  meta\_store | [MetaStore](./metastore.md) |  |

<b>Returns:</b>

`RainDocument`

{<!-- -->RainDocument<!-- -->}

<a id="createAsync-method-static-1"></a>

### createAsync(text, uri, meta\_store)

Creates an instance with the given MetaStore and parses with remote meta search enabled

<b>Signature:</b>

```typescript
static createAsync(text: string, uri: string, meta_store: MetaStore): Promise<RainDocument>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  uri | `string` |  |
|  meta\_store | [MetaStore](./metastore.md) |  |

<b>Returns:</b>

`Promise<RainDocument>`

{<!-- -->Promise<RainDocument>}

<a id="createAsyncRaw-method-static-1"></a>

### createAsyncRaw(text, uri)

creates an instance with a new raw MetaStore and parses with searching for metas from remote

<b>Signature:</b>

```typescript
static createAsyncRaw(text: string, uri: string): Promise<RainDocument>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  uri | `string` |  |

<b>Returns:</b>

`Promise<RainDocument>`

{<!-- -->Promise<RainDocument>}

<a id="createRaw-method-static-1"></a>

### createRaw(text, uri)

Creates an instance with a new raw MetaStore and parses with remote meta search disabled (cached metas only)

<b>Signature:</b>

```typescript
static createRaw(text: string, uri: string): RainDocument;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  uri | `string` |  |

<b>Returns:</b>

`RainDocument`

{<!-- -->RainDocument<!-- -->}

<a id="fromInterface-method-static-1"></a>

### fromInterface(value, meta\_store)

<b>Signature:</b>

```typescript
static fromInterface(value: IRainDocument, meta_store: MetaStore): RainDocument;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  value | [IRainDocument](../interfaces/iraindocument.md) |  |
|  meta\_store | [MetaStore](./metastore.md) |  |

<b>Returns:</b>

`RainDocument`

{<!-- -->RainDocument<!-- -->}

<a id="fromInterfaceRaw-method-static-1"></a>

### fromInterfaceRaw(value)

<b>Signature:</b>

```typescript
static fromInterfaceRaw(value: IRainDocument): RainDocument;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  value | [IRainDocument](../interfaces/iraindocument.md) |  |

<b>Returns:</b>

`RainDocument`

{<!-- -->RainDocument<!-- -->}

## Method Details

<a id="compile-method-1"></a>

### compile(entrypoints)

Compiles this instance

<b>Signature:</b>

```typescript
compile(entrypoints: string[]): ExpressionConfig;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  entrypoints | `string[]` |  |

<b>Returns:</b>

`ExpressionConfig`

{<!-- -->ExpressionConfig<!-- -->}

<a id="free-method-1"></a>

### free()

<b>Signature:</b>

```typescript
free(): void;
```
<b>Returns:</b>

`void`

<a id="parse-method-1"></a>

### parse()

Parses this instance's text with remote meta search disabled (cached metas only)

<b>Signature:</b>

```typescript
parse(): void;
```
<b>Returns:</b>

`void`

<a id="parseAsync-method-1"></a>

### parseAsync()

Parses this instance's text with remote meta search enabled

<b>Signature:</b>

```typescript
parseAsync(): Promise<void>;
```
<b>Returns:</b>

`Promise<void>`

{<!-- -->Promise<void>}

<a id="toInterface-method-1"></a>

### toInterface()

<b>Signature:</b>

```typescript
toInterface(): IRainDocument;
```
<b>Returns:</b>

`IRainDocument`

{<!-- -->IRainDocument<!-- -->}

<a id="update-method-1"></a>

### update(new\_text, uri, version)

Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only)

<b>Signature:</b>

```typescript
update(new_text: string, uri: string, version: number): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  new\_text | `string` |  |
|  uri | `string` |  |
|  version | `number` |  |

<b>Returns:</b>

`void`

<a id="updateAsync-method-1"></a>

### updateAsync(new\_text, uri, version)

Updates the text, uri, version and parses right away with remote meta search enabled

<b>Signature:</b>

```typescript
updateAsync(new_text: string, uri: string, version: number): Promise<void>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  new\_text | `string` |  |
|  uri | `string` |  |
|  version | `number` |  |

<b>Returns:</b>

`Promise<void>`

{<!-- -->Promise<void>}

<a id="updateText-method-1"></a>

### updateText(new\_text)

Updates the text and parses right away with remote meta search disabled (cached metas only)

<b>Signature:</b>

```typescript
updateText(new_text: string): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  new\_text | `string` |  |

<b>Returns:</b>

`void`

<a id="updateTextAsync-method-1"></a>

### updateTextAsync(new\_text)

Updates the text and parses right away with remote meta search enabled

<b>Signature:</b>

```typescript
updateTextAsync(new_text: string): Promise<void>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  new\_text | `string` |  |

<b>Returns:</b>

`Promise<void>`

{<!-- -->Promise<void>}

