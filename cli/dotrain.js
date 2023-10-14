#!/usr/bin/env node

const path = require("path");
const { Command } = require("commander");
const { Compile } = require("../cjs.js");
const { execSync } = require("child_process");
const { version } = require("../package.json");
const { readFileSync, writeFileSync } = require("fs");


const getOptions = async args => new Command("dotrain")
    .description("CLI command to compile a dotrain source file.")
    .option("-c, --compile <entrypoints...>", "Compiles specified entrypoints of --input .rain file to --output .json file")
    .option("-i, --input <path>", "Path to .rain file")
    .option("-o, --output <path>", "Path to output file, output format is .json")
    .option("-b, --batch <path...>", "Path to a json file that contains mappings details for compiling in batch, the path to the mapping array in the Json file can be specified as well with dot spearated keys (example 'compile.batch'), a mapping is an array of objects each having 3 keys 'input (path to .rain file)', 'output (path to output .json file)' and 'entrypoints (array of binding keys to compile)'")
    .option("-s, --stdout", "Log the result in terminal")
    .version(version)
    .parse(args)
    .opts();

const main = async args => {
    const options = await getOptions(args);
    const parentDir = execSync("pwd").toString().trim();
    if (!options.batch && !options.compile) throw "did you mean to use --compile (to compile 1 file) or --batch (to compile multiple files)?";

    if (options.batch) {
        if (options.compile) throw "cannot use --compile with --batch";
        if (options.input || options.output) throw "cannot use -i or -o in batch compile mode";
        if (options.batch.length > 2) throw "invalid args, can only take 2 args maximum, 1st argument should be the path to the mapping file, 2nd argument (optional) inner path to the mapping array specified with dot separated keys";
        if (options.batch.length < 1) throw "path to the mapping file is required";

        const ENTRYPOINT_PATTERN = /^[a-z][0-9a-z-]*$/;
        const JSON_PATH_PATTERN = /^(\.?\.?\/)(\.\/|\.\.\/|[^]*\/)*[^]+\.json$/;
        const DOTRAIN_PATH_PATTERN = /^(\.?\.?\/)(\.\/|\.\.\/|[^]*\/)*[^]+\.rain$/;

        const mappingPath = path.resolve(parentDir, options.batch[0]);
        const innerPath = options.batch[1]
            ? Array.from(options.batch[1].matchAll(/[^.]+/g)).map(v => v[0])
            : null;

        const mappingFileContent = JSON.parse(readFileSync(mappingPath).toString());
        let mappingContent = mappingFileContent;
        if (innerPath && innerPath.length > 0) for (let i = 0; i < innerPath.length; i++) {
            mappingContent = mappingContent[innerPath[i]];
        }
        if (
            Array.isArray(mappingContent) 
            && mappingContent.length 
            && mappingContent.every(v => typeof v.input === "string"
                && v.input
                && DOTRAIN_PATH_PATTERN.test(v.input)
                && typeof v.output === "string"
                && v.output
                && JSON_PATH_PATTERN.test(v.output)
                && Array.isArray(v.entrypoints)
            )
        ) {
            for (let i = 0; i < mappingContent.length; i++) {
                const dotrainContent = readFileSync(
                    path.resolve(parentDir, mappingContent[i].input)
                ).toString();
                const result = await Compile.RainDocument(
                    dotrainContent, 
                    mappingContent[i].entrypoints
                );
                const text = JSON.stringify(result, null, 2);
                writeFileSync(
                    path.resolve(parentDir, mappingContent[i].output) ,
                    text
                );
                if (options.stdout) console.log("\x1b[90m%s\x1b[0m", text);
                console.log("\n");
            }
            console.log("\x1b[32m%s\x1b[0m", "Compiled all files successfully!");
        }
        else throw "invalid mapping file content";
    }
    else {
        if (options.compile) {
            if (Array.isArray(options.compile) && options.compile.length > 0) {
                if (!options.input.endsWith(".rain")) throw "invalid input file!";
                else {
                    const content = readFileSync(
                        path.resolve(parentDir, options.input)
                    ).toString();
                    const result = await Compile.RainDocument(content, options.compile);
                    const text = JSON.stringify(result, null, 2);
                    writeFileSync(
                        options.output.endsWith(".json") 
                            ? path.resolve(parentDir, options.output) 
                            : path.resolve(parentDir, options.output) + ".json", 
                        text
                    );
                    if (options.stdout) console.log("\x1b[90m%s\x1b[0m", text);
                    console.log("\n");
                    console.log("\x1b[32m%s\x1b[0m", "Compiled successfully!");
                }
            }
            else throw "invalid entrypoints!";
        }
    }
};

main(
    process.argv
).then(
    () => { 
        process.exit(0); 
    }
).catch(
    v => {
        console.log("\x1b[31m%s\x1b[0m", "An error occured during execution: ");
        console.log(v);
        process.exit(1);
    }
);
