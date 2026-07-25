import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type RouterOutputs } from '~/utils/api';

import { StarRating } from '../ui/star-rating';

type PlaceStat = RouterOutputs['place']['getPlacesWithStats'][number];
type PlaceWithCoords = PlaceStat & { lat: number; lng: number };

const BOUNDS_OPTIONS = { padding: [40, 40] as [number, number], maxZoom: 15 };

// Self-contained marker (no external image assets, avoids Leaflet's broken-icon issue).
const pinIcon = L.divIcon({
  className: 'splitpro-place-pin',
  html: `<svg width="26" height="26" viewBox="0 0 24 24" fill="#10b981" stroke="white" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z"/><circle cx="12" cy="11" r="2.4" fill="white"/></svg>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -24],
});

/** `places` must already be filtered to those that have coordinates. */
export const PlacesMap: React.FC<{ places: PlaceStat[] }> = ({ places }) => {
  const points = useMemo(
    () => places.filter((p): p is PlaceWithCoords => p.lat !== null && p.lng !== null),
    [places],
  );

  const bounds = useMemo(
    () =>
      points.length > 0
        ? L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
        : null,
    [points],
  );

  if (!bounds) {
    return null;
  }

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={BOUNDS_OPTIONS}
      scrollWheelZoom
      className="h-[70vh] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((place) => (
        <PlaceMarker key={place.id} place={place} />
      ))}
    </MapContainer>
  );
};

const PlaceMarker: React.FC<{ place: PlaceWithCoords }> = ({ place }) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const position = useMemo<[number, number]>(() => [place.lat, place.lng], [place.lat, place.lng]);

  return (
    <Marker position={position} icon={pinIcon}>
      <Popup>
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{place.name}</span>
          {place.address ? <span className="text-xs text-gray-500">{place.address}</span> : null}
          <span className="text-xs text-gray-500">
            {t('places.visits', { count: place.visitCount })}
          </span>
          {place.yourAverageRating !== null ? (
            <span className="flex items-center gap-1 text-xs">
              <StarRating value={Math.round(place.yourAverageRating)} readOnly size={12} />
              <span>{place.yourAverageRating.toFixed(1)}</span>
            </span>
          ) : null}
          {place.totals.map((total) => (
            <span key={total.currency} className="text-xs">
              {t('places.total_spent')}:{' '}
              {getCurrencyHelpersCached(total.currency).toUIString(total.amount)}
            </span>
          ))}
        </div>
      </Popup>
    </Marker>
  );
};

export default PlacesMap;
