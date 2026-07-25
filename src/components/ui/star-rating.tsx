import { Star } from 'lucide-react';
import { useState } from 'react';

import { cn } from '~/lib/utils';

interface StarRatingProps {
  /** Current rating, 1-5, or null/0 when unrated. */
  value: number | null;
  /**
   * Called when a star is tapped. Tapping the currently-selected star reports `null`
   * so callers can clear the rating (matching the spec's "tap the same star to clear").
   */
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  size?: number;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  size = 24,
  className,
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= active;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-pressed={value === star}
            className={cn(
              'p-0.5 transition-transform',
              !readOnly && 'cursor-pointer hover:scale-110',
              readOnly && 'cursor-default',
            )}
            onMouseEnter={readOnly ? undefined : () => setHover(star)}
            onMouseLeave={readOnly ? undefined : () => setHover(null)}
            onClick={readOnly ? undefined : () => onChange?.(value === star ? null : star)}
          >
            <Star
              size={size}
              className={cn(filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500')}
            />
          </button>
        );
      })}
    </div>
  );
};
