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

      rust-version = "1.75.0";

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
        buildInputs = pkgs.openssl;
        nativeBuildInputs = with pkgs; [ 
          pkg-config
        ] ++ lib.optionals stdenv.isDarwin [
          darwin.apple_sdk.frameworks.SystemConfiguration
        ];
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
          openssl
          pkg-config
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
        ] ++ lib.optionals stdenv.isDarwin [
          darwin.apple_sdk.frameworks.SystemConfiguration
        ]);
        shellHook = '' npm install '';
      };
    }
  );
}
