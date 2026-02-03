import { ImagePlus, Image as ImageUploaded } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';

import { FILE_SIZE_LIMIT } from '~/lib/constants';
import { useAddExpenseStore } from '~/store/addStore';

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
      const file = files?.[0];

      if (!file) {
        return;
      }

      if (file.size > FILE_SIZE_LIMIT) {
        toast.error(`${t('errors.less_than')} ${FILE_SIZE_LIMIT / 1024 / 1024}MB`);
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
