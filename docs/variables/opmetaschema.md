[Home](../index.md) &gt; [OpMetaSchema](./opmetaschema.md)

# Variable OpMetaSchema

op meta schema used for validation

<b>Signature:</b>

```typescript
OpMetaSchema: {
    $schema: string;
    $ref: string;
    $comment: string;
    definitions: {
        OpMeta: {
            type: string;
            properties: {
                name: {
                    type: string;
                    title: string;
                    description: string;
                    pattern: string;
                };
                desc: {
                    type: string;
                    title: string;
                    description: string;
                };
                operand: {
                    anyOf: ({
                        type: string;
                        const: number;
                        $ref?: undefined;
                    } | {
                        $ref: string;
                        type?: undefined;
                        const?: undefined;
                    })[];
                    title: string;
                    description: string;
                };
                inputs: {
                    $ref: string;
                    title: string;
                    description: string;
                };
                outputs: {
                    $ref: string;
                    title: string;
                    description: string;
                };
                aliases: {
                    type: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                    title: string;
                    description: string;
                };
            };
            required: string[];
            additionalProperties: boolean;
            title: string;
            description: string;
        };
        OperandArgs: {
            type: string;
            items: {
                type: string;
                properties: {
                    bits: {
                        type: string;
                        items: {
                            type: string;
                            minimum: number;
                            maximum: number;
                        };
                        minItems: number;
                        maxItems: number;
                        title: string;
                        description: string;
                    };
                    name: {
                        type: string;
                        title: string;
                        description: string;
                        pattern: string;
                    };
                    desc: {
                        type: string;
                        title: string;
                        description: string;
                    };
                    computation: {
                        type: string;
                        title: string;
                        description: string;
                    };
                    validRange: {
                        type: string;
                        items: {
                            anyOf: {
                                type: string;
                                items: {
                                    type: string;
                                    minimum: number;
                                    maximum: number;
                                };
                                minItems: number;
                                maxItems: number;
                            }[];
                        };
                        title: string;
                        description: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            minItems: number;
        };
        InputMeta: {
            anyOf: ({
                type: string;
                const: number;
                properties?: undefined;
                required?: undefined;
                additionalProperties?: undefined;
            } | {
                type: string;
                properties: {
                    parameters: {
                        type: string;
                        items: {
                            type: string;
                            properties: {
                                name: {
                                    type: string;
                                    title: string;
                                    description: string;
                                    pattern: string;
                                };
                                desc: {
                                    type: string;
                                    title: string;
                                    description: string;
                                };
                                spread: {
                                    type: string;
                                    title: string;
                                    description: string;
                                };
                            };
                            required: string[];
                            additionalProperties: boolean;
                        };
                        title: string;
                        description: string;
                    };
                    bits: {
                        type: string;
                        items: {
                            type: string;
                            minimum: number;
                            maximum: number;
                        };
                        minItems: number;
                        maxItems: number;
                        title: string;
                        description: string;
                    };
                    computation: {
                        type: string;
                        title: string;
                        description: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
                const?: undefined;
            })[];
        };
        OutputMeta: {
            anyOf: ({
                type: string;
                minimum: number;
                properties?: undefined;
                additionalProperties?: undefined;
            } | {
                type: string;
                properties: {
                    bits: {
                        type: string;
                        items: {
                            type: string;
                            minimum: number;
                            maximum: number;
                        };
                        minItems: number;
                        maxItems: number;
                        title: string;
                        description: string;
                    };
                    computation: {
                        type: string;
                        title: string;
                        description: string;
                    };
                };
                additionalProperties: boolean;
                minimum?: undefined;
            })[];
        };
    };
}
```
