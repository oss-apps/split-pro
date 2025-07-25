import { type Merge } from './type';

export const CATEGORIES = {
  entertainment: ['games', 'movies', 'music', 'sports', 'other'],
  food: ['diningOut', 'groceries', 'liquor', 'other'],
  home: [
    'electronics',
    'furniture',
    'supplies',
    'maintenance',
    'mortgage',
    'pets',
    'rent',
    'services',
    'other',
  ],
  life: ['childcare', 'clothing', 'education', 'gifts', 'medical', 'taxes', 'other'],
  travel: ['bus', 'train', 'car', 'fuel', 'parking', 'plane', 'taxi', 'other'],
  utilities: ['cleaning', 'electricity', 'gas', 'internet', 'trash', 'phone', 'water', 'other'],
} as const satisfies Record<string, string[]>;

export const DEFAULT_CATEGORY = 'general';

export type CategorySection = keyof typeof CATEGORIES;

export type CategoryItem =
  | Exclude<keyof Merge<(typeof CATEGORIES)[CategorySection]>, 'other'>
  | CategorySection;
