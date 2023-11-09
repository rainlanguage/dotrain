#!/usr/bin/env node

const path = require("path");
const { Command } = require("commander");
const { execSync } = require("child_process");
const { version } = require("../package.json");
const { readFileSync, writeFileSync } = require("fs");
const { Compile, Meta, keccak256, HASH_PATTERN } = require("../cjs.js");

// main command
const cmd = new Command("dotrain");

// subcommand "compile"
const subcmd = new Command("compile");

subcmd
    .description("compile a single .rain file.")
    .requiredOption("-e, --entrypoints <bindings...>", "Entrypoints to compile")
    .requiredOption("-i, --input <path>", "Path to .rain file")
    .requiredOption("-o, --output <path>", "Path to output file, output format is .json")
    .option("-l, --log", "Log the compilation result in terminal")
    .option("-c, --config <path>", "Path to a config json file(default is './config.rain.json' if not specified) that contains configurations to get local meta files and subgraphs, see 'example.config.rain.json' for more details.")
    .option("-s, --silent", "Print no informative logs, except compilation results if --log is used")
    .action(async (_, cmd) => {
        // since --config and --silent are global options, they arent present in local options (first arg: _)
        // so we get all options from cmd using optsWithGlobals() method of the command object (second arg: cmd)
        const opts = cmd.optsWithGlobals();
        try {
            if (Array.isArray(opts.entrypoints) && opts.entrypoints.length > 0) {
                if (!opts.input.endsWith(".rain")) throw "invalid input file!";
                else {
                    const parentDir = execSync("pwd").toString().trim();
                    const content = readFileSync(
                        path.resolve(parentDir, opts.input)
                    ).toString();
                    const metaStore = new Meta.Store();
                    let confPath = path.resolve(parentDir, "./config.rain.json");
                    let conf;
                    if (opts.config) {
                        if (!opts.config.endsWith(".json")) {
                            throw "unexpected config file, expected json!";
                        }
                        else confPath = path.resolve(parentDir, opts.config);
                        conf = JSON.parse(readFileSync(confPath).toString());
                    }
                    else {
                        try {
                            conf = JSON.parse(readFileSync(confPath).toString());
                        }
                        catch { /* */ }
                    }
                    if (conf) {
                        if (conf.subgraphs !== undefined) {
                            if (
                                Array.isArray(conf.subgraphs) && 
                                conf.subgraphs.every(v => typeof v === "string")
                            ) metaStore.addSubgraphs(conf.subgraphs, false);
                            else throw "config: unexpected subgraphs type, expected string array.";
                        }
                        if (conf.meta !== undefined) {
                            if (typeof conf.meta === "object") {
                                if (conf.meta.binary) {
                                    if (
                                        Array.isArray(conf.meta.binary) && 
                                        conf.meta.binary.every(v => 
                                            typeof v === "string" ||
                                            ( 
                                                typeof v === "object" &&
                                                v.path !== undefined &&
                                                v.hash !== undefined &&
                                                typeof v.path === "string" &&
                                                typeof v.hash === "string" &&
                                                HASH_PATTERN.test(v.hash)
                                            )
                                        )
                                    ) {
                                        for (const p of conf.meta.binary) {
                                            const meta = "0x" + readFileSync(
                                                path.resolve(
                                                    parentDir, 
                                                    typeof p === "string" ? p : p.path
                                                ), 
                                                { encoding: "hex" }
                                            );
                                            const hash = typeof p === "string" ? keccak256(meta) : p.hash;
                                            await metaStore.update(hash, meta);
                                        }
                                    }
                                    else throw "config: unexpected meta.binary type, expected array of paths (or object with path and hash) of binary files containing the meta data";
                                }
                                if (conf.meta.hex) {
                                    if (
                                        Array.isArray(conf.meta.hex) && 
                                        conf.meta.hex.every(v => 
                                            typeof v === "string" ||
                                            ( 
                                                typeof v === "object" &&
                                                v.path !== undefined &&
                                                v.hash !== undefined &&
                                                typeof v.path === "string" &&
                                                typeof v.hash === "string" &&
                                                HASH_PATTERN.test(v.hash)
                                            )
                                        )
                                    ) {
                                        for (const p of conf.meta.hex) {
                                            const meta = readFileSync(
                                                path.resolve(
                                                    parentDir, 
                                                    typeof p === "string" ? p : p.path
                                                )
                                            ).toString();
                                            const hash = typeof p === "string" ? keccak256(meta) : p.hash;
                                            await metaStore.update(hash, meta);
                                        }
                                    }
                                    else throw "config: unexpected meta.hex type, expected array of paths (or object with path and hash) of txt files containing the meta data as utf8 encoded hex string starting with 0x";
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
    .description("CLI command to run dotrain compiler.")
    .option("-c, --config <path>", "Path to a config json file(default is './config.rain.json' if not specified) that contains configurations, which can contain: list of mapping details for compiling, path of local meta files, list of subgraph endpoints, see 'example.config.rain.json' for more details.")
    .option("-s, --silent", "Print no std logs.")
    .version(version)
    .addCommand(subcmd)
    .action(async (opts) => {
        try {
            const parentDir = execSync("pwd").toString().trim();
            let confPath = path.resolve(parentDir, "./config.rain.json");
            if (opts.config) {
                if (!opts.config.endsWith(".json")) {
                    throw "unexpected config file, expected json!";
                }
                else confPath = path.resolve(parentDir, opts.config);
            }
            const conf = JSON.parse(readFileSync(confPath).toString());
            const metaStore = new Meta.Store();
            const toBeCompiled = [];
            if (conf.subgraphs !== undefined) {
                if (
                    Array.isArray(conf.subgraphs) && 
                    conf.subgraphs.every(v => typeof v === "string")
                ) metaStore.addSubgraphs(conf.subgraphs, false);
                else throw "config: unexpected subgraphs type, expected string array.";
            }
            if (conf.meta !== undefined) {
                if (typeof conf.meta === "object") {
                    if (conf.meta.binary) {
                        if (
                            Array.isArray(conf.meta.binary) && 
                            conf.meta.binary.every(v => typeof v === "string")
                        ) {
                            for (const p of conf.meta.binary) {
                                const meta = "0x" + readFileSync(path.resolve(parentDir, p), { encoding: "hex" });
                                const hash = keccak256(meta);
                                await metaStore.update(hash, meta);
                            }
                        }
                        else throw "config: unexpected meta.binary type, expected array of paths (or object with path and hash) of binary files containing the meta data";
                    }
                    if (conf.meta.hex) {
                        if (
                            Array.isArray(conf.meta.hex) && 
                            conf.meta.hex.every(v => typeof v === "string")
                        ) {
                            for (const p of conf.meta.hex) {
                                const meta = readFileSync(
                                    path.resolve(parentDir, p)
                                ).toString();
                                const hash = keccak256(meta);
                                await metaStore.update(hash, meta);
                            }
                        }
                        else throw "config: unexpected meta.hex type, expected array of paths (or object with path and hash) of txt files containing the meta data as utf8 encoded hex string starting with 0x";
                    }
                }
                else throw "config: unexpected meta type, expected object";
            }
            if (
                conf.src !== undefined && 
                Array.isArray(conf.src) && 
                conf.src.length > 0
            ) {
                for (const map of conf.src) {
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
                        toBeCompiled.push(map);
                    }
                    else throw "unexpected compile map, each compile mapping should contain 'input - path to .rain file', 'output - path to output' and 'entrypoints - array of entrypoints'";
                }
            }
            else throw "config: unexpected compile type, expected array of compile mappings.";

            const toBeWritten = [];
            for (const map of toBeCompiled) {
                const dotrainContent = readFileSync(
                    path.resolve(parentDir, map.input)
                ).toString();
                const result = await Compile.RainDocument(
                    dotrainContent, 
                    map.entrypoints,
                    { metaStore }
                );
                toBeWritten.push([JSON.stringify(result, null, 2), map.output]);
            }
            for (const file of toBeWritten) {
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
