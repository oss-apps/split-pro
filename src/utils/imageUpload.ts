import imageCompression from 'browser-image-compression';

import { env } from '~/env';

const compressImage = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return imageCompression(file, {
    maxSizeMB: env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });
};

export const validateUploadSize = (file: File) => {
  const maxSize = env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;
  return file.size <= maxSize;
};

export const prepareImageForUpload = async (file: File) => compressImage(file);

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as { key: string };
  return data.key;
};
