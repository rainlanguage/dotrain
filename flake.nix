{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    naersk.url = "github:nix-community/naersk";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, flake-utils, naersk, nixpkgs }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = (import nixpkgs) {
          inherit system;
        };

        naersk' = pkgs.callPackage naersk {};

      in rec {
        
        # shell commands
        packages = rec {
          local-test = pkgs.writeShellScriptBin "local-test" ''
              npm test
          '';

          flush = pkgs.writeShellScriptBin "flush" ''
              rm -rf dist
              rm -rf docs
              rm -rf temp
          '';

          hard-flush = pkgs.writeShellScriptBin "hard-flush" ''
              flush
              rm -rf target
              rm -rf node_modules
          '';

          ci-test = pkgs.writeShellScriptBin "ci-test" ''
              hard-flush
              npm install
              build
              local-test
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
              hard-flush
              npm install
              build
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
        
        # For `nix build` & `nix run`:
        defaultPackage = naersk'.buildPackage {
          src = ./.;
          nativeBuildInputs = with pkgs; [ pkg-config openssl gmp ];
          cargoBuildOptions = (prev: prev ++ [
            "--features cli"
          ]);
        };

        # For `nix develop`:
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [ 
            gmp 
            iconv 
            rustup
            emscripten
            nodejs-18_x
            wasm-bindgen-cli
          ] ++ (with packages; [
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
            pkgs.darwin.apple_sdk.frameworks.Security
            pkgs.darwin.apple_sdk.frameworks.CoreFoundation
            pkgs.darwin.apple_sdk.frameworks.CoreServices
          ]);
          shellHook = '' npm install '';
        };
      }
    );
}
