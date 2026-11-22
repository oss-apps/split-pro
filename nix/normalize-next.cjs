/*
 * Removes the random values that `next build` embeds in its output, so that the package is
 * reproducible and contains no secrets shared by every installation.
 * Run at build time: node normalize-next.cjs <dist-dir>
 *
 * For preview mode and on-demand revalidation, Next.js compares a request cookie or the
 * `x-prerender-revalidate` header with `previewModeId` using plain `===` (see Next.js
 * api-utils). A blank id would therefore match an empty header. HTTP header and cookie values
 * can never contain a line feed, so no request can match an id that contains one. Both features
 * become unreachable. SplitPro uses neither of them.
 *
 * Server Actions encrypt their bound arguments with `encryptionKey`. SplitPro has no Server
 * Actions, and the build fails if any appear. They would need a key generated for each
 * installation and passed in at runtime (NEXT_SERVER_ACTIONS_ENCRYPTION_KEY).
 */
const fs = require('fs');
const path = require('path');

const distDir = process.argv[2];
const UNMATCHABLE_PREVIEW_ID = 'disabled\n';

const edit = (relative, change) => {
  const file = path.join(distDir, relative);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  change(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return data;
};

const disablePreview = (props) => {
  props.previewModeId = UNMATCHABLE_PREVIEW_ID;
  props.previewModeSigningKey = '';
  props.previewModeEncryptionKey = '';
};
edit('prerender-manifest.json', (manifest) => disablePreview(manifest.preview));
edit('server/preview-props.json', disablePreview);

const actions = edit('server/server-reference-manifest.json', (manifest) => {
  const used = [...Object.keys(manifest.node ?? {}), ...Object.keys(manifest.edge ?? {})];
  if (used.length) {
    console.error(
      `normalize-next: found ${used.length} Server Action(s). They need a per-installation ` +
        'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY at runtime; extend nix/ before packaging them.',
    );
    process.exit(1);
  }
  manifest.encryptionKey = '';
});
// The .js version of the manifest holds the same JSON as a string literal.
fs.writeFileSync(
  path.join(distDir, 'server/server-reference-manifest.js'),
  `self.__RSC_SERVER_MANIFEST=${JSON.stringify(JSON.stringify(actions, null, 2))}`,
);
