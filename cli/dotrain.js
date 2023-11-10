#!/usr/bin/env node

const path = require("path");
const { Command } = require("commander");
const { execSync } = require("child_process");
const { version } = require("../package.json");
const { Compile, Meta, keccak256, HASH_PATTERN } = require("../cjs.js");
const { readFileSync, writeFileSync, readdirSync, statSync } = require("fs");


// find .rain files recursively in a directory
function findFiles(dir) {
    const result = [];
    try {
        const items = readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            if (item.isFile()) {
                if (item.name.endsWith(".rain")) {
                    try {
                        const p = path.resolve(dir, item.name);
                        result.push([p, readFileSync(p).toString()]);
                    }
                    catch { /**/ }
                }
            }
            if (item.isDirectory()) {
                result.push(...findFiles(path.resolve(dir, item.name)));
            }
        }
    }
    catch { /**/ }
    return result;
}

// process common conf fields
async function processConf(metaStore, conf, parentDir) {
    if (conf.subgraphs !== undefined) {
        if (
            Array.isArray(conf.subgraphs) && 
            conf.subgraphs.every(v => typeof v === "string")
        ) await metaStore.addSubgraphs(conf.subgraphs, false);
        else throw "rainconfig: unexpected subgraphs type, expected array of urls.";
    }
    if (conf.meta !== undefined) {
        if (typeof conf.meta === "object") {
            if (conf.meta.binary) {
                if (
                    Array.isArray(conf.meta.binary) && 
                    conf.meta.binary.length > 0 &&
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
                else throw "rainconfig: unexpected meta.binary type, expected array of paths (or object with path and hash) of binary meta files";
            }
            if (conf.meta.hex) {
                if (
                    Array.isArray(conf.meta.hex) && 
                    conf.meta.hex.length > 0 &&
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
                else throw "rainconfig: unexpected meta.hex type, expected array of paths (or object with path and hash) of txt files containing the meta data as utf8 encoded hex string starting with 0x";
            }
        }
        else throw "rainconfig: unexpected meta type, expected object";
    }
    if (conf.include !== undefined) {
        if (
            Array.isArray(conf.include) && 
            conf.include.every(v => typeof v === "string")
        ) {
            for (const p of conf.include) {
                const d = path.resolve(parentDir, p);
                const stat = statSync(d);
                if (stat.isDirectory()) {
                    const files = findFiles(d);
                    for (const f of files) {
                        await metaStore.storeDotrain(f[1], f[0]);
                    }
                }
                if (stat.isFile() && p.endsWith(".rain")) {
                    const f = readFileSync(d).toString();
                    await metaStore.storeDotrain(f, d);
                }
            }
        }
        else throw "rainconfig: unexpected include type, expected array of directories";
    }
}


// read default rainconfig
function readDefaultConfig(parentDir) {
    const p1 = path.resolve(parentDir, "./rainconfig.json");
    const p2 = path.resolve(parentDir, "./.rainconfig.json");
    try {
        const conf = readFileSync(p1).toString();
        return conf;
    }
    catch (e) {
        try {
            const conf = readFileSync(p2).toString();
            return conf;
        }
        catch {
            throw e;
        }
    }
}

// main command
const cmd = new Command("dotrain");

// subcommand "compile"
const subcmd = new Command("compile");

const rainconfigCmd = new Command("rainconfig");

rainconfigCmd
    .description("show detailed information about rainconfig.json")
    .helpOption(false)
    .action(() => console.log(`
    Description:
    rainconfig.json provides configuration details and information required for .rain compiler.

    usually it should be placed at the root directory of the working workspace and named as 
    'rainconfig.json' or '.rainconfig.json', as by doing so it will automatically be read 
    and having rainlang vscode extension, it will provide autocomplete and information on 
    each field, however if this is not desired at times, it is possible to pass any path for 
    rainconfig when using the dotrain command using --config option.

    all fields in the rainconfig are optional and are as follows:

    - src: Specifies list of .rain source files mappings for compilation, where specified 
    .rain input files will get compiled and results written into output json file.

    - include: Specifies a list of directories (files/folders) to be included and watched. 
    'src' files are included by default and folders will be watched recursively for .rain files. 
    These files will be available as dotrain meta in the cas so if their hash is specified in a
    compilation target they will get resolved.

    - subgraphs: Additional subgraph endpoint URLs to include when searching for metas of 
    specified meta hashes in a rainlang document.

    - meta: Lis of paths (or object of path and hash) of local meta files as binary or utf8 
    encoded text file containing hex string starting with 0x. Binary meta files should go 
    under 'meta.binary' field and hex meta files should go under 'meta.hex' field.
  
`   ));

subcmd
    .description("compile a single .rain file.")
    .requiredOption("-e, --entrypoints <bindings...>", "Entrypoints to compile")
    .requiredOption("-i, --input <path>", "Path to .rain file")
    .requiredOption("-o, --output <path>", "Path to output file, output format is .json")
    .option("-l, --log", "Log the compilation result in terminal")
    .option("-c, --config <path>", "Path to the rainconfig json file(default is './rainconfig.json' or './.rainconfig.json' if not specified) that contains configurations, see './example.rainconfig.json' for more details.")
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
                    let conf;
                    if (opts.config) {
                        if (!opts.config.endsWith(".json")) {
                            throw "unexpected config file, expected json!";
                        }
                        conf = JSON.parse(readFileSync(
                            path.resolve(parentDir, opts.config)
                        ).toString());
                    }
                    else {
                        try {
                            conf = JSON.parse(readDefaultConfig(parentDir));
                        }
                        catch { /**/ }
                    }
                    if (conf) {
                        await processConf(metaStore, conf, parentDir);
                        if (conf.src !== undefined) {
                            if (Array.isArray(conf.src)) {
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
                                        const d = path.resolve(parentDir, map.input);
                                        const f = readFileSync(d).toString();
                                        await metaStore.storeDotrain(f, d);
                                    }
                                    else throw "rainconfig: unexpected src item, each src item should contain 'input' (path to .rain file), 'output' (path to output) and 'entrypoints'";
                                }
                            }
                            else throw "rainconfig: unexpected src type, expected array of objects.";
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
    .option("-c, --config <path>", "Path to the rainconfig json file(default is './rainconfig.json' or './.rainconfig.json' if not specified) that contains configurations, see './example.rainconfig.json' for more details.")
    .option("-s, --silent", "Print no std logs.")
    .version(version)
    .addCommand(subcmd)
    .addCommand(rainconfigCmd)
    .action(async (opts) => {
        try {
            const parentDir = execSync("pwd").toString().trim();
            let conf;
            if (opts.config) {
                if (!opts.config.endsWith(".json")) {
                    throw "unexpected config file, expected json!";
                }
                else {
                    conf = JSON.parse(readFileSync(
                        path.resolve(parentDir, opts.config)
                    ).toString());
                }
            }
            else conf = JSON.parse(readDefaultConfig(parentDir));
            const metaStore = new Meta.Store();
            const toBeCompiled = [];
            await processConf(metaStore, conf, parentDir);
            if (conf.src !== undefined && Array.isArray(conf.src)) {
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
                        const d = path.resolve(parentDir, map.input);
                        const f = readFileSync(d).toString();
                        await metaStore.storeDotrain(f, d);
                        toBeCompiled.push(map);
                    }
                    else throw "rainconfig: unexpected src item, each src item should contain 'input' (path to .rain file), 'output' (path to output) and 'entrypoints'";
                }
            }
            else throw "rainconfig: unexpected src type, expected array of objects.";

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
