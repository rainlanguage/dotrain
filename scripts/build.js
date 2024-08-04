const fs = require("fs");
const { execSync } = require("child_process");

const args = process.argv.slice(2);

if (args[0] === "check") {
    if (fs.existsSync("./dist")) return;
}

execSync("npm run rm-dist");
execSync("npm run build");
