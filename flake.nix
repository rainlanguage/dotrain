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
        buildInputs = with pkgs; [ 
          gmp
          iconv 
          openssl 
          pkg-config
        ] ++ (lib.optionals stdenv.isDarwin [
          libiconv
          darwin.apple_sdk.frameworks.Security
          darwin.apple_sdk.frameworks.CoreServices
          darwin.apple_sdk.frameworks.CoreFoundation
          darwin.apple_sdk.frameworks.SystemConfiguration
        ]);
        nativeBuildInputs = with pkgs; [ 
          gmp
          iconv 
          openssl 
          pkg-config
        ] ++ (lib.optionals stdenv.isDarwin [
          libiconv
          darwin.apple_sdk.frameworks.Security
          darwin.apple_sdk.frameworks.CoreServices
          darwin.apple_sdk.frameworks.CoreFoundation
          darwin.apple_sdk.frameworks.SystemConfiguration
        ]);
        # pname = "dotrain";
        # version = "0.0.0";
        # cargoBuildType = "release";
        # cargoBuildFlags = [];
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
          (writeShellScriptBin "flush" ''
            rm -rf dist
            rm -rf docs
            rm -rf temp
          '')
          (writeShellScriptBin "hard-flush" ''
            rm -rf dist
            rm -rf docs
            rm -rf temp
            rm -rf target
            rm -rf node_modules
          '')
          (writeShellScriptBin "hard-build" ''
            hard-flush
            npm install
            npm run build
          '')
        ]) ++ (pkgs.lib.optionals pkgs.stdenv.isDarwin [
          pkgs.libiconv
          pkgs.darwin.apple_sdk.frameworks.Security
          pkgs.darwin.apple_sdk.frameworks.CoreServices
          pkgs.darwin.apple_sdk.frameworks.CoreFoundation
          pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
        ]);
        shellHook = '' npm install '';
      };
    }
  );
}
