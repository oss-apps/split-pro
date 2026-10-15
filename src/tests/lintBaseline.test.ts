import {
  type LintCount,
  compareLintCounts,
  countWarnings,
  flattenBudgets,
  formatLintDiagnostics,
  parseOxlintJson,
} from '../../scripts/lint-baseline';

describe('lint baseline', () => {
  const baseline: LintCount[] = [{ rule: 'no-shadow', file: 'src/a.ts', count: 2 }];

  it('rejects an added rule or file and increased warning counts', () => {
    const comparison = compareLintCounts(baseline, [
      { rule: 'no-shadow', file: 'src/a.ts', count: 3 },
      { rule: 'no-shadow', file: 'src/b.ts', count: 1 },
      { rule: 'no-await-in-loop', file: 'src/a.ts', count: 1 },
    ]);
    expect(comparison.failures).toHaveLength(3);
  });

  it('allows reductions and reports stale budgets', () => {
    const comparison = compareLintCounts(baseline, [
      { rule: 'no-shadow', file: 'src/a.ts', count: 1 },
    ]);
    expect(comparison.failures).toEqual([]);
    expect(comparison.stale).toHaveLength(1);
    expect(comparison.allowed).toBe(1);
  });

  it('counts warnings by exact rule and file and excludes errors', () => {
    expect(
      countWarnings([
        { code: 'eslint(no-shadow)', filename: 'src/a.ts', severity: 'warning', message: 'shadow' },
        { code: 'eslint(no-shadow)', filename: 'src/a.ts', severity: 'error', message: 'shadow' },
      ]),
    ).toEqual([{ rule: 'eslint(no-shadow)', file: 'src/a.ts', count: 1 }]);
  });

  it('keeps identical short rule names from different plugins distinct', () => {
    const counts = countWarnings([
      {
        code: 'eslint(no-unused-vars)',
        filename: 'src/a.ts',
        severity: 'warning',
        message: 'first',
      },
      {
        code: 'typescript(no-unused-vars)',
        filename: 'src/a.ts',
        severity: 'warning',
        message: 'second',
      },
    ]);
    expect(counts.map(({ rule }) => rule)).toEqual([
      'eslint(no-unused-vars)',
      'typescript(no-unused-vars)',
    ]);
    expect(
      compareLintCounts([{ rule: 'eslint(no-unused-vars)', file: 'src/a.ts', count: 1 }], counts)
        .failures,
    ).toContain('typescript(no-unused-vars) in src/a.ts: new warning (1)');
  });

  it('classifies lint errors as actionable filename/code/message diagnostics', () => {
    expect(
      formatLintDiagnostics([
        {
          code: 'typescript(no-unsafe-type-assertion)',
          filename: 'src/a.ts',
          severity: 'error',
          message: 'unsafe assertion',
        },
      ]),
    ).toEqual(['src/a.ts: typescript(no-unsafe-type-assertion): unsafe assertion']);
  });

  it('rejects malformed diagnostics and baseline budgets', () => {
    expect(() => parseOxlintJson('{')).toThrow();
    expect(() => parseOxlintJson('{"diagnostics":[{}]}')).toThrow();
    expect(() => flattenBudgets({ 'no-shadow': { 'src/a.ts': -1 } })).toThrow();
  });
});
