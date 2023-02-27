[Home](../index.md) &gt; [RainDocumentResult](./raindocumentresult.md)

# Type RainDocumentResult

Type of RainDocument's parse result

<b>Signature:</b>

```typescript
type RainDocumentResult = {
    parseTree: RDParseTree;
    comments: RDComment[];
    problems: RDProblem[];
    runtimeError: Error | undefined;
};
```
