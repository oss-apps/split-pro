import { ImagePlus, Image as ImageUploaded, Loader2, ScanLine } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';

import { parseCurrencyCode } from '~/lib/currency';
import { useAddExpenseStore } from '~/store/addStore';
import { prepareImageForUpload, uploadImage, validateUploadSize } from '~/utils/imageUpload';
import { getCurrencyHelpers } from '~/utils/numbers';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAppStore } from '~/store/appStore';

function useScanReceipt() {
  const { t, i18n } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const { setDescription, setCurrency, setAmount, setAmountStr, setCategory, setExpenseDate } =
    useAddExpenseStore((s) => s.actions);

  const scanReceipt = React.useCallback(
    async (fileKey: string) => {
      setIsScanning(true);
      try {
        const response = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileKey }),
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const data = await response.json();

        setDescription(data.description);

        const currencyCode = parseCurrencyCode(data.currency);
        setCurrency(currencyCode);

        const helpers = getCurrencyHelpers({ currency: currencyCode, locale: i18n.language });
        const bigIntValue = helpers.toSafeBigInt(data.amount);
        setAmount(bigIntValue);
        setAmountStr(helpers.toUIString(bigIntValue, false, true));

        setCategory(data.category);

        if (data.date) {
          setExpenseDate(new Date(data.date));
        }

        toast.success(t('expense_details.add_expense_details.receipt_scan.messages.scan_success'));
      } catch (error) {
        console.error('Receipt scan error:', error);
        toast.error(t('expense_details.add_expense_details.receipt_scan.messages.scan_error'));
      } finally {
        setIsScanning(false);
      }
    },
    [
      setDescription,
      setCurrency,
      setAmount,
      setAmountStr,
      setCategory,
      setExpenseDate,
      i18n.language,
      t,
    ],
  );

  return { isScanning, scanReceipt };
}

function useUploadFile() {
  const { t } = useTranslation();
  const maxUploadFileSizeMB = useAppStore((s) => s.maxUploadFileSizeMB);
  const { setFileUploading, setFileKey } = useAddExpenseStore((s) => s.actions);

  const uploadFile = React.useCallback(
    async (inputFile: File): Promise<string | null> => {
      setFileUploading(true);

      try {
        let file = inputFile;
        try {
          file = await prepareImageForUpload(file, maxUploadFileSizeMB);
        } catch (error) {
          console.error('Compression failed:', error);
          toast.error(t('errors.image_compression_failed'));
        }

        if (!validateUploadSize(file, maxUploadFileSizeMB)) {
          toast.error(t('errors.less_than', { size: maxUploadFileSizeMB }));
          return null;
        }

        const key = await uploadImage(file);

        toast.success(t('expense_details.add_expense_details.upload_file.messages.upload_success'));
        setFileKey(key);
        return key;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(t('errors.uploading_error'));
        return null;
      } finally {
        setFileUploading(false);
      }
    },
    [setFileUploading, setFileKey, maxUploadFileSizeMB, t],
  );

  return { uploadFile };
}

export const UploadFile: React.FC<{ receiptScanEnabled?: boolean }> = ({ receiptScanEnabled }) => {
  const [file, setFile] = useState<File | null>(null);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const { isScanning, scanReceipt } = useScanReceipt();
  const { uploadFile } = useUploadFile();
  const { t } = useTranslation();

  const handleFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setFile(file);
      const key = await uploadFile(file);
      if (!key) {
        setFile(null);
      }
    },
    [uploadFile],
  );

  return (
    <div className="flex items-center gap-1">
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
      {receiptScanEnabled && fileKey && (
        <button
          type="button"
          onClick={() => scanReceipt(fileKey)}
          disabled={isScanning}
          title={t('expense_details.add_expense_details.receipt_scan.button_title')}
          className="cursor-pointer"
        >
          {isScanning ? (
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
          ) : (
            <ScanLine className="text-primary h-6 w-6" />
          )}
        </button>
      )}
    </div>
  );
};

export default UploadFile;
