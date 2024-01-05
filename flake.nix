{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    naersk.url = "github:nix-community/naersk";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, flake-utils, naersk, nixpkgs, rust-overlay }:

  flake-utils.lib.eachDefaultSystem (system:
    let

      overlays = [ (import rust-overlay) ];

      pkgs = (import nixpkgs) {
        inherit system overlays;
      };

      rust-version = "latest";

      rust = pkgs.rust-bin.stable.${rust-version}.default.override {
        targets = [ "wasm32-unknown-unknown" ];
      };

    in rec {
      # # For `nix build` & `nix run`:
      defaultPackage = (pkgs.makeRustPlatform{
        rustc = rust;
        cargo = rust;
      }).buildRustPackage {
        src = ./.;
        doCheck = false;
        name = "dotrain";
        cargoLock.lockFile = ./Cargo.lock;
        # allows for git deps to be resolved without the need to specify their outputHash
        cargoLock.allowBuiltinFetchGit = true;
        buildPhase = ''
          cargo build --release --bin dotrain --features cli
        '';
        installPhase = ''
          mkdir -p $out/bin
          cp target/release/dotrain $out/bin/
        '';
        buildInputs = [
          rust
        ] ++ (with pkgs; [ 
          iconv 
          openssl 
          pkg-config
        ]) ++ (pkgs.lib.optionals pkgs.stdenv.isDarwin [
          pkgs.libiconv
          pkgs.darwin.apple_sdk.frameworks.Security
          pkgs.darwin.apple_sdk.frameworks.CoreServices
          pkgs.darwin.apple_sdk.frameworks.CoreFoundation
          pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
        ]);
        # pname = "dotrain";
        # version = "0.0.0";
        # cargoBuildType = "release";
        # cargoBuildFlags
        # cargoBuildFeatures = ["cli"];
      };

      # For `nix develop`:
      devShell = pkgs.mkShell {
        nativeBuildInputs = [
          rust
        ] ++ (with pkgs; [ 
          iconv 
          emscripten
          nodejs-18_x
          wasm-bindgen-cli
        ]) ++ (with node-cmd; [
          build
          hard-build
          build-wasm
          build-bindings
          node-bg
          web-bg
          local-test
          ci-test
          flush
          hard-flush
          docgen
          lint
          lint-fix
          lint-bindings
        ]) ++ (pkgs.lib.optionals pkgs.stdenv.isDarwin [
          pkgs.libiconv
          pkgs.darwin.apple_sdk.frameworks.Security
          pkgs.darwin.apple_sdk.frameworks.CoreServices
          pkgs.darwin.apple_sdk.frameworks.CoreFoundation
          pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
        ]);
        shellHook = '' npm install '';
      };

      # dev shell npm commands
      node-cmd = rec {
        local-test = pkgs.writeShellScriptBin "local-test" ''
          npm test
        '';

        flush = pkgs.writeShellScriptBin "flush" ''
          rm -rf dist
          rm -rf docs
          rm -rf temp
        '';

        hard-flush = pkgs.writeShellScriptBin "hard-flush" ''
          rm -rf dist
          rm -rf docs
          rm -rf temp
          rm -rf target
          rm -rf node_modules
        '';

        ci-test = pkgs.writeShellScriptBin "ci-test" ''
          ${hard-flush}/bin/hard-flush
          npm install
          npm run build
          npm test
        '';

        build-wasm = pkgs.writeShellScriptBin "build-wasm" ''
          npm run build-wasm
        '';

        node-bg = pkgs.writeShellScriptBin "node-bg" ''
          npm run node-bg
        '';

        web-bg = pkgs.writeShellScriptBin "web-bg" ''
          npm run web-bg
        '';

        build-bindings = pkgs.writeShellScriptBin "build-bindings" ''
          npm run build-bindings
        '';

        build = pkgs.writeShellScriptBin "build" ''
          npm run build
        '';

        hard-build = pkgs.writeShellScriptBin "hard-build" ''
          ${hard-flush}/bin/hard-flush
          npm install
          npm run build
        '';

        docgen = pkgs.writeShellScriptBin "docgen" ''
          npm run docgen
        '';

        lint = pkgs.writeShellScriptBin "lint" ''
          npm run lint
        '';

        lint-fix = pkgs.writeShellScriptBin "lint-fix" ''
          npm run lint-fix
        '';

        lint-bindings = pkgs.writeShellScriptBin "lint-bindings" ''
          npm run lint-bindings
        '';
      };
    }
  );
}
