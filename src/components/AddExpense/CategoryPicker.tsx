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
  const { t } = useTranslation('categories');

  const trigger = useMemo(
    () => (
      <div className="flex w-[73px] cursor-pointer justify-center rounded-lg border py-2">
        <CategoryIcon category={category} size={20} />
      </div>
    ),
    [category],
  );

  return (
    <AppDrawer trigger={trigger} title={t('title')} className="h-[70vh]" shouldCloseOnAction>
      {Object.entries(CATEGORIES).map(([categoryName, categoryItems]) => (
        <div key={categoryName} className="mb-8">
          <h3 className="mb-4 text-lg font-semibold">
            {t(`categories_list.${categoryName}.name`)}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(75px,1fr))] gap-4">
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
                    className="flex h-[75px] w-[75px] flex-col items-center justify-start gap-1 justify-self-center py-3 text-center"
                    onClick={handleClick}
                  >
                    <span className="block flex-shrink-0 text-2xl">
                      <CategoryIcon
                        category={(key === 'other' ? categoryName : key) as CategoryItem}
                      />
                    </span>
                    <span className="block text-xs text-wrap">
                      {t(`categories_list.${categoryName}.items.${key}`, { ns: 'categories' })}
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
