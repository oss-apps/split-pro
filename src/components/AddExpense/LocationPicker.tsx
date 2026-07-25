import { Crosshair, MapPin, Plus, X } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '~/lib/utils';
import { useAddExpenseStore } from '~/store/addStore';
import { type RouterOutputs, api } from '~/utils/api';

import { Button } from '../ui/button';
import { AppDrawer } from '../ui/drawer';
import { Input } from '../ui/input';

/**
 * Attach a saved location to an expense. The list is the current user's own places
 * (private per user); typing filters by name and shows how often each has been visited.
 * Selecting or creating a place stores it in the add-expense store — it is upserted under
 * the current user's account when the expense is saved.
 */
export const LocationPicker: React.FC = () => {
  const { t } = useTranslation();
  const place = useAddExpenseStore((s) => s.place);
  const { setPlace } = useAddExpenseStore((s) => s.actions);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const searchQuery = api.place.search.useQuery(
    { query: query.trim() },
    { enabled: open, staleTime: 10_000 },
  );
  const results = searchQuery.data ?? [];

  const trimmed = query.trim();
  const hasExactMatch = results.some((r) => r.name.toLowerCase() === trimmed.toLowerCase());

  const onQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
    [],
  );

  const selectExisting = useCallback(
    (r: PlaceResult) => {
      setPlace({ id: r.id, name: r.name, address: r.address, lat: r.lat, lng: r.lng });
      setOpen(false);
      setQuery('');
      setCoords(null);
    },
    [setPlace],
  );

  const createFromQuery = useCallback(() => {
    if (!trimmed) {
      return;
    }
    setPlace({ name: trimmed, lat: coords?.lat ?? null, lng: coords?.lng ?? null });
    setOpen(false);
    setQuery('');
    setCoords(null);
  }, [trimmed, coords, setPlace]);

  const useCurrentLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error(t('expense_details.add_expense_details.location.geolocation_unsupported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!trimmed) {
          toast.message(t('expense_details.add_expense_details.location.name_required'));
        }
      },
      () => {
        setLocating(false);
        toast.error(t('expense_details.add_expense_details.location.geolocation_error'));
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [t, trimmed]);

  const removeLocation = useCallback(() => {
    setPlace(null);
    setOpen(false);
  }, [setPlace]);

  const trigger = (
    <Button variant="ghost" size="sm" className="gap-2 px-2" type="button">
      <MapPin className={cn('h-5 w-5', place ? 'text-primary' : 'text-gray-300')} />
      <span className={cn('max-w-[140px] truncate text-sm', !place && 'text-gray-400')}>
        {place?.name ?? t('expense_details.add_expense_details.location.add_location')}
      </span>
    </Button>
  );

  return (
    <AppDrawer
      trigger={trigger}
      open={open}
      onOpenChange={setOpen}
      leftAction={t('actions.close')}
      title={t('expense_details.add_expense_details.location.add_location')}
      className="h-[70vh]"
    >
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          value={query}
          onChange={onQueryChange}
          placeholder={t('expense_details.add_expense_details.location.search_placeholder')}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            type="button"
            loading={locating}
            onClick={useCurrentLocation}
          >
            <Crosshair className="h-4 w-4" />
            {t('expense_details.add_expense_details.location.use_current_location')}
          </Button>
          {place ? (
            <Button
              variant="outline"
              size="sm"
              className="text-negative gap-2"
              type="button"
              onClick={removeLocation}
            >
              <X className="h-4 w-4" />
              {t('expense_details.add_expense_details.location.remove')}
            </Button>
          ) : null}
        </div>

        {coords ? (
          <p className="text-xs text-gray-400">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        ) : null}

        <div className="mt-2 flex flex-col gap-1">
          {trimmed && !hasExactMatch ? (
            <Button
              variant="ghost"
              className="justify-start gap-2"
              type="button"
              onClick={createFromQuery}
            >
              <Plus className="h-4 w-4" />
              {t('expense_details.add_expense_details.location.create', { name: trimmed })}
            </Button>
          ) : null}

          {results.map((r) => (
            <ResultRow key={r.id} result={r} onSelect={selectExisting} />
          ))}
        </div>
      </div>
    </AppDrawer>
  );
};

type PlaceResult = RouterOutputs['place']['search'][number];

/** A single autocomplete result; keeps its click handler stable per row. */
const ResultRow: React.FC<{ result: PlaceResult; onSelect: (r: PlaceResult) => void }> = ({
  result,
  onSelect,
}) => {
  const { t } = useTranslation();
  const onClick = useCallback(() => onSelect(result), [onSelect, result]);

  return (
    <Button
      variant="ghost"
      className="h-auto justify-between gap-2 py-2"
      type="button"
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="flex min-w-0 flex-col items-start">
          <span className="truncate">{result.name}</span>
          {result.address ? (
            <span className="truncate text-xs text-gray-500">{result.address}</span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 text-xs text-gray-400">
        {t('expense_details.add_expense_details.location.visits', { count: result.visitCount })}
      </span>
    </Button>
  );
};

export default LocationPicker;
