import type { CategoryItem } from '~/lib/category';
import { DummyGroupType } from './groupGenerator';

/**
 * Amount ranges for each category (in cents, already BigInt values)
 * Ranges are [min, max] and represent realistic expense amounts for that category
 * Values are already in cents (e.g., 800 = $8.00)
 * These are base USD ranges; convert using CURRENCY_MULTIPLIERS for other currencies
 */
export const CATEGORY_AMOUNT_RANGES = {
  // Food category
  diningOut: [800n, 8000n], // $8.00–$80.00 for meal(s)
  groceries: [3000n, 20000n], // $30.00–$200.00 for grocery shopping
  liquor: [1500n, 6000n], // $15.00–$60.00 for drinks/alcohol
  food: [500n, 5000n], // $5.00–$50.00 general food (fallback for section)

  // Travel category
  bicycle: [1000n, 30000n], // $10.00–$300.00 for bike/accessories
  bus: [500n, 5000n], // $5.00–$50.00 for bus tickets
  train: [1000n, 15000n], // $10.00–$150.00 for train tickets
  car: [2000n, 50000n], // $20.00–$500.00 for car-related expenses (maintenance, rental)
  fuel: [1000n, 10000n], // $10.00–$100.00 for fuel
  hotel: [8000n, 50000n], // $80.00–$500.00 per night
  parking: [500n, 5000n], // $5.00–$50.00 for parking
  plane: [10000n, 150000n], // $100.00–$1500.00 for flights
  taxi: [500n, 5000n], // $5.00–$50.00 for taxi/rideshare
  travel: [500n, 10000n], // $5.00–$100.00 general travel (fallback for section)

  // Home category
  electronics: [5000n, 200000n], // $50.00–$2000.00 for electronics
  furniture: [5000n, 200000n], // $50.00–$2000.00 for furniture
  supplies: [500n, 5000n], // $5.00–$50.00 for supplies
  maintenance: [1000n, 50000n], // $10.00–$500.00 for maintenance
  mortgage: [80000n, 300000n], // $800.00–$3000.00 monthly (often split)
  pets: [1000n, 20000n], // $10.00–$200.00 for pet-related
  rent: [80000n, 300000n], // $800.00–$3000.00 monthly (often split)
  services: [1000n, 50000n], // $10.00–$500.00 for services
  home: [500n, 10000n], // $5.00–$100.00 general home (fallback for section)

  // Life category
  childcare: [5000n, 50000n], // $50.00–$500.00 for childcare
  clothing: [2000n, 20000n], // $20.00–$200.00 for clothing
  education: [5000n, 50000n], // $50.00–$500.00 for education
  gifts: [1000n, 15000n], // $10.00–$150.00 for gifts
  insurance: [5000n, 100000n], // $50.00–$1000.00 for insurance (often split)
  medical: [1000n, 50000n], // $10.00–$500.00 for medical
  taxes: [5000n, 100000n], // $50.00–$1000.00+ for taxes (if split)
  life: [500n, 10000n], // $5.00–$100.00 general life (fallback for section)

  // Entertainment category
  games: [500n, 10000n], // $5.00–$100.00 for games
  movies: [1000n, 5000n], // $10.00–$50.00 for movies/cinema
  music: [500n, 5000n], // $5.00–$50.00 for music
  sports: [1000n, 20000n], // $10.00–$200.00 for sports activities
  entertainment: [500n, 10000n], // $5.00–$100.00 general entertainment (fallback for section)

  // Utilities category
  cleaning: [500n, 5000n], // $5.00–$50.00 for cleaning supplies/service
  electricity: [2000n, 15000n], // $20.00–$150.00 monthly utility
  gas: [2000n, 15000n], // $20.00–$150.00 monthly utility
  internet: [500n, 5000n], // $5.00–$50.00 monthly
  trash: [200n, 2000n], // $2.00–$20.00 monthly
  phone: [500n, 10000n], // $5.00–$100.00 monthly
  water: [1000n, 10000n], // $10.00–$100.00 monthly utility
  utilities: [500n, 10000n], // $5.00–$100.00 general utilities (fallback for section)

  // General category
  general: [500n, 20000n], // $5.00–$200.00 for misc
} as const satisfies Record<CategoryItem, readonly [bigint, bigint]>;

/**
 * Group type to category affinity weights
 * Defines which categories are most common for each group type
 * Weights should sum to approximately 1.0
 */
export const GROUP_TYPE_CATEGORY_AFFINITY = {
  [DummyGroupType.Trip]: {
    travel: 0.4,
    food: 0.35,
    entertainment: 0.15,
    utilities: 0.05,
    life: 0.02,
    home: 0.02,
    general: 0.01,
  },
  [DummyGroupType.Job]: {
    food: 0.5,
    utilities: 0.2,
    travel: 0.15,
    life: 0.1,
    home: 0.03,
    entertainment: 0.02,
    general: 0.01,
  },
  [DummyGroupType.Household]: {
    utilities: 0.35,
    home: 0.3,
    food: 0.2,
    life: 0.1,
    travel: 0.02,
    entertainment: 0.02,
    general: 0.01,
  },
  [DummyGroupType.CowFriends]: {
    food: 0.35,
    entertainment: 0.3,
    travel: 0.15,
    utilities: 0.1,
    life: 0.05,
    home: 0.03,
    general: 0.02,
  },
} as const;

export type DummyGroupCategory = keyof (typeof GROUP_TYPE_CATEGORY_AFFINITY)[DummyGroupType];

/**
 * Direct user-to-user expense categories
 * Restricted to categories appropriate for casual spending between friends
 */
export const DIRECT_EXPENSE_CATEGORIES = ['food', 'entertainment', 'travel'] as const;

/**
 * Direct expense amount range (in cents, already BigInt values)
 * Typically smaller than group expenses
 */
export const DIRECT_EXPENSE_AMOUNT_RANGE = [500n, 15000n] as const; // $5.00–$150.00

/**
 * Expense frequency guidelines (expenses per group by type)
 * These are base expectations; actual counts are randomized around these
 */
export const EXPENSE_FREQUENCY_BY_GROUP_TYPE = {
  [DummyGroupType.Trip]: [5, 30], // 5–30 expenses per trip
  [DummyGroupType.Job]: [15, 100], // 15–100 expenses per job group
  [DummyGroupType.Household]: [20, 200], // 20–200 expenses per household
  [DummyGroupType.CowFriends]: [3, 20], // 3–20 expenses per friend group
} as const;

/**
 * Direct expense frequency per user pair
 * How many expenses are generated for each connected user pair
 */
export const DIRECT_EXPENSE_FREQUENCY_PER_PAIR = [2, 10] as const;

/**
 * Probability of creating a direct expense between two random users
 * (that aren't already in the same group)
 */
export const RANDOM_PAIR_PROBABILITY = 0.1; // 10% of possible pairs

/**
 * Expense name templates for different categories
 * Templates use {placeholder} syntax for context injection
 * Multiple templates per category add variety
 */
export const EXPENSE_NAME_TEMPLATES = {
  // Food
  food: ['Food expense', 'Meal', 'Dining'],
  diningOut: [
    'Dinner at {adjective} {cuisine} restaurant',
    'Lunch at {restaurant}',
    'Brunch at {location}',
    'Pizza night',
    'Team lunch',
    'Coffee and {item}',
    'Happy hour',
    'Dinner with {name}',
  ],
  groceries: [
    'Weekly groceries',
    'Grocery shopping at {store}',
    'Costco run',
    'Market shopping',
    'Bulk groceries',
  ],
  liquor: ['Drinks night', 'Alcohol for party', 'Wine bottles', 'Beer run', 'Cocktail supplies'],

  // Travel
  travel: ['Travel expense', 'Trip cost', 'Transportation'],
  bicycle: ['Bike maintenance', 'Bike accessories', 'Bike repair', 'New bike'],
  bus: ['Bus tickets to {destination}', 'Bus pass', 'Group transit tickets'],
  train: ['Train tickets to {destination}', 'Train pass', 'Railway journey'],
  car: ['Car rental in {location}', 'Car maintenance', 'Vehicle rental'],
  fuel: ['Gas fill-up', 'Fuel for trip', 'Petrol'],
  hotel: ['Hotel in {destination}', '{destination} accommodation', 'Airbnb in {destination}'],
  plane: ['Flight to {destination}', 'Airfare', 'International flight'],
  taxi: ['Taxi to {location}', 'Uber/Lyft ride', 'Rideshare to {location}', 'Airport taxi'],
  parking: ['Parking fees', 'Parking at {location}', 'Valet parking'],

  // Home
  home: ['Home expense', 'Household cost', 'Housing'],
  electronics: ['Electronics purchase', 'New {item}', 'Computer equipment', 'TV for {room}'],
  furniture: ['Furniture for {room}', 'New sofa', 'Dining table', 'Shelving unit'],
  supplies: ['Home supplies', 'Cleaning supplies', 'Hardware store'],
  maintenance: [
    'Home maintenance',
    'Plumber visit',
    'Electrician repair',
    'AC maintenance',
    'Roof repair',
  ],
  mortgage: ['Mortgage payment', 'House payment'],
  pets: ['Vet visit', 'Pet food', 'Pet supplies', 'Dog grooming'],
  rent: ['Monthly rent', 'Rent payment', 'Lease payment'],
  services: ['House cleaning', 'Lawn care', 'Home services'],

  // Life
  life: ['Life expense', 'Personal cost'],
  childcare: ['Daycare fees', 'Babysitter', 'Childcare'],
  clothing: ['Clothes shopping', 'New outfit', 'Wardrobe update', '{person} clothes'],
  education: ['Tuition payment', 'Courses', 'Books', 'School supplies'],
  gifts: ['Birthday gift for {person}', 'Christmas gifts', 'Holiday presents'],
  insurance: ['Insurance premium', 'Health insurance', 'Car insurance'],
  medical: ['Doctor visit', 'Pharmacy', 'Medical expenses', 'Dental'],
  taxes: ['Tax payment', 'Accountant fees'],

  // Entertainment
  entertainment: ['Entertainment', 'Fun activity', 'Leisure'],
  games: ['Video games', 'Board games', 'Game night supplies'],
  movies: ['Movie tickets', 'Cinema visit', 'Movie night supplies'],
  music: ['Concert tickets', 'Music streaming', 'Instruments'],
  sports: ['Gym membership', 'Sports equipment', 'Event tickets', 'Fitness class'],

  // Utilities
  utilities: ['Utilities bill', 'Monthly services'],
  cleaning: ['Cleaning supplies', 'House cleaning service'],
  electricity: ['Electricity bill', 'Monthly utilities'],
  gas: ['Gas bill', 'Heating bill'],
  internet: ['Internet bill', 'Internet service'],
  trash: ['Trash service', 'Waste management'],
  phone: ['Phone bill', 'Mobile service'],
  water: ['Water bill', 'Water service'],

  // General
  general: ['Miscellaneous expense', 'General expense', 'Shared cost'],
} as const;

/**
 * Context-specific name generation
 * For placeholders in expense name templates, use faker.js methods directly:
 * - {cuisine}: faker.cuisine() or faker.helpers.arrayElement(['Italian', 'Japanese', ...])
 * - {adjective}: faker.word.adjective()
 * - {store}: faker.company.name() (for generic store)
 * - {restaurant}: faker.restaurant.name() or similar
 * - {location}: faker.location.city() or faker.location.street()
 * - {destination}: faker.location.city()
 * - {item}: faker.word.noun()
 * - {room}: faker.helpers.arrayElement(['living room', 'bedroom', ...])
 * - {person}: faker.person.firstName()
 * - {name}: faker.person.firstName()
 *
 * This keeps the generation dynamic and deterministic through faker's seed.
 */

/**
 * Split type distribution weights
 * Defines how often each split type is used
 */
export const SPLIT_TYPE_WEIGHTS = {
  EQUAL: 0.6, // Most common: even splits
  PERCENTAGE: 0.2, // Some custom percentages
  EXACT: 0.15, // Specific amounts
  SHARE: 0.05, // Share-based splits
} as const;

/**
 * Participant selection strategy weights
 * For group expenses, defines how many participants to include
 */
export const PARTICIPANT_SELECTION_STRATEGY = {
  allMembers: 0.4, // 40%: include all group members
  subset: 0.5, // 50%: include 50–100% of members
  pair: 0.1, // 10%: include only specific pairs
} as const;
