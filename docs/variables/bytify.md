[Home](../index.md) &gt; [bytify](./bytify.md)

# Variable bytify

Converts a value to raw bytes representation. Assumes `value` is less than or equal to 1 byte, unless a desired `bytesLength` is specified.

<b>Signature:</b>

```typescript
bytify: (value: number | BytesLike | utils.Hexable, bytesLength?: number) => BytesLike
```
