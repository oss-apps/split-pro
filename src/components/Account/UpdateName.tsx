import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Pencil, X } from 'lucide-react';
import Cropper, { type Area } from 'react-easy-crop';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type TFunction, useTranslation } from 'next-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

import { env } from '~/env';
import { prepareImageForUpload, uploadImage, validateUploadSize } from '~/utils/imageUpload';

import { AppDrawer } from '../ui/drawer';
import { EntityAvatar } from '../ui/avatar';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';

const createImage = async (url: string) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load image for cropping'));
  });

  return image;
};

const getCroppedImage = async (imageSrc: string, pixelCrop: Area) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Cannot get canvas context');
  }

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      0.9,
    );
  });
};

const detailsSchema = (t: TFunction) =>
  z.object({
    name: z
      .string({ required_error: t('errors.name_required') })
      .min(1, { message: t('errors.name_required') }),
    image: z.string().nullable().optional(),
  });

type UpdateDetailsFormValues = z.infer<ReturnType<typeof detailsSchema>>;

export const UpdateName: React.FC<{
  className?: string;
  defaultName: string;
  defaultImage?: string | null;
  onNameSubmit: (values: { name: string; image?: string | null }) => void | Promise<void>;
}> = ({ className, defaultName, defaultImage, onNameSubmit }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const { t } = useTranslation();

  const detailForm = useForm<UpdateDetailsFormValues>({
    resolver: zodResolver(detailsSchema(t)),
    defaultValues: {
      name: defaultName,
      image: defaultImage,
    },
  });

  React.useEffect(() => {
    detailForm.reset({
      name: defaultName,
      image: defaultImage,
    });
  }, [defaultImage, defaultName, detailForm]);

  React.useEffect(
    () => () => {
      if (imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    },
    [imageSrc],
  );

  const trigger = useMemo(() => <Pencil className={className} />, [className]);

  const handleOpenChange = useCallback(
    (openVal: boolean) => {
      if (openVal !== drawerOpen) {
        if (!openVal && imageSrc?.startsWith('blob:')) {
          URL.revokeObjectURL(imageSrc);
          setImageSrc(null);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setCroppedAreaPixels(null);
        }
        setDrawerOpen(openVal);
      }
    },
    [drawerOpen, imageSrc],
  );

  const handleOnActionClick = useCallback(async () => {
    const isValid = await detailForm.trigger();
    if (!isValid) {
      return;
    }

    await detailForm.handleSubmit(async (values) => {
      let nextImage = values.image;

      if (imageSrc && croppedAreaPixels) {
        try {
          const croppedBlob = await getCroppedImage(imageSrc, croppedAreaPixels);
          let croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });

          try {
            croppedFile = await prepareImageForUpload(croppedFile);
          } catch (error) {
            console.error('Compression failed:', error);
            toast.error(t('errors.image_compression_failed'));
          }

          if (!validateUploadSize(croppedFile)) {
            toast.error(t('errors.less_than', { size: env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB }));
            return;
          }

          nextImage = await uploadImage(croppedFile);
          toast.success(
            t('expense_details.add_expense_details.upload_file.messages.upload_success'),
          );
        } catch (error) {
          console.error('Crop/upload error:', error);
          toast.error(t('errors.uploading_error'));
          return;
        }
      }

      await onNameSubmit({ ...values, image: nextImage });
      setDrawerOpen(false);
      if (imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    })();
  }, [croppedAreaPixels, detailForm, imageSrc, onNameSubmit, t]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) {
        return;
      }

      const objectUrl = URL.createObjectURL(selectedFile);
      if (imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }

      setImageSrc(objectUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      event.target.value = '';
    },
    [imageSrc],
  );

  const field = useCallback(
    ({ field }: any) => (
      <FormItem className="w-full">
        <FormControl>
          <Input className="text-lg" placeholder={t('account.edit_name.placeholder')} {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    ),
    [t],
  );

  return (
    <AppDrawer
      trigger={trigger}
      open={drawerOpen}
      onOpenChange={handleOpenChange}
      leftAction={t('actions.close')}
      title={t('account.edit_name.title')}
      shouldCloseOnAction={false}
      className="h-[80vh]"
      actionTitle={t('actions.save')}
      actionOnClick={handleOnActionClick}
    >
      <Form {...detailForm}>
        <form className="mt-4 flex w-full flex-col gap-4" onSubmit={handleOnActionClick}>
          {!imageSrc ? (
            <div className="flex w-full items-center justify-around px-16">
              <EntityAvatar
                entity={{
                  name: detailForm.watch('name'),
                  image: detailForm.watch('image'),
                }}
                size={80}
              />
              <Label htmlFor="profile-image-input" className="cursor-pointer">
                <Camera className="size-5" />
                <Input
                  onChange={handleFileChange}
                  id="profile-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                />
              </Label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative h-64 w-full overflow-hidden rounded-lg bg-black/5">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="px-2 pb-2">
                <Label className="mb-4 block" htmlFor="zoom-slider">
                  {t('account.edit_name.zoom')}
                </Label>
                <Slider
                  id="zoom-slider"
                  min={1}
                  max={3}
                  step={0.1}
                  value={[zoom]}
                  onValueChange={(val) => setZoom(val[0] ?? 1)}
                />
              </div>
            </div>
          )}
          <FormField control={detailForm.control} name="name" render={field} />
        </form>
      </Form>
    </AppDrawer>
  );
};
