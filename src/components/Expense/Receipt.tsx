import { useTranslation } from 'next-i18next';

import { AppDrawer } from '../ui/drawer';

export const Receipt = ({ fileKey }: { fileKey: string }) => {
  const { t } = useTranslation();
  const thumbKey = fileKey.replace('.webp', '-thumb.webp');
  const thumbUrl = `/api/files/${thumbKey}`;
  const fullUrl = `/api/files/${fileKey}`;

  return (
    <AppDrawer
      trigger={
        // oxlint-disable-next-line next/no-img-element
        <img
          src={thumbUrl}
          alt={t('expense_details.receipt.thumbnail_alt')}
          width={56}
          height={56}
          data-loaded="false"
          onLoad={setDataLoaded}
          className="h-14 w-14 rounded-md object-cover object-center data-[loaded=false]:animate-pulse data-[loaded=false]:bg-gray-100/10"
        />
      }
      leftAction={t('actions.close')}
      title={t('expense_details.receipt.title')}
      className="h-[98vh]"
    >
      <div className="mb-8 overflow-scroll">
        {/* oxlint-disable-next-line next/no-img-element */}
        <img
          src={fullUrl}
          width={300}
          height={800}
          alt={t('expense_details.receipt.image_alt')}
          data-loaded="false"
          onLoad={setDataLoaded}
          className="h-full w-full rounded-2xl object-cover data-[loaded=false]:animate-pulse data-[loaded=false]:bg-gray-100/10"
        />
      </div>
    </AppDrawer>
  );
};

const setDataLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.setAttribute('data-loaded', 'true');
};
