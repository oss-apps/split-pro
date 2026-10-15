import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import {
  compareLintCounts,
  countWarnings,
  flattenBudgets,
  formatLintDiagnostics,
  parseOxlintJson,
} from './lint-baseline';

const printProcessOutput = (stdout: string, stderr: string): void => {
  if (stdout.trim()) console.error(`Oxlint stdout:\n${stdout.trimEnd()}`);
  if (stderr.trim()) console.error(`Oxlint stderr:\n${stderr.trimEnd()}`);
};

const fail = (message: string): never => {
  console.error(`Lint baseline: ${message}`);
  throw new Error(message);
};

const result = spawnSync('pnpm', ['exec', 'oxlint', '--format=json'], { encoding: 'utf8' });
if (result.error) {
  printProcessOutput(result.stdout, result.stderr);
  fail(`could not run Oxlint: ${result.error.message}`);
}
if (null === result.status) {
  printProcessOutput(result.stdout, result.stderr);
  fail(`Oxlint terminated by signal ${result.signal ?? 'unknown'}`);
}

const diagnostics = (() => {
  try {
    return parseOxlintJson(result.stdout);
  } catch (error) {
    return fail(
      `could not parse Oxlint JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
})();

if (0 !== result.status || diagnostics.some(({ severity }) => 'error' === severity)) {
  formatLintDiagnostics(diagnostics).forEach((message) => console.error(`  ${message}`));
  printProcessOutput(result.stdout, result.stderr);
  fail(`Oxlint exited with status ${result.status}; lint errors are not baseline-eligible`);
}

const baseline = (() => {
  try {
    const value: unknown = JSON.parse(readFileSync('.oxlint-baseline.json', 'utf8'));
    if (!value || 'object' !== typeof value || !('budgets' in value)) {
      throw new Error('baseline must contain budgets');
    }
    if (!('comment' in value) || 'string' !== typeof value.comment) {
      throw new Error('baseline comment is required');
    }
    return { comment: value.comment, budgets: value.budgets };
  } catch (error) {
    return fail(
      `could not read baseline: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
})();

const budgets = (() => {
  try {
    return flattenBudgets(baseline.budgets);
  } catch (error) {
    return fail(
      `invalid baseline budgets: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
})();
const comparison = compareLintCounts(budgets, countWarnings(diagnostics));
console.log(
  `Lint baseline: ${comparison.allowed} warning(s) allowed; ${comparison.current} warning(s) observed.`,
);
if (comparison.stale.length) {
  console.log(
    `Stale budgets (${comparison.stale.length}) — ratchet .oxlint-baseline.json down explicitly:`,
  );
  comparison.stale.forEach((item) => console.log(`  ${item}`));
}
if (comparison.failures.length) {
  console.error(`New/excess warnings (${comparison.failures.length}):`);
  comparison.failures.forEach((item) => console.error(`  ${item}`));
  process.exitCode = 1;
}
if (!comparison.stale.length) console.log('No stale budgets.');
