import { faker } from '@faker-js/faker';
import { EXPENSE_NAME_TEMPLATES } from './metadata';

/**
 * Generates realistic expense names by selecting templates and injecting faker.js-generated context
 * Templates use {placeholder} syntax that gets replaced with dynamic values from faker.js
 */

/**
 * Generates a random cuisine type
 */
const generateCuisine = (): string => {
  const cuisines = [
    'Italian',
    'Japanese',
    'Mexican',
    'Chinese',
    'Thai',
    'Indian',
    'French',
    'Korean',
    'Vietnamese',
    'Mediterranean',
    'Spanish',
  ];
  return faker.helpers.arrayElement(cuisines);
};

/**
 * Generates a random adjective for describing restaurants/shops
 */
const generateAdjective = (): string => faker.food.ethnicCategory();
/**
 * Generates a store name
 */
const generateStore = (): string => {
  const stores = [
    'Walmart',
    'Target',
    'Whole Foods',
    "Trader Joe's",
    'Costco',
    'Kroger',
    'Safeway',
  ];
  return faker.helpers.arrayElement(stores);
};

/**
 * Generates a restaurant name or type
 */
const generateRestaurant = (): string => {
  const restaurants = [
    'Pizza Place',
    'Burger Joint',
    'Steakhouse',
    'Sushi Bar',
    'Taco Stand',
    'Thai Kitchen',
  ];
  return faker.helpers.arrayElement(restaurants);
};

/**
 * Generates a room name
 */
const generateRoom = (): string => {
  const rooms = ['living room', 'bedroom', 'kitchen', 'office', 'bathroom'];
  return faker.helpers.arrayElement(rooms);
};

/**
 * Generates a food item name
 */
const generateItem = (): string => {
  const items = ['pastry', 'donut', 'sandwich', 'snack'];
  return faker.helpers.arrayElement(items);
};

/**
 * Generates a location/destination name
 */
const generateLocation = (): string => faker.location.city();

/**
 * Generates a destination city name
 */
const generateDestination = (): string => faker.location.city();

/**
 * Generates a person's first name
 */
const generatePerson = (): string => faker.person.firstName();

/**
 * Map of placeholder names to generator functions
 */
const placeholderGenerators: Record<string, () => string> = {
  cuisine: generateCuisine,
  adjective: generateAdjective,
  store: generateStore,
  restaurant: generateRestaurant,
  location: generateLocation,
  destination: generateDestination,
  item: generateItem,
  room: generateRoom,
  person: generatePerson,
  name: generatePerson, // alias for person
};

/**
 * Replaces all placeholders in a template string with generated values from faker.js
 *
 * @param template - The template string with {placeholder} syntax
 * @returns The template with all placeholders replaced with generated values
 *
 * @example
 * injectContext('Dinner at {adjective} {cuisine} restaurant')
 * // Returns something like: 'Dinner at cozy Italian restaurant'
 */
export const injectContext = (template: string): string =>
  template.replace(/{(\w+)}/g, (match, placeholder) => {
    const generator = placeholderGenerators[placeholder];
    return generator ? generator() : match;
  });

/**
 * Generates a realistic expense name for a given category
 *
 * @param category - The category or subcategory name (e.g., 'diningOut', 'food', 'travel')
 * @returns A randomly selected template with all placeholders injected with context
 *
 * @example
 * generateExpenseName('diningOut')
 * // Returns something like: 'Dinner at cozy Italian restaurant'
 *
 * @example
 * generateExpenseName('groceries')
 * // Returns: 'Grocery shopping at Trader Joe's'
 */
export const generateExpenseName = (category: keyof typeof EXPENSE_NAME_TEMPLATES): string => {
  const templates = EXPENSE_NAME_TEMPLATES[category];
  // Select a random template for this category
  const template = faker.helpers.arrayElement(templates);
  // Inject context into the template
  return injectContext(template);
};

/**
 * Generates expense names for a group of expenses, ensuring some variety
 * while maintaining reasonable patterns (e.g., repeated categories with slight variations)
 *
 * @param categories - Array of categories to generate names for
 * @returns Array of generated expense names
 *
 * @example
 * generateMultipleExpenseNames(['diningOut', 'diningOut', 'groceries'])
 * // Returns something like: ['Dinner at nice Italian restaurant', 'Lunch at Sushi Bar', 'Weekly groceries']
 */
export const generateMultipleExpenseNames = (
  categories: (keyof typeof EXPENSE_NAME_TEMPLATES)[],
): string[] => categories.map((category) => generateExpenseName(category));
