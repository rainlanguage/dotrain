{
  description = "Flake for development workflows.";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    rainix.url = "github:rainprotocol/rainix/55d54c541913cd36aa14f8ec454e5ca80fc00389";
  };

  outputs = { self, flake-utils, rainix }:

  flake-utils.lib.eachDefaultSystem (system:
    let

      pkgs = rainix.pkgs.${system};
    
      rust-version = "1.75.0";

      rust-toolchain = pkgs.rust-bin.stable.${rust-version}.default.override {
        targets = [ "wasm32-unknown-unknown" ];
      };

    in rec {

      packages = rainix.packages.${system};
      
      # # For `nix build` & `nix run`:
      defaultPackage = (pkgs.makeRustPlatform{
        rustc = rust-toolchain;
        cargo = rust-toolchain;
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
          openssl 
        ];
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
          rust-toolchain
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