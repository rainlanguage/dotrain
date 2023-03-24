[Home](../index.md) &gt; [CompletionTriggerKind](./completiontriggerkind.md)

# Enum CompletionTriggerKind

How a completion was triggered

<b>Signature:</b>

```typescript
enum CompletionTriggerKind 
```

## Enumeration Members

|  Member | Value | Description |
|  --- | --- | --- |
|  Invoked | `1` | Completion was triggered by typing an identifier (24x7 code complete), manual invocation (e.g Ctrl+Space) or via API. |
|  TriggerCharacter | `2` | Completion was triggered by a trigger character specified by the `triggerCharacters` properties of the `CompletionRegistrationOptions`<!-- -->. |
|  TriggerForIncompleteCompletions | `3` | Completion was re-triggered as current completion list is incomplete |

