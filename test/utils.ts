/**
 * Deployer Address to fetch the opmeta from subgraph
 */
export const deployerAddress = "0x01D5611c2D6FB7Bb1bFa9df2f524196743f59F2a";

export function rainlang(
    strings: TemplateStringsArray,
    ...vars: any[]
): string {
    let result = "";
    for (let i = 0; i < strings.length; i++) {
        result = result + strings[i] + (vars[i] ?? "");
    }
    return result;
}