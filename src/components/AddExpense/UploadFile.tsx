import { ImagePlus, Image as ImageUploaded } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';

import { FILE_SIZE_LIMIT } from '~/lib/constants';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';

import { Input } from '../ui/input';
import { Label } from '../ui/label';

const getImgHeightAndWidth = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = (error) => {
      reject(error);
    };
  });

export const UploadFile: React.FC = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const { setFileUploading, setFileKey } = useAddExpenseStore((s) => s.actions);

  const getUploadUrl = api.expense.getUploadUrl.useMutation();

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

      await getImgHeightAndWidth(file);

      setFileUploading(true);
      try {
        const { fileUrl, key } = await getUploadUrl.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });

        const response = await fetch(fileUrl, {
          method: 'PUT',
          body: file,
        });

        if (!response.ok) {
          toast.error(t('errors.upload_failed'));
          console.error('Failed to upload file:', response.statusText);
          setFile(null);
          return;
        }

        toast.success(t('expense_details.add_expense_details.upload_file.messages.upload_success'));

        setFileKey(key);
      } catch (error) {
        console.error('Error getting upload url:', error);
        toast.error(t('errors.uploading_error'));
      } finally {
        setFileUploading(false);
      }
    },
    [getUploadUrl, setFileUploading, setFileKey, t],
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
