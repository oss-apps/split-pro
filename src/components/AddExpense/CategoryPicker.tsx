import { Banknote } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '../ui/button';
import { CategoryIcons } from '../ui/categoryIcons';
import { AppDrawer, DrawerClose } from '../ui/drawer';

export const CategoryPicker: React.FC<{
  category: string;
  onCategoryPick: (category: string) => void;
}> = ({ category, onCategoryPick }) => {
  const CategoryIcon = useMemo(() => CategoryIcons[category] ?? Banknote, [category]);

  return (
    <AppDrawer
      trigger={
        <div className="flex w-[70px] justify-center rounded-lg border py-2">
          <CategoryIcon size={20} />
        </div>
      }
      title="Categories"
      className="h-[70vh]"
      shouldCloseOnAction
    >
      {Object.entries(CATEGORIES).map(([categoryName, categoryDetails]) => {
        return (
          <div key={categoryName} className="mb-8">
            <h3 className="mb-4 text-lg font-semibold">{categoryDetails.name}</h3>
            <div className="flex flex-wrap justify-between gap-2">
              {categoryDetails.items.map((item) =>
                Object.entries(item).map(([key, value]) => {
                  const Icon = CategoryIcons[key] ?? CategoryIcons[categoryName] ?? Banknote;
                  return (
                    <DrawerClose key={key}>
                      <Button
                        variant="ghost"
                        className="flex w-[75px] flex-col gap-1 py-8 text-center"
                        onClick={() => {
                          onCategoryPick(key === 'other' ? categoryName : key);
                        }}
                      >
                        <span className="block text-2xl">
                          <Icon />
                        </span>
                        <span className="block text-xs capitalize">{value}</span>
                      </Button>
                    </DrawerClose>
                  );
                }),
              )}
            </div>
          </div>
        );
      })}
    </AppDrawer>
  );
};

const CATEGORIES = {
  entertainment: {
    name: 'Entertainment',
    items: [
      {
        games: 'Games',
        movies: 'Movies',
        music: 'Music',
        sports: 'Sports',
        other: 'Entertainment',
      },
    ],
  },
  food: {
    name: 'Food & Drinks',
    items: [
      {
        diningOut: 'Dining Out',
        groceries: 'Groceries',
        liquor: 'Liquor',
        other: 'Food & Drinks',
      },
    ],
  },
  home: {
    name: 'Home',
    items: [
      {
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
    ],
  },
  life: {
    name: 'Life',
    items: [
      {
        childcare: 'Childcare',
        clothing: 'Clothing',
        education: 'Education',
        gifts: 'Gifts',
        medical: 'Medical',
        taxes: 'Taxes',
        other: 'Life',
      },
    ],
  },
  travel: {
    name: 'Travel',
    items: [
      {
        bus: 'Bus',
        train: 'Train',
        car: 'Car',
        fuel: 'Fuel',
        parking: 'Parking',
        plane: 'Plane',
        taxi: 'Taxi',
        other: 'Travel',
      },
    ],
  },
  utilities: {
    name: 'Utilities',
    items: [
      {
        cleaning: 'Cleaning',
        electricity: 'Electricity',
        gas: 'Gas',
        internet: 'Internet',
        trash: 'Trash',
        phone: 'Phone',
        water: 'Water',
        other: 'Utilities',
      },
    ],
  },
};
