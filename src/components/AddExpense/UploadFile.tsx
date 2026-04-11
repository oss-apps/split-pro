import { ImagePlus, Image as ImageUploaded } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';

import { env } from '~/env';
import { useAddExpenseStore } from '~/store/addStore';
import { prepareImageForUpload, uploadImage, validateUploadSize } from '~/utils/imageUpload';

import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const UploadFile: React.FC = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const { setFileUploading, setFileKey } = useAddExpenseStore((s) => s.actions);

  const handleFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;

      let file = files?.[0];

      if (!file) {
        return;
      }

      try {
        try {
          file = await prepareImageForUpload(file);
        } catch (error) {
          console.error('Compression failed:', error);
          toast.error(t('errors.image_compression_failed'));
        }

        if (!validateUploadSize(file)) {
          toast.error(t('errors.less_than', { size: env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB }));
          return;
        }

        setFile(file);
        setFileUploading(true);

        const key = await uploadImage(file);

        toast.success(t('expense_details.add_expense_details.upload_file.messages.upload_success'));
        setFileKey(key);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(t('errors.uploading_error'));
        setFile(null);
      } finally {
        setFileUploading(false);
      }
    },
    [setFileUploading, setFileKey, t],
  );

  return (
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
  );
};

export default UploadFile;
