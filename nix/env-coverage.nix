# This check fails when src/env.ts declares a server environment variable that the NixOS module
# neither maps to an option (nix/env-table.nix) nor handles itself. It runs at build time, so
# it needs no import from derivation (IFD).
#
# The keys are read with the TypeScript parser, not a regex. If the check finds something that
# it can't interpret, such as a spread, a computed key or a missing `server` object, it fails
# instead of passing silently.
{
  lib,
  runCommand,
  nodejs,
  typescript,
  split-pro,
}:
let
  table = import ./env-table.nix { inherit lib; };
  known = map (r: r.env) table.rows ++ table.handledByModule;
in
runCommand "split-pro-env-coverage"
  {
    nativeBuildInputs = [ nodejs ];
    envTs = "${split-pro.src}/src/env.ts";
    known = builtins.toJSON known;
    NODE_PATH = "${typescript}/lib/node_modules";
    script = ./env-coverage.cjs;
  }
  ''
    node "$script" "$envTs" > $out
  ''
