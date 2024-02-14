const { execSync } = require("child_process");

const cargo = JSON.parse(
    execSync("cargo read-manifest --manifest-path ./crates/dotrain/Cargo.toml"),
);
console.log(cargo.version);
