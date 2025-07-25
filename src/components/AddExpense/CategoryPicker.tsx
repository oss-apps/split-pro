import { CATEGORIES, type CategoryItem } from '~/lib/category';

import { Button } from '../ui/button';
import { CategoryIcon } from '../ui/categoryIcons';
import { AppDrawer, DrawerClose } from '../ui/drawer';

export const CategoryPicker: React.FC<{
  category: string;
  onCategoryPick: (category: string) => void;
}> = ({ category, onCategoryPick }) => {
  return (
    <AppDrawer
      trigger={
        <div className="flex w-[70px] justify-center rounded-lg border py-2">
          <CategoryIcon category={category} size={20} />
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
              {Object.entries(categoryDetails.items).map(([key, value]) => (
                <DrawerClose key={key}>
                  <Button
                    variant="ghost"
                    className="flex w-[75px] flex-col gap-1 py-8 text-center"
                    onClick={() => {
                      onCategoryPick(key === 'other' ? categoryName : key);
                    }}
                  >
                    <span className="block text-2xl">
                      <CategoryIcon
                        category={(key === 'other' ? categoryName : key) as CategoryItem}
                      />
                    </span>
                    <span className="block text-xs capitalize">{value}</span>
                  </Button>
                </DrawerClose>
              ))}
            </div>
          </div>
        );
      })}
    </AppDrawer>
  );
};
