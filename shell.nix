let
    pkgs = import
        (builtins.fetchTarball {
            name = "nixos-unstable-2022-09-26";
            url = "https://github.com/nixos/nixpkgs/archive/b8e83fd7e16529ee331313993508c3bf918f1d57.tar.gz";
            sha256 = "1a98pgnhdhyg66176i36rcn3rklihy36y9z4176la7pxlzm4khwf";
        })
        { };

    local-test = pkgs.writeShellScriptBin "local-test" ''
        yarn run test
    '';

    flush-all = pkgs.writeShellScriptBin "flush-all" ''
        rm -rf dist
        rm -rf node_modules
    '';

    ci-test = pkgs.writeShellScriptBin "ci-test" ''
        flush-all
        yarn install
        local-test
    '';

    build = pkgs.writeShellScriptBin "build" ''
        yarn run build
    '';

    build-all = pkgs.writeShellScriptBin "build-all" ''
        flush-all
        yarn install
    '';

    docgen = pkgs.writeShellScriptBin "docgen" ''
        yarn run docgen
    '';

    lint = pkgs.writeShellScriptBin "lint" ''
        yarn run lint
    '';

    in
    pkgs.stdenv.mkDerivation {
        name = "shell";
        buildInputs = [
            pkgs.nixpkgs-fmt
            pkgs.yarn
            pkgs.nodejs-16_x
            build
            build-all
            local-test
            ci-test
            flush-all
            docgen
            lint
        ];

        shellHook = ''
            export PATH=$( npm bin ):$PATH
            # keep it fresh
            yarn install
        '';
    }
