const fs = require("fs");
const { execSync } = require("child_process");

const args = process.argv.slice(2);

if (args[0] === "check") {
    // exit early if already built
    // for npm install from an already built and packed package
    if (fs.existsSync("./dist")) return;
}

console.log("building wasm...");
execSync("npm run rm-dist");
execSync("npm run nix-build");
