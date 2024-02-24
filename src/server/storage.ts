import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '~/env';

const S3 = new S3Client({
  region: 'auto',
  endpoint: env.R2_URL,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY,
    secretAccessKey: env.R2_SECRET_KEY,
  },
});

export const getDocumentUploadUrl = async (key: string, fileType: string, fileSize?: number) => {
  const url = await getSignedUrl(
    S3,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ContentType: fileType,
      // ContentLength: fileSize,
      // C
    }),
    { expiresIn: 3600 },
  );

  return url;
};
