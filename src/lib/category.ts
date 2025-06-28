import { Merge } from './type';

export const CATEGORIES = {
  entertainment: {
    name: 'Entertainment',
    items: {
      games: 'Games',
      movies: 'Movies',
      music: 'Music',
      sports: 'Sports',
      other: 'Entertainment',
    },
  },
  food: {
    name: 'Food & Drinks',
    items: {
      diningOut: 'Dining Out',
      groceries: 'Groceries',
      liquor: 'Liquor',
      other: 'Food & Drinks',
    },
  },
  home: {
    name: 'Home',
    items: {
      electronics: 'Electronics',
      furniture: 'Furniture',
      supplies: 'Supplies',
      maintenance: 'Maintenance',
      mortgage: 'Mortgage',
      pets: 'Pets',
      rent: 'Rent',
      services: 'Services',
      other: 'Home',
    },
  },
  life: {
    name: 'Life',
    items: {
      childcare: 'Childcare',
      clothing: 'Clothing',
      education: 'Education',
      gifts: 'Gifts',
      medical: 'Medical',
      taxes: 'Taxes',
      other: 'Life',
    },
  },
  travel: {
    name: 'Travel',
    items: {
      bus: 'Bus',
      train: 'Train',
      car: 'Car',
      fuel: 'Fuel',
      parking: 'Parking',
      plane: 'Plane',
      taxi: 'Taxi',
      other: 'Travel',
    },
  },
  utilities: {
    name: 'Utilities',
    items: {
      cleaning: 'Cleaning',
      electricity: 'Electricity',
      gas: 'Gas',
      internet: 'Internet',
      trash: 'Trash',
      phone: 'Phone',
      water: 'Water',
      other: 'Utilities',
    },
  },
  general: {
    name: 'General',
    items: {
      other: 'General',
    },
  },
} as const satisfies Record<string, { name: string; items: Record<string, string> }>;

export const DEFAULT_CATEGORY = 'general';

export type CategorySection = keyof typeof CATEGORIES;

export type CategoryItem =
  | Exclude<keyof Merge<(typeof CATEGORIES)[CategorySection]['items']>, 'other'>
  | CategorySection;
