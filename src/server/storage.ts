import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { type Readable } from 'node:stream';

import { env } from '~/env';

/**
 * S3-compatible object storage (Cloudflare R2, AWS S3, MinIO, …) for receipt/image
 * uploads. Files go straight to the object store — there is no local filesystem in the
 * request path, so this runs on Cloudflare Workers. Configure via the STORAGE_* env vars.
 */

let client: S3Client | null = null;

export const isStorageConfigured = (): boolean =>
  Boolean(
    env.STORAGE_ENDPOINT &&
    env.STORAGE_BUCKET &&
    env.STORAGE_ACCESS_KEY_ID &&
    env.STORAGE_SECRET_ACCESS_KEY,
  );

const getClient = (): { client: S3Client; bucket: string } => {
  if (
    !env.STORAGE_ENDPOINT ||
    !env.STORAGE_BUCKET ||
    !env.STORAGE_ACCESS_KEY_ID ||
    !env.STORAGE_SECRET_ACCESS_KEY
  ) {
    throw new Error('Object storage is not configured (set the STORAGE_* env vars).');
  }

  client ??= new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
    // R2 and most S3-compatible stores expect path-style addressing.
    forcePathStyle: true,
  });

  return { client, bucket: env.STORAGE_BUCKET };
};

export const putObject = async (
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> => {
  const { client: s3, bucket } = getClient();
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
};

export interface StoredObject {
  body: Readable;
  contentType: string;
}

export const getObject = async (key: string): Promise<StoredObject | null> => {
  const { client: s3, bucket } = getClient();
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) {
      return null;
    }
    return { body: res.Body as Readable, contentType: res.ContentType ?? 'image/webp' };
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
};
