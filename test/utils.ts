/**
 * Deployer Address to fetch the opmeta from subgraph
 */
export const deployerAddress = "0x017d5bb72b6c21202382e5f0d2ac0a8a6804a9f7";

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