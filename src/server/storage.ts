import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '~/env';

let S3: S3Client | null = null;

export const isStorageConfigured = () =>
  env.R2_URL && env.R2_ACCESS_KEY && env.R2_SECRET_KEY && env.R2_BUCKET;

// console.log(isStorageConfigured());

const getClient = () => {
  if (!S3 && env.R2_URL && env.R2_ACCESS_KEY && env.R2_SECRET_KEY && env.R2_BUCKET) {
    S3 = new S3Client({
      region: 'auto',
      endpoint: env.R2_URL,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY,
        secretAccessKey: env.R2_SECRET_KEY,
      },
      forcePathStyle: true, // needed for minio
    });
  }

  return S3;
};

export const getDocumentUploadUrl = async (key: string, fileType: string, fileSize?: number) => {
  const s3Client = getClient();

  if (!s3Client) {
    throw new Error('R2 is not configured');
  }

  const url = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ContentType: fileType,
    }),
    { expiresIn: 3600 },
  );

  return url;
};
