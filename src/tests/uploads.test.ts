import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { isInside, resolveUploadPath } from '~/server/uploads';

jest.mock('~/env', () => ({ env: {} }));

describe('resolveUploadPath', () => {
  let base = '';
  let uploads = '';

  beforeEach(async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), 'splitpro-uploads-'));
    uploads = path.join(base, 'uploads');
    await fs.mkdir(path.join(uploads, '1'), { recursive: true });
    await fs.writeFile(path.join(uploads, '1', 'receipt.webp'), 'ok');
    // Sibling whose name shares the `uploads` prefix.
    await fs.mkdir(path.join(base, 'uploads-old'));
    await fs.writeFile(path.join(base, 'uploads-old', 'secret.webp'), 'secret');
    await fs.writeFile(path.join(base, 'outside.webp'), 'secret');
  });

  afterEach(async () => {
    await fs.rm(base, { recursive: true, force: true });
  });

  it('serves files inside the upload directory', async () => {
    await expect(resolveUploadPath(['1', 'receipt.webp'], uploads)).resolves.toEqual({
      status: 'ok',
      path: await fs.realpath(path.join(uploads, '1', 'receipt.webp')),
    });
  });

  it('rejects sibling directories sharing the name prefix', async () => {
    await expect(resolveUploadPath(['..', 'uploads-old', 'secret.webp'], uploads)).resolves.toEqual(
      { status: 'forbidden' },
    );
  });

  it('rejects traversal and the root itself', async () => {
    await expect(resolveUploadPath(['..', 'outside.webp'], uploads)).resolves.toEqual({
      status: 'forbidden',
    });
    await expect(resolveUploadPath(['.'], uploads)).resolves.toEqual({ status: 'forbidden' });
  });

  it('rejects symlinks pointing outside the upload directory', async () => {
    await fs.symlink(path.join(base, 'outside.webp'), path.join(uploads, '1', 'link.webp'));
    await expect(resolveUploadPath(['1', 'link.webp'], uploads)).resolves.toEqual({
      status: 'forbidden',
    });
  });

  it('works when the upload directory itself is a symlink', async () => {
    const linkedRoot = path.join(base, 'linked');
    await fs.symlink(uploads, linkedRoot);
    await expect(resolveUploadPath(['1', 'receipt.webp'], linkedRoot)).resolves.toMatchObject({
      status: 'ok',
    });
  });

  it('reports missing files and directories as not found', async () => {
    await expect(resolveUploadPath(['1', 'missing.webp'], uploads)).resolves.toEqual({
      status: 'not-found',
    });
    await expect(resolveUploadPath(['1'], uploads)).resolves.toEqual({ status: 'not-found' });
  });
});

describe('isInside', () => {
  it('compares path components, not string prefixes', () => {
    expect(isInside('/srv/uploads', '/srv/uploads/a')).toBe(true);
    expect(isInside('/srv/uploads', '/srv/uploads-old/a')).toBe(false);
    expect(isInside('/srv/uploads', '/srv/uploads')).toBe(false);
  });
});
