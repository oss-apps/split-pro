import { MapPin, Trash2Icon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import MainLayout from '~/components/Layout/MainLayout';
import { SimpleConfirmationDialog } from '~/components/SimpleConfirmationDialog';
import { Button } from '~/components/ui/button';
import { LoadingSpinner } from '~/components/ui/spinner';
import { StarRating } from '~/components/ui/star-rating';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type NextPageWithUser } from '~/types';
import { type RouterOutputs, api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';

type PlaceStat = RouterOutputs['place']['getPlacesWithStats'][number];

// Leaflet touches `window`, so the map is loaded client-side only.
const PlacesMap = dynamic(() => import('~/components/Places/PlacesMap').then((m) => m.PlacesMap), {
  ssr: false,
  loading: () => (
    <div className="mt-20 flex justify-center">
      <LoadingSpinner className="text-primary" />
    </div>
  ),
});

const PlacesPage: NextPageWithUser = () => {
  const { t } = useTranslationWithUtils();
  const apiUtils = api.useUtils();

  const placesQuery = api.place.getPlacesWithStats.useQuery();
  const deletePlace = api.place.delete.useMutation({
    onSuccess: () => {
      apiUtils.place.invalidate().catch(console.error);
    },
    onError: () => toast.error(t('errors.something_went_wrong')),
  });

  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const withCoords = useMemo(
    () => places.filter((p) => p.lat !== null && p.lng !== null),
    [places],
  );

  const onDelete = useCallback((id: string) => deletePlace.mutateAsync({ id }), [deletePlace]);

  return (
    <>
      <Head>
        <title>{t('places.title')}</title>
      </Head>
      <MainLayout title={t('places.title')} loading={placesQuery.isPending}>
        {places.length === 0 ? (
          <div className="mt-[25vh] text-center text-gray-400">{t('places.no_places')}</div>
        ) : (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="list">{t('places.list_tab')}</TabsTrigger>
              <TabsTrigger value="map">{t('places.map_tab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <div className="flex flex-col gap-3">
                {places.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    onDelete={onDelete}
                    deleting={deletePlace.isPending}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="map">
              {withCoords.length > 0 ? (
                <PlacesMap places={withCoords} />
              ) : (
                <div className="mt-[20vh] text-center text-gray-400">
                  {t('places.no_coordinates')}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </MainLayout>
    </>
  );
};

const PlaceCard: React.FC<{
  place: PlaceStat;
  onDelete: (id: string) => Promise<unknown>;
  deleting: boolean;
}> = ({ place, onDelete, deleting }) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const onConfirm = useCallback(async () => {
    await onDelete(place.id);
  }, [onDelete, place.id]);

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-800 p-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <MapPin className="text-primary h-4 w-4 shrink-0" />
          <span className="truncate font-medium">{place.name}</span>
        </div>
        {place.address ? (
          <span className="truncate text-xs text-gray-500">{place.address}</span>
        ) : null}
        <span className="text-xs text-gray-400">
          {t('places.visits', { count: place.visitCount })}
        </span>
        <div className="mt-1 flex items-center gap-2">
          {place.yourAverageRating !== null ? (
            <>
              <StarRating value={Math.round(place.yourAverageRating)} readOnly size={14} />
              <span className="text-xs text-gray-400">{place.yourAverageRating.toFixed(1)}</span>
            </>
          ) : (
            <span className="text-xs text-gray-500">{t('places.no_rating')}</span>
          )}
        </div>
        {place.totals.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-300">
            {place.totals.map((total) => (
              <span key={total.currency}>
                {t('places.total_spent')}:{' '}
                {getCurrencyHelpersCached(total.currency).toUIString(total.amount)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <SimpleConfirmationDialog
        title={t('places.delete')}
        description={t('places.delete_confirm')}
        hasPermission
        variant="destructive"
        loading={deleting}
        onConfirm={onConfirm}
      >
        <Button variant="ghost" size="icon" className="shrink-0">
          <Trash2Icon className="text-negative h-4 w-4" />
        </Button>
      </SimpleConfirmationDialog>
    </div>
  );
};

PlacesPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default PlacesPage;
