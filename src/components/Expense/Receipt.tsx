import Image from 'next/image';
import { useMemo } from 'react';

import { AppDrawer } from '../ui/drawer';

export const Receipt = ({ fileKey, url }: { fileKey: string; url: string }) => {
  const thumbKey = fileKey.replace('.webp', '-thumb.webp');
  const thumbUrl = `/api/files/${thumbKey}`;
  const fullUrl = `/api/files/${fileKey}`;

  const receiptThumbnail = useMemo(
    () => (
      <Image
        src={thumbUrl}
        alt="Expense receipt thumbnail"
        width={56}
        height={56}
        data-loaded="false"
        onLoad={setDataLoaded}
        className="h-14 w-14 rounded-md object-cover object-center data-[loaded=false]:animate-pulse data-[loaded=false]:bg-gray-100/10"
      />
    ),
    [thumbUrl],
  );

  return (
    <AppDrawer
      trigger={receiptThumbnail}
      leftAction="Close"
      title="Expense Receipt"
      className="h-[98vh]"
    >
      <div className="mb-8 overflow-scroll">
        <Image
          src={fullUrl}
          width={300}
          height={800}
          alt="Expense receipt"
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
