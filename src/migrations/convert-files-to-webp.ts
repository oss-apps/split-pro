/**
 * Legacy data migration (pre-2.0.0): converted images in the local `uploads` directory to
 * webp using `sharp`.
 *
 * This fork stores uploads in S3-compatible object storage (Cloudflare R2) and does no
 * server-side image processing, so `sharp` (a native binary that can't run on Workers) has
 * been removed. There is no local `uploads` directory to convert, so this migration is now
 * a no-op kept only to preserve the schema-version progression in the migration runner.
 */
export async function convertExistingFilesToWebP(): Promise<void> {
  console.log('Skipping local file → webp conversion (uploads are stored in object storage).');
  return Promise.resolve();
}
