import { ImagePlus, Image as ImageUploaded } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import imageCompression from 'browser-image-compression';

import { env } from '~/env';
import { useAddExpenseStore } from '~/store/addStore';

import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const UploadFile: React.FC = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const { setFileUploading, setFileKey } = useAddExpenseStore((s) => s.actions);

  const handleFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;

      let file = files?.[0];

      if (!file) {
        return;
      }

      // Compress if enabled and it's an image
      if (compressionEnabled && file.type.startsWith('image/')) {
        try {
          const options = {
            maxSizeMB: env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/jpeg',
          };
          file = await imageCompression(file, options);
        } catch (error) {
          console.error('Compression failed:', error);
          toast.error('Compression failed. Please try again or disable compression.');
          return;
        }
      }

      // Check size after compression
      const maxSize = env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${t('errors.less_than')} ${env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB}MB`);
        return;
      }

      setFile(file);
      setFileUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const data = await response.json();

        toast.success(t('expense_details.add_expense_details.upload_file.messages.upload_success'));
        setFileKey(data.key);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(t('errors.uploading_error'));
        setFile(null);
      } finally {
        setFileUploading(false);
      }
    },
    [compressionEnabled, setFileUploading, setFileKey, t],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="compression"
          checked={compressionEnabled}
          onCheckedChange={(checked) => setCompressionEnabled(checked === true)}
        />
        <Label htmlFor="compression" className="text-sm">
          Enable image compression
        </Label>
      </div>
      <Label htmlFor="picture" className="cursor-pointer">
        {file || fileKey ? (
          <ImageUploaded className="text-primary h-6 w-6" />
        ) : (
          <ImagePlus className="h-6 w-6 text-gray-300" />
        )}
        <Input
          onChange={handleFileChange}
          id="picture"
          type="file"
          accept="image/*"
          className="hidden"
        />
      </Label>
    </div>
  );
};

export default UploadFile;
