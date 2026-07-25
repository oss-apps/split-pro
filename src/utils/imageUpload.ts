import imageCompression from 'browser-image-compression';

const compressImage = async (file: File, maxSizeMB: number) => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Compress/resize to webp entirely in the browser, so the server just stores the bytes
  // (no server-side image processing / native binaries — Cloudflare Workers friendly).
  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp',
  });
};

export const validateUploadSize = (file: File, maxSizeMB: number) => {
  const maxSize = maxSizeMB * 1024 * 1024;
  return file.size <= maxSize;
};

export const prepareImageForUpload = async (file: File, maxSizeMB: number) =>
  compressImage(file, maxSizeMB);

export const uploadImage = async (file: File): Promise<string> => {
  // Send the raw image bytes as the request body; the server streams them to object
  // Storage without multipart parsing or temp files.
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'content-type': file.type || 'image/webp' },
    body: file,
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
