import { Banknote } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';

import { Button } from '../ui/button';
import { CategoryIcons } from '../ui/categoryIcons';
import { AppDrawer, DrawerClose } from '../ui/drawer';

export const CategoryPicker: React.FC<{
  category: string;
  onCategoryPick: (category: string) => void;
}> = ({ category, onCategoryPick }) => {
  const { t } = useTranslation('expense_details');
  const CategoryIcon = useMemo(() => CategoryIcons[category] ?? Banknote, [category]);

  return (
    <AppDrawer
      trigger={
        <div className="flex w-[70px] justify-center rounded-lg border py-2">
          <CategoryIcon size={20} />
        </div>
      }
      title={t('ui.categories.title')}
      className="h-[70vh]"
      shouldCloseOnAction
    >
      {Object.entries(CATEGORIES).map(([categoryName, categoryDetails]) => {
        return (
          <div key={categoryName} className="mb-8">
            <h3 className="mb-4 text-lg font-semibold">{t(`ui.categories.categories_list.${categoryName}.name`)}</h3>
            <div className="flex flex-wrap justify-between gap-2">
              {categoryDetails.items.map((key) => {
                const Icon = CategoryIcons[key] ?? CategoryIcons[categoryName] ?? Banknote;
                return (
                  <DrawerClose key={key}>
                    <Button
                      variant="ghost"
                      className="flex w-[75px] flex-col gap-1 py-8 text-center"
                      onClick={() => {
                        onCategoryPick('other' === key ? categoryName : key);
                      }}
                    >
                      <span className="block text-2xl">
                        <Icon />
                      </span>
                      <span className="block text-xs capitalize">{t(`ui.categories.categories_list.${categoryName}.items.${key}`)}</span>
                    </Button>
                  </DrawerClose>
                );
              })}
            </div>
          </div>
        );
      })}
    </AppDrawer>
  );
};

const CATEGORIES = {
  entertainment: {
    items: ['games', 'movies', 'music', 'sports', 'other'],
  },
  food: {
    items: ['diningOut', 'groceries', 'liquor', 'other'],
  },
  home: {
    items: ['electronics', 'furniture', 'supplies', 'maintenance', 'mortgage', 'pets', 'rent', 'services', 'other'],
  },
  life: {
    items: ['childcare', 'clothing', 'education', 'gifts', 'medical', 'taxes', 'other'],
  },
  travel: {
    items: ['bus', 'train', 'car', 'fuel', 'parking', 'plane', 'taxi', 'other'],
  },
  utilities: {
    items: ['cleaning', 'electricity', 'gas', 'internet', 'trash', 'phone', 'water', 'other'],
  },
};
