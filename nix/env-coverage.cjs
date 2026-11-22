// Usage: known='["A","B"]' node env-coverage.cjs path/to/env.ts
// Prints the declared server keys. Exits with an error if a key is unknown or can't be parsed.
const fs = require('fs');
const ts = require('typescript');

const file = process.argv[2];
const known = new Set(JSON.parse(process.env.known));
const source = ts.createSourceFile(
  file,
  fs.readFileSync(file, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);

const fail = (message) => {
  console.error(`env-coverage: ${message}`);
  process.exit(1);
};

const keyName = (prop) => {
  if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) {
    throw new Error(
      `env-coverage: unsupported member in server block: ${prop.getText(source).slice(0, 60)}`,
    );
  }
  const { name } = prop;
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNoSubstitutionTemplateLiteral(name)
  ) {
    return name.text;
  }
  throw new Error(`env-coverage: computed key in server block: ${name.getText(source)}`);
};

// Find `createEnv({ server: { ... } })`.
const servers = [];
const visit = (node) => {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    'createEnv' === node.expression.text &&
    node.arguments[0] &&
    ts.isObjectLiteralExpression(node.arguments[0])
  ) {
    for (const prop of node.arguments[0].properties) {
      if (prop.name && keyName(prop) === 'server') {
        if (!ts.isPropertyAssignment(prop) || !ts.isObjectLiteralExpression(prop.initializer)) {
          fail('`server` is not an object literal');
        }
        servers.push(prop.initializer);
      }
    }
  }
  ts.forEachChild(node, visit);
};
visit(source);

if (1 !== servers.length) {
  fail(`expected exactly one createEnv({ server: {...} }), found ${servers.length}`);
}

const declared = servers[0].properties.map(keyName);
if (0 === declared.length) {
  fail('server block declares no keys');
}

const missing = declared.filter((key) => !known.has(key));
if (missing.length) {
  fail(
    `src/env.ts declares env vars missing from nix/env-table.nix:\n${missing.map((k) => `  ${k}`).join('\n')}`,
  );
}
console.log(declared.sort().join('\n'));
