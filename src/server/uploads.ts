import fs from 'node:fs/promises';
import path from 'node:path';

import { env } from '~/env';

/*
 * The paths in this file point at runtime data, not at app files. The `turbopackIgnore`
 * directives stop Turbopack's output tracing from copying the surrounding source files into the
 * standalone build. Turbopack only recognises the lowercase spelling, so the capitalisation lint
 * rule is turned off here.
 */
/* oxlint-disable capitalized-comments */

/**
 * Directory holding uploaded receipts and avatars. Defaults to `./uploads` relative to the
 * working directory. Set `UPLOAD_DIR` when the app directory is read-only (e.g. Nix store).
 */
export const getUploadDir = () =>
  path.resolve(
    /* turbopackIgnore: true */ env.UPLOAD_DIR ??
      path.join(/* turbopackIgnore: true */ process.cwd(), 'uploads'),
  );

/** True when `child` is strictly inside `root`. Compares path components, not string prefixes. */
export const isInside = (root: string, child: string) => {
  const relative = path.relative(root, child);
  return '' !== relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  'object' === typeof error && null !== error && 'code' in error;

/** `fs.realpath`, but `null` for paths that don't exist. */
const realpathIfExists = async (target: string) => {
  try {
    return await fs.realpath(/* turbopackIgnore: true */ target);
  } catch (error) {
    if (isErrnoException(error) && 'ENOENT' === error.code) {
      return null;
    }
    throw error;
  }
};

export type UploadPathResult =
  | { status: 'ok'; path: string }
  | { status: 'forbidden' }
  | { status: 'not-found' };

/**
 * Resolves the path segments from a request to a file inside the upload directory. Symlinks are
 * resolved before checking that the file is inside the directory. A request therefore can't
 * escape the directory with `..` segments, through a sibling directory whose name starts the
 * same way (`uploads-old`), or through a link that points outside it.
 */
export const resolveUploadPath = async (
  parts: string[],
  uploadDir = getUploadDir(),
): Promise<UploadPathResult> => {
  const candidate = path.resolve(/* turbopackIgnore: true */ uploadDir, ...parts);
  if (!isInside(uploadDir, candidate)) {
    return { status: 'forbidden' };
  }

  const [realRoot, realFile] = await Promise.all([
    realpathIfExists(uploadDir),
    realpathIfExists(candidate),
  ]);
  if (null === realRoot || null === realFile) {
    return { status: 'not-found' };
  }

  if (!isInside(realRoot, realFile)) {
    return { status: 'forbidden' };
  }
  if (!(await fs.stat(/* turbopackIgnore: true */ realFile)).isFile()) {
    return { status: 'not-found' };
  }
  return { status: 'ok', path: realFile };
};

/* oxlint-enable capitalized-comments */
