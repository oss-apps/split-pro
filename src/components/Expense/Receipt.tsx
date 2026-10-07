import { AppDrawer } from '../ui/drawer';

export const Receipt = ({ fileKey }: { fileKey: string }) => {
  const thumbKey = fileKey.replace('.webp', '-thumb.webp');
  const thumbUrl = `/api/files/${thumbKey}`;
  const fullUrl = `/api/files/${fileKey}`;

  return (
    <AppDrawer
      trigger={
        // oxlint-disable-next-line next/no-img-element
        <img
          src={thumbUrl}
          alt="Expense receipt thumbnail"
          width={56}
          height={56}
          data-loaded="false"
          onLoad={setDataLoaded}
          className="h-14 w-14 rounded-md object-cover object-center data-[loaded=false]:animate-pulse data-[loaded=false]:bg-gray-100/10"
        />
      }
      leftAction="Close"
      title="Expense Receipt"
      className="h-[98vh]"
    >
      <div className="mb-8 overflow-scroll">
        {/* oxlint-disable-next-line next/no-img-element */}
        <img
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
