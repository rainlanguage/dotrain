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

        install-js-deps = rainix.mkTask.${system} {
          name = "install-js-deps";
          body = ''
            set -euxo pipefail
            npm install
          '';
          additionalBuildInputs = [
            pkgs.wasm-bindgen-cli
            rainix.rust-toolchain.${system}
            rainix.rust-build-inputs.${system}
            rainix.node-build-inputs.${system}
          ];
        };

        build-js-bindings = rainix.mkTask.${system} {
          name = "build-js-bindings";
          body = ''
            set -euxo pipefail
            npm run build
          '';
          additionalBuildInputs = [
            pkgs.wasm-bindgen-cli
            rainix.rust-toolchain.${system}
            rainix.rust-build-inputs.${system}
            rainix.node-build-inputs.${system}
          ];
        };

        test-js-bindings = rainix.mkTask.${system} {
          name = "test-js-bindings";
          body = ''
            set -euxo pipefail
            npm test
          '';
          additionalBuildInputs = [
            rainix.node-build-inputs.${system}
          ];
        };

        js-bindings-docs = rainix.mkTask.${system} {
          name = "js-bindings-docs";
          body = ''
            set -euxo pipefail
            npm run docgen
          '';
          additionalBuildInputs = [
            rainix.node-build-inputs.${system}
          ];
        };
      } // rainix.packages.${system};

      # # For `nix build` & `nix run`:
      defaultPackage = packages.build-bin;

      # For `nix develop`:
      devShells = {
        js = pkgs.mkShell {
          nativeBuildInputs = [
            rainix.rust-toolchain.${system}
            rainix.rust-build-inputs.${system}
            rainix.node-build-inputs.${system}
          ] ++ (with pkgs; [ 
            wasm-bindgen-cli
          ]);
        };
      } // rainix.devShells.${system};
    }
  );
}