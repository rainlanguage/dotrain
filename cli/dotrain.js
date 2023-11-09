#!/usr/bin/env node

const path = require("path");
const { Command } = require("commander");
const { Compile, Meta } = require("../cjs.js");
const { execSync } = require("child_process");
const { version } = require("../package.json");
const { readFileSync, writeFileSync } = require("fs");
const { keccak256 } = require("@rainprotocol/meta");


const cmd = new Command("dotrain");
const subcmd = new Command("compile");
subcmd
    .description("compile a single .rain file.")
    .requiredOption("-e, --entrypoints <bindings...>", "Entrypoints to compile")
    .requiredOption("-i, --input <path>", "Path to .rain file")
    .requiredOption("-o, --output <path>", "Path to output file, output format is .json")
    .option("-l, --log", "Log the result in terminal")
    .option("-c, --config <path>", "Path to a config json file(default is './config.rain.json' if not specified) that contains configurations to get local meta files and subgraphs, see 'example.config.rain.json' for more details.")
    .option("-s, --silent", "Print no std logs.")
    .action(async (_, cmd) => {
        const opts = cmd.optsWithGlobals();
        console.log(opts);
        try {
            if (Array.isArray(opts.entrypoints) && opts.entrypoints.length > 0) {
                if (!opts.input.endsWith(".rain")) throw "invalid input file!";
                else {
                    const parentDir = execSync("pwd").toString().trim();
                    const content = readFileSync(
                        path.resolve(parentDir, opts.input)
                    ).toString();
                    const metaStore = new Meta.Store();
                    let configPath = path.resolve(parentDir, "./config.rain.json");
                    let configContent;
                    if (opts.config) {
                        if (!opts.config.endsWith(".json")) {
                            throw "unexpected config file, expected json!";
                        }
                        else configPath = path.resolve(parentDir, opts.config);
                    }
                    try {
                        configContent = JSON.parse(readFileSync(configPath).toString());
                    }
                    catch { /* */ }
                    if (configContent) {
                        if (configContent.subgraphs) {
                            if (
                                Array.isArray(configContent.subgraphs) && 
                                configContent.subgraphs.every(v => typeof v === "string")
                            ) metaStore.addSubgraphs(configContent.subgraphs, false);
                            else throw "config: unexpected subgraphs type, expected string array.";
                        }
                        if (configContent.meta) {
                            if (typeof configContent.meta === "object") {
                                if (configContent.meta.binary) {
                                    if (
                                        Array.isArray(configContent.meta.binary) && 
                                        configContent.meta.binary.every(v => typeof v === "string")
                                    ) {
                                        for (const p of configContent.meta.binary) {
                                            const meta = "0x" + readFileSync(
                                                path.resolve(parentDir, p), 
                                                {encoding: "hex"}
                                            );
                                            const hash = keccak256(meta);
                                            await metaStore.update(hash, meta);
                                        }
                                    }
                                    else throw "config: unexpected meta.binary type, expected array of paths of binary files containing the meta data";
                                }
                                if (configContent.meta.hex) {
                                    if (
                                        Array.isArray(configContent.meta.hex) && 
                                        configContent.meta.hex.every(v => typeof v === "string")
                                    ) {
                                        for (const p of configContent.meta.hex) {
                                            const meta = readFileSync(
                                                path.resolve(parentDir, p)
                                            ).toString();
                                            const hash = keccak256(meta);
                                            await metaStore.update(hash, meta);
                                        }
                                    }
                                    else throw "config: unexpected meta.hex type, expected array of paths of txt files containing the meta data as utf8 encoded hex string starting with 0x";
                                }
                            }
                            else throw "config: unexpected meta type, expected object";
                        }
                    }
                    const result = await Compile.RainDocument(
                        content, 
                        opts.entrypoints, 
                        { metaStore }
                    );
                    const text = JSON.stringify(result, null, 2);
                    writeFileSync(
                        opts.output.endsWith(".json") 
                            ? path.resolve(parentDir, opts.output) 
                            : path.resolve(parentDir, opts.output) + ".json", 
                        text
                    );
                    if (opts.log) console.log("\x1b[90m%s\x1b[0m", text);
                    if (!opts.silent) console.log("\x1b[32m%s\x1b[0m", "Compiled successfully!");
                    // process.exit(0);
                }
            }
            else throw "invalid entrypoints!";
        }
        catch (error) {
            console.log("\x1b[31m%s\x1b[0m", "An error occured during execution: ");
            console.log(error);
            process.exit(1);
        }
    });

cmd
    .description("CLI command to compile a dotrain file(s).")
    .option("-c, --config <path>", "Path to a config json file(default is './config.rain.json' if not specified) that contains configurations, which can contain: mappings details for compiling, path of local meta files, list of subgraph endpoints, see 'example.config.rain.json' for more details.")
    .option("-s, --silent", "Print no std logs.")
    .version(version)
    .addCommand(subcmd)
    .action(async (opts) => {
        try {
            const parentDir = execSync("pwd").toString().trim();
            let configPath = path.resolve(parentDir, "./config.rain.json");
            if (opts.config) {
                if (!opts.config.endsWith(".json")) {
                    throw "unexpected config file, expected json!";
                }
                else configPath = path.resolve(parentDir, opts.config);
            }
        
            const configContent = JSON.parse(readFileSync(configPath).toString());
            const metaStore = new Meta.Store();
            const filesToCompile = [];
            if (configContent.subgraphs !== undefined) {
                if (
                    Array.isArray(configContent.subgraphs) && 
                    configContent.subgraphs.every(v => typeof v === "string")
                ) metaStore.addSubgraphs(configContent.subgraphs, false);
                else throw "config: unexpected subgraphs type, expected string array.";
            }
            if (configContent.meta !== undefined) {
                if (typeof configContent.meta === "object") {
                    if (configContent.meta.binary) {
                        if (
                            Array.isArray(configContent.meta.binary) && 
                            configContent.meta.binary.every(v => typeof v === "string")
                        ) {
                            for (const p of configContent.meta.binary) {
                                const meta = "0x" + readFileSync(path.resolve(parentDir, p), {encoding: "hex"});
                                const hash = keccak256(meta);
                                await metaStore.update(hash, meta);
                            }
                        }
                        else throw "config: unexpected meta.binary type, expected array of paths of binary files containing the meta data";
                    }
                    if (configContent.meta.hex) {
                        if (
                            Array.isArray(configContent.meta.hex) && 
                            configContent.meta.hex.every(v => typeof v === "string")
                        ) {
                            for (const p of configContent.meta.hex) {
                                const meta = readFileSync(
                                    path.resolve(parentDir, p)
                                ).toString();
                                const hash = keccak256(meta);
                                await metaStore.update(hash, meta);
                            }
                        }
                        else throw "config: unexpected meta.hex type, expected array of paths of txt files containing the meta data as utf8 encoded hex string starting with 0x";
                    }
                }
                else throw "config: unexpected meta type, expected object";
            }
            if (
                configContent.compile !== undefined && 
                Array.isArray(configContent.compile) && 
                configContent.compile.length > 0
            ) {
                for (const map of configContent.compile) {
                    if (
                        typeof map === "object" && 
                        map.input !== undefined && 
                        map.output !== undefined && 
                        map.entrypoints !== undefined && 
                        typeof map.input === "string" && 
                        typeof map.output === "string" && 
                        map.input.endsWith(".rain") &&
                        Array.isArray(map.entrypoints) && 
                        map.entrypoints.every(v => typeof v === "string")
                    ) {
                        filesToCompile.push(map);
                    }
                    else throw "unexpected compile map, each compile mapping should contain 'input - path to .rain file', 'output - path to output' and 'entrypoints - array of entrypoints'";
                }
            }
            else throw "config: unexpected compile type, expected array of compile mappings.";

            const filesToWrite = [];
            for (const map of filesToCompile) {
                const dotrainContent = readFileSync(
                    path.resolve(parentDir, map.input)
                ).toString();
                const result = await Compile.RainDocument(
                    dotrainContent, 
                    map.entrypoints,
                    { metaStore }
                );
                filesToWrite.push([JSON.stringify(result, null, 2), map.output]);
            }
            for (const file of filesToWrite) {
                writeFileSync(
                    file[1].endsWith(".json") 
                        ? path.resolve(parentDir,file[1]) 
                        : path.resolve(parentDir,file[1]) + ".json", 
                    file[0]
                );
            }
            if (!opts.silent) console.log("\x1b[32m%s\x1b[0m", "Compiled successfully!");
        }
        catch (error) {
            console.log("\x1b[31m%s\x1b[0m", "An error occured during execution: ");
            console.log(error);
            process.exit(1);
        }
    });

const main = async args => {
    await cmd.parseAsync(args);
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
