import imageCompression from 'browser-image-compression';

import { env } from '~/env';

const compressImage = async (file: File, maxSizeMB: number) => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });
};

export const validateUploadSize = (file: File, maxSizeMB: number) => {
  const maxSize = maxSizeMB * 1024 * 1024;
  return file.size <= maxSize;
};

export const prepareImageForUpload = async (file: File, maxSizeMB: number) =>
  compressImage(file, maxSizeMB);

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

export const toImageSrc = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value;
  }

  return `/api/files/${value}`;
};
