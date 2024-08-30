import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { type File, FileUp, ImagePlus, Image as ImageUploaded } from 'lucide-react';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { FILE_SIZE_LIMIT } from '~/lib/constants';
import { toast } from 'sonner';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';

const getImgHeightAndWidth = (file: File) => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
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
};

export const UploadFile: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const { setFileUploading, setFileKey } = useAddExpenseStore((s) => s.actions);

  const getUploadUrl = api.user.getUploadUrl.useMutation();

  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    const file = files?.[0];

    if (!file) return;

    if (file.size > FILE_SIZE_LIMIT) {
      toast.error(`${t('upload_to_big_error')} ${FILE_SIZE_LIMIT / 1024 / 1024}MB`);
      return;
    }

    setFile(file);

    const { height, width } = await getImgHeightAndWidth(file);
    console.log('height:', height, 'width:', width);

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
        toast.error(t('upload_failed'));
        return;
      }

      toast.success(t('upload_ok'));

      setFileKey(key);
      console.log('Setting file key', key);
    } catch (error) {
      console.error('Error getting upload url:', error);
      toast.error(t('upload_failed'));
    }

    setFileUploading(false);
  };

  return (
    <div>
      <Label htmlFor="picture">
        {file ? (
          <ImageUploaded className="h-6 w-6 text-primary" />
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
