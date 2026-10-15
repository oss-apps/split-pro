export interface LintCount {
  rule: string;
  file: string;
  count: number;
}

export const flattenBudgets = (value: unknown): LintCount[] => {
  if (!value || 'object' !== typeof value || Array.isArray(value))
    throw new Error('budgets must be an object');
  const result: LintCount[] = [];
  Object.entries(value).forEach(([rule, files]) => {
    if (!files || 'object' !== typeof files || Array.isArray(files))
      throw new Error(`Invalid files for ${rule}`);
    Object.entries(files).forEach(([file, count]) => {
      if ('number' !== typeof count || !Number.isInteger(count) || count < 0)
        throw new Error(`Invalid budget for ${rule} in ${file}`);
      result.push({ rule, file, count });
    });
  });
  return result.sort(
    (left, right) => left.rule.localeCompare(right.rule) || left.file.localeCompare(right.file),
  );
};

export interface LintDiagnostic {
  code: string;
  filename: string;
  severity: string;
  message: string;
}

export const diagnosticRule = (code: string): string => {
  if (!/^[^()]+\([^()]+\)$/.test(code)) {
    throw new Error(`Unrecognized Oxlint diagnostic code: ${code}`);
  }
  return code;
};

export const formatLintDiagnostics = (diagnostics: LintDiagnostic[]): string[] =>
  diagnostics.map(({ filename, code, message }) => `${filename}: ${code}: ${message}`);

export const countWarnings = (diagnostics: LintDiagnostic[]): LintCount[] => {
  const counts = new Map<string, number>();
  diagnostics.forEach((diagnostic) => {
    if ('warning' !== diagnostic.severity) return;
    const rule = diagnosticRule(diagnostic.code);
    const key = `${rule}\0${diagnostic.filename}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([key, count]) => {
      const [rule, file] = key.split('\0');
      if (!rule || !file) throw new Error('Invalid internal warning-count key');
      return { rule, file, count };
    })
    .sort(
      (left, right) => left.rule.localeCompare(right.rule) || left.file.localeCompare(right.file),
    );
};

export const compareLintCounts = (
  baseline: LintCount[],
  current: LintCount[],
): { failures: string[]; stale: string[]; allowed: number; current: number } => {
  const oldCounts = new Map(baseline.map(({ rule, file, count }) => [`${rule}\0${file}`, count]));
  const newCounts = new Map(current.map(({ rule, file, count }) => [`${rule}\0${file}`, count]));
  const failures: string[] = [];
  const stale: string[] = [];
  newCounts.forEach((count, key) => {
    const budget = oldCounts.get(key);
    if (undefined === budget) failures.push(`${key.replace('\0', ' in ')}: new warning (${count})`);
    else if (count > budget)
      failures.push(`${key.replace('\0', ' in ')}: ${count} warnings exceeds budget ${budget}`);
  });
  oldCounts.forEach((budget, key) => {
    const count = newCounts.get(key) ?? 0;
    if (count < budget)
      stale.push(`${key.replace('\0', ' in ')}: budget ${budget}, current ${count}`);
  });
  return {
    failures,
    stale,
    allowed: current.reduce(
      (sum, item) => sum + Math.min(item.count, oldCounts.get(`${item.rule}\0${item.file}`) ?? 0),
      0,
    ),
    current: current.reduce((sum, item) => sum + item.count, 0),
  };
};

export const parseOxlintJson = (text: string): LintDiagnostic[] => {
  const value: unknown = JSON.parse(text);
  if (
    !value ||
    'object' !== typeof value ||
    !('diagnostics' in value) ||
    !Array.isArray(value.diagnostics)
  ) {
    throw new Error('Oxlint JSON must contain a diagnostics array');
  }
  return value.diagnostics.map((item: unknown): LintDiagnostic => {
    if (
      !item ||
      'object' !== typeof item ||
      !('code' in item) ||
      'string' !== typeof item.code ||
      !('filename' in item) ||
      'string' !== typeof item.filename ||
      !('severity' in item) ||
      'string' !== typeof item.severity ||
      !('message' in item) ||
      'string' !== typeof item.message
    ) {
      throw new Error('Malformed Oxlint diagnostic');
    }
    return {
      code: item.code,
      filename: item.filename,
      severity: item.severity,
      message: item.message,
    };
  });
};
