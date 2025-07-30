import { CATEGORIES, type CategoryItem } from '~/lib/category';
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';

import { Button } from '../ui/button';
import { CategoryIcon } from '../ui/categoryIcons';
import { AppDrawer, DrawerClose } from '../ui/drawer';

export const CategoryPicker: React.FC<{
  category: string;
  onCategoryPick: (category: string) => void;
}> = ({ category, onCategoryPick }) => {
  const { t } = useTranslation('expense_details');

  const trigger = useMemo(
    () => (
      <div className="flex w-[70px] justify-center rounded-lg border py-2">
        <CategoryIcon category={category} size={20} />
      </div>
    ),
    [category],
  );

  return (
    <AppDrawer
      trigger={trigger}
      title={t('ui.categories.title')}
      className="h-[70vh]"
      shouldCloseOnAction
    >
      {Object.entries(CATEGORIES).map(([categoryName, categoryItems]) => (
        <div key={categoryName} className="mb-8">
          <h3 className="mb-4 text-lg font-semibold">
            {t(`ui.categories.categories_list.${categoryName}.name`)}
          </h3>
          <div className="flex flex-wrap justify-between gap-2">
            {categoryItems.map((key: string) => {
              const handleClick = useMemo(
                () => () => {
                  onCategoryPick('other' === key ? categoryName : key);
                },
                [key],
              );

              return (
                <DrawerClose key={key}>
                  <Button
                    variant="ghost"
                    className="flex w-[75px] flex-col gap-1 py-8 text-center"
                    onClick={handleClick}
                  >
                    <span className="block text-2xl">
                      <CategoryIcon
                        category={(key === 'other' ? categoryName : key) as CategoryItem}
                      />
                    </span>
                    <span className="block text-xs capitalize">
                      {t(`ui.categories.categories_list.${categoryName}.items.${key}`)}
                    </span>
                  </Button>
                </DrawerClose>
              );
            })}
          </div>
        </div>
      ))}
    </AppDrawer>
  );
};
