import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { assertTestDatabaseUrl, getTestDatabaseUrl } from '../src/tests/helpers/testDatabase';
import { loadTestEnvironment } from '../src/tests/helpers/environment';

const action = process.argv[2];
if ('up' !== action && 'down' !== action) {
  throw new Error('Usage: pnpm test:db:up | pnpm test:db:down');
}
loadTestEnvironment();
const suite = process.argv[3] ?? 'integration';
if ('integration' !== suite && 'e2e' !== suite) {
  throw new Error('Unknown test suite');
}
const databaseUrl = getTestDatabaseUrl(suite);
const url = assertTestDatabaseUrl(databaseUrl);
const database = url.pathname.slice(1);
const port = url.port || '5432';
const user = decodeURIComponent(url.username);
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(user)) {
  throw new Error('Test database user must be a simple PostgreSQL identifier');
}
const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      TEST_POSTGRES_USER: user,
      TEST_POSTGRES_PASSWORD: decodeURIComponent(url.password),
      TEST_POSTGRES_DB: database,
      TEST_POSTGRES_PORT: port,
    },
  });
  if (result.error || 0 !== result.status) {
    throw result.error ?? new Error(`${command} exited with ${result.status}`);
  }
};

if ('1' !== process.env.SPLITPRO_NATIVE_POSTGRES) {
  if ('[::1]' === url.hostname) {
    throw new Error('Docker test databases require an IPv4 loopback URL');
  }
  run('docker', [
    'compose',
    '-f',
    'docker/test/compose.yml',
    '-p',
    `splitpro-test-${port}`,
    ...('up' === action ? ['up', '-d', '--wait'] : ['down', '--volumes']),
  ]);
} else {
  const state = resolve(`.direnv/test-postgres-${port}`);
  const data = resolve(state, 'data');
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  if ('down' === action) {
    if (existsSync(resolve(data, 'postmaster.pid'))) {
      run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
    }
  } else {
    mkdirSync(state, { recursive: true });
    if (!existsSync(resolve(data, 'PG_VERSION'))) {
      const passwordFile = resolve(state, 'bootstrap-password');
      writeFileSync(passwordFile, `${decodeURIComponent(url.password)}\n`, { mode: 0o600 });
      try {
        run('initdb', [
          '-D',
          data,
          '-U',
          user,
          '--encoding=UTF8',
          '--locale=C',
          '--auth-local=trust',
          '--auth-host=scram-sha-256',
          `--pwfile=${passwordFile}`,
        ]);
      } finally {
        unlinkSync(passwordFile);
      }
    }
    if (!existsSync(resolve(data, 'postmaster.pid'))) {
      run('pg_ctl', [
        '-D',
        data,
        '-l',
        resolve(state, 'postgres.log'),
        '-w',
        'start',
        '-o',
        `-p ${port} -k ${quote(state)} -h ${quote(url.hostname.replaceAll('[', '').replaceAll(']', ''))} ` +
          `-c shared_preload_libraries=pg_cron -c cron.database_name=${database} ` +
          '-c cron.timezone=UTC -c cron.use_background_workers=on',
      ]);
    }
    const result = spawnSync(
      'psql',
      [
        '-h',
        state,
        '-p',
        port,
        '-U',
        user,
        '-d',
        'postgres',
        '-Atc',
        `SELECT 1 FROM pg_database WHERE datname = '${database}'`,
      ],
      { encoding: 'utf8' },
    );
    if (0 !== result.status) {
      throw new Error(result.stderr);
    }
    if ('1' !== result.stdout.trim()) {
      run('createdb', ['-h', state, '-p', port, '-U', user, database]);
    }
  }
}
if ('up' === action) {
  run('pnpm', ['exec', 'prisma', 'migrate', 'deploy']);
}
