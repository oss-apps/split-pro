import Image from 'next/image';
import { AppDrawer } from '../ui/drawer';
import { useMemo } from 'react';

export const Receipt = ({ fileKey, url }: { fileKey: string; url: string }) => {
  const receiptThumbnail = useMemo(() => {
    return (
      <Image
        src={`${url}/${fileKey}`}
        alt="Expense receipt"
        width={56}
        height={56}
        data-loaded="false"
        onLoad={setDataLoaded}
        className="h-14 w-14 rounded-md object-cover object-center data-[loaded=false]:animate-pulse data-[loaded=false]:bg-gray-100/10"
      />
    );
  }, [fileKey, url]);

  return (
    <AppDrawer
      trigger={receiptThumbnail}
      leftAction="Close"
      title="Expense Receipt"
      className="h-[98vh]"
    >
      <div className="mb-8 overflow-scroll">
        <Image
          src={`${url}/${fileKey}`}
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
