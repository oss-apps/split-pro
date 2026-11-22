{
  description = "SplitPro development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs =
    { self, nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      inherit (nixpkgs) lib;

      # Only the files that `next build` needs, so that unrelated edits don't cause a rebuild.
      src = lib.fileset.toSource {
        root = ./.;
        fileset = lib.fileset.unions [
          ./src
          ./public
          ./prisma
          ./worker
          ./package.json
          ./pnpm-lock.yaml
          ./pnpm-workspace.yaml
          ./next.config.js
          ./next-i18next.config.js
          ./postcss.config.cjs
          ./prisma.config.ts
          ./tsconfig.json
          ./components.json
        ];
      };
      baseVersion = (lib.importJSON ./package.json).version;
      date = self.lastModifiedDate or "19700101";
      version = "${baseVersion}-unstable-${builtins.substring 0 4 date}-${builtins.substring 4 2 date}-${builtins.substring 6 2 date}";
      pnpmDepsHash = "sha256-cGUS42ae6kamzLyukZuBPWq/qEsskqJnHN1dHl/jb6U=";
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          split-pro = (pkgs.callPackage ./nix/package.nix { }).overrideAttrs (prev: {
            inherit src version;
            pnpmDeps = prev.pnpmDeps.overrideAttrs { outputHash = pnpmDepsHash; };
          });
          default = split-pro;
        }
      );

      # nix/module.nix is the module for nixpkgs, where the package defaults to pkgs.split-pro.
      # Until SplitPro is in nixpkgs, the module exported here defaults to this checkout's
      # package instead.
      nixosModules = rec {
        split-pro =
          { lib, pkgs, ... }:
          {
            imports = [ ./nix/module.nix ];
            services.split-pro.package =
              lib.mkDefault
                self.packages.${pkgs.stdenv.hostPlatform.system}.split-pro;
          };
        default = split-pro;
      };

      checks = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          split-pro = self.packages.${system}.split-pro;
        in
        {
          inherit (split-pro.tests) envCoverage;
          # nix/package.nix needs a literal version, because nixpkgs can't read package.json
          # without import from derivation (IFD).
          version =
            let
              nixVersion = (pkgs.callPackage ./nix/package.nix { }).version;
            in
            pkgs.runCommand "split-pro-version-check" { } (
              if nixVersion == baseVersion then
                "touch $out"
              else
                throw "nix/package.nix version (${nixVersion}) differs from package.json (${baseVersion}); bump both together."
            );
          vm = pkgs.testers.runNixOSTest {
            imports = [ ./nix/test.nix ];
            defaults.imports = [ self.nixosModules.default ];
          };
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          node = pkgs.nodejs_22;
          postgres = pkgs.postgresql_18.withPackages (extensions: [ extensions.pg_cron ]);
          # Use nixpkgs' pnpm even when package.json's `packageManager` pins a newer patch release
          # (see pnpm_config_pm_on_fail below).
          pnpm = pkgs.pnpm_12;
          # npm downloads standard Linux binaries (Prisma, SWC, tsc, oxlint, etc.).
          # Run Node commands in an FHS environment instead of modifying node_modules
          # or substituting a different version of Prisma's engines.
          runtime = pkgs.buildFHSEnv {
            name = "splitpro-node-runtime";
            # Prisma uses os-release to choose its downloadable engine target.
            # This runtime supplies glibc and OpenSSL 3, matching Debian 12.
            extraBuildCommands = ''
              cat > "$out/etc/os-release" <<'EOF'
              ID=debian
              VERSION_ID=12
              EOF
            '';
            targetPkgs = p: [
              node
              pnpm
              postgres
              p.git
              p.openssl
              p.cacert
              p.stdenv.cc.cc.lib
              p.zlib
              p.glib
              p.nss
              p.nspr
              p.dbus
              p.atk
              p.at-spi2-atk
              p.cups
              p.libdrm
              p.expat
              p.libxkbcommon
              p.libx11
              p.libxcomposite
              p.libxdamage
              p.libxext
              p.libxfixes
              p.libxrandr
              p.libxcb
              p.mesa
              p.libgbm
              p.udev
              p.pango
              p.cairo
              p.alsa-lib
              p.fontconfig
              p.freetype
              p.bash
              p.coreutils
              p.findutils
              p.gnugrep
              p.gnused
            ];
            runScript = pkgs.writeShellScript "splitpro-node-exec" ''
              exec "$@"
            '';
          };
          nodeTools = pkgs.runCommand "splitpro-node-tools" { } ''
            mkdir -p "$out/bin"
            ${pkgs.lib.concatMapStringsSep "\n"
              (command: ''
                cat > "$out/bin/${command}" <<'EOF'
                #!${pkgs.bash}/bin/bash
                exec ${runtime}/bin/splitpro-node-runtime ${
                  if command == "pnpm" || command == "pnpx" then pnpm else node
                }/bin/${command} "$@"
                EOF
                chmod +x "$out/bin/${command}"
              '')
              [
                "node"
                "npm"
                "npx"
                "pnpm"
                "pnpx"
              ]
            }
          '';
        in
        {
          default = pkgs.mkShell {
            packages = [
              nodeTools
              postgres
              pkgs.git
              pkgs.openssl
              pkgs.nixfmt
              pkgs.dejavu_fonts
            ];
            SPLITPRO_NATIVE_POSTGRES = "1";
            # Stop pnpm from downloading the exact `packageManager` version. Use nixpkgs' pnpm_12.
            pnpm_config_pm_on_fail = "ignore";
            shellHook = ''
              export SPLITPRO_ROOT="$PWD"
              export NEXT_TELEMETRY_DISABLED=1
              # libpq defaults should point at this checkout, just like dx:up.
              # Node reads .env as data and preserves exported overrides.
              export PGHOST="''${PGHOST:-$SPLITPRO_ROOT/.direnv/postgres}"
              PGPORT="$(node --env-file-if-exists=.env -p 'process.env.PGPORT ?? process.env.POSTGRES_PORT ?? "5432"')"
              PGUSER="$(node --env-file-if-exists=.env -p 'process.env.PGUSER ?? process.env.POSTGRES_USER ?? "postgres"')"
              PGDATABASE="$(node --env-file-if-exists=.env -p 'process.env.PGDATABASE ?? process.env.POSTGRES_DB ?? "splitpro"')"
              export PGPORT PGUSER PGDATABASE
            '';
          };
        }
      );
    };
}
