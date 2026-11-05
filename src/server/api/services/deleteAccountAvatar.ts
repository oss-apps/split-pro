import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { type PrismaClient } from '@prisma/client';

/** Remove only a locally uploaded avatar belonging to this user, never shared receipts. */
export const deleteAccountAvatar = async (
  db: PrismaClient,
  userId: number,
  image: string | null,
) => {
  if (!image || !new RegExp(`^${userId}/[0-9a-f-]{36}\\.webp$`, 'i').test(image)) {
    return;
  }
  const references = await Promise.all([
    db.user.count({ where: { image } }),
    db.group.count({ where: { image } }),
    db.expense.count({ where: { fileKey: image } }),
  ]);
  if (references.some((count) => 0 < count)) {
    return;
  }
  const remove = async (key: string) => {
    try {
      await unlink(path.join(process.cwd(), 'uploads', key));
    } catch (error) {
      if (error instanceof Error && 'code' in error && 'ENOENT' === error.code) {
        return;
      }
      throw error;
    }
  };
  await Promise.all([remove(image), remove(image.replace('.webp', '-thumb.webp'))]);
};
