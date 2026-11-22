import path from 'node:path';

import { env } from '~/env';

/**
 * Directory holding uploaded receipts and avatars. Defaults to `./uploads` relative to the
 * working directory. Set `UPLOAD_DIR` when the app directory is read-only (e.g. Nix store).
 */
export const getUploadDir = () =>
  path.resolve(env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'));
