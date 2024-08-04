{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    rainix.url = "github:rainprotocol/rainix";
  };

  outputs = { self, flake-utils, rainix }:

  flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = rainix.pkgs.${system};
    in rec {
      packages = {
        build-bin = (pkgs.makeRustPlatform{
          rustc = rainix.rust-toolchain.${system};
          cargo = rainix.rust-toolchain.${system};
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
        };

        build-js-bindings = rainix.mkTask.${system} {
          name = "build-js-bindings";
          body = ''
            set -euxo pipefail
            npm install
            npm run build
          '';
        };

        test-js-bindings = rainix.mkTask.${system} {
          name = "test-js-bindings";
          body = ''
            set -euxo pipefail
            npm test
          '';
        };

        js-bindings-docs = rainix.mkTask.${system} {
          name = "js-bindings-docs";
          body = ''
            set -euxo pipefail
            npm run docgen
          '';
        };
      } // rainix.packages.${system};

      # # For `nix build` & `nix run`:
      defaultPackage = packages.build-bin;

      # For `nix develop`:
      devShells.default = pkgs.mkShell {
        packages = [
          packages.build-js-bindings
          packages.test-js-bindings
          packages.js-bindings-docs
          packages.rainix-rs-prelude
          packages.rainix-rs-static
          packages.rainix-rs-test
          packages.rainix-rs-artifacts
        ];
        buildInputs = [
          rainix.rust-toolchain.${system}
          rainix.rust-build-inputs.${system}
          rainix.node-build-inputs.${system}
        ] ++ (with pkgs; [ 
          wasm-bindgen-cli
        ]);
      };
    }
  );
}