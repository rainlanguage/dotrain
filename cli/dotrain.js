#!/usr/bin/env node

const path = require("path");
const { Command } = require("commander");
const { execSync } = require("child_process");
const { version } = require("../package.json");
const { rainlangc, rainlangd } = require("../cjs.js");
const { readFileSync, writeFileSync } = require("fs");


const getOptions = async args => new Command("dotrain")
    .description("CLI command to compile/decompile a source file.")
    .option("-c, --compile <expressions...>", "Use compiling mode with specified expression names, to compile a .rain file to ExpressionConfig output in a .json")
    .option("-d, --decompile <op meta hash>", "Use decompiling mode with a specific opmeta hash, to decompile an ExpressionConfig in a .json to a .rain")
    .requiredOption("-i, --input <path>", "Path to input file, either a .rain file for compiling or .json for decompiling")
    .requiredOption("-o, --output <path>", "Path to output file, will output .json for compile mode and .rain for decompile mode")
    .option("-s, --stdout", "Log the result in terminal")
    .version(version)
    .parse(args)
    .opts();

const main = async args => {
    const options = await getOptions(args);
    const parentDir = execSync("pwd").toString().trim();

    if (options.compile && options.decompile) throw "cannot use both modes at the same time!";
    else {
        if (options.compile) {
            if (Array.isArray(options.compile) && options.compile.length > 0) {
                if (!options.input.endsWith(".rain")) throw "invalid input file!";
                else {
                    const content = readFileSync(
                        path.resolve(parentDir, options.input)
                    ).toString();
                    const result = await rainlangc(content, options.compile);
                    writeFileSync(
                        options.output.endsWith(".json") 
                            ? path.resolve(parentDir, options.output) 
                            : path.resolve(parentDir, options.output) + ".json", 
                        JSON.stringify(result, null, 2)
                    );
                    if (options.stdout) console.log(JSON.stringify(result, null, 2));
                    console.log("\n");
                    console.log("\x1b[32m%s\x1b[0m", "Compiled successfully!");
                }
            }
            else throw "invalid expressions!";
        }
        if (options.decompile) {
            if (!options.input.endsWith(".json")) throw "invalid input file!";
            else {
                const content = readFileSync(
                    path.resolve(parentDir, options.input)
                ).toString();
                const result = await rainlangd(JSON.parse(content), options.decompile);
                writeFileSync(
                    options.output.endsWith(".json") 
                        ? path.resolve(parentDir, options.output) 
                        : path.resolve(parentDir, options.output) + ".rain", 
                    result.getText()
                );
                if (options.stdout) console.log(result.getText());
                console.log("\n");
                console.log("\x1b[32m%s\x1b[0m", "Decompiled successfully!");
            }
        }
    }
};

main(
    process.argv
).then(
    () => { process.exit(0); }
).catch(
    (v) => {
        console.log("\x1b[31m%s\x1b[0m", "An error occured during execution: ");
        console.log(v);
        process.exit(1);
    }
);