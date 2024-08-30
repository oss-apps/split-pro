import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { UserInput } from './UserInput';
import { SelectUserOrGroup } from './SelectUserOrGroup';
import { AppDrawer, DrawerClose } from '../ui/drawer';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { Banknote, CalendarIcon, Check } from 'lucide-react';
import { Input } from '../ui/input';
import { SplitTypeSection } from './SplitTypeSection';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '~/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import UploadFile from './UploadFile';
import { CategoryIcons } from '../ui/categoryIcons';
import Link from 'next/link';
import { CURRENCIES } from '~/lib/currency';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';

export const AddExpensePage: React.FC<{ isStorageConfigured: boolean }> = ({
  isStorageConfigured,
}) => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [open, setOpen] = React.useState(false);
  const [amtStr, setAmountStr] = React.useState('');
  
  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

  const categories = {
    entertainment: {
      name: t('category_entertainment'),
      items: [
        {
          games: t('category_games'),
          movies: t('category_movies'),
          music: t('category_music'),
          sports: t('category_sports'),
          other: t('category_entertainment'),
        },
      ],
    },
    food: {
      name: t('category_food'),
      items: [
        {
          diningOut: t('category_diningOut'),
          groceries: t('category_groceries'),
          liquor: t('category_liquor'),
          other: t('category_food'),
        },
      ],
    },
    home: {
      name: t('category_home'),
      items: [
        {
          electronics: t('category_electronics'),
          furniture: t('category_furniture'),
          supplies: t('category_supplies'),
          maintenance: t('category_maintenance'),
          mortgage: t('category_mortgage'),
          pets: t('category_pets'),
          rent: t('category_rent'),
          services: t('category_services'),
          other: t('category_home'),
        },
      ],
    },
    life: {
      name: t('category_life'),
      items: [
        {
          childcare: t('category_childcare'),
          clothing: t('category_clothing'),
          education: t('category_education'),
          gifts: t('category_gifts'),
          medical: t('category_medical'),
          taxes: t('category_taxes'),
          other: t('category_life'),
        },
      ],
    },
    travel: {
      name: t('category_travel'),
      items: [
        {
          bus: t('category_bus'),
          train: t('category_train'),
          car: t('category_car'),
          fuel: t('category_fuel'),
          parking: t('category_parking'),
          plane: t('category_plane'),
          taxi: t('category_taxi'),
          other: t('category_travel'),
        },
      ],
    },
    utilities: {
      name: t('category_utilities'),
      items: [
        {
          cleaning: t('category_cleaning'),
          electricity: t('category_electricity'),
          gas: t('category_gas'),
          internet: t('category_internet'),
          trash: t('category_trash'),
          phone: t('category_phone'),
          water: t('category_water'),
          other: t('category_utilities'),
        },
      ],
    },
  };

  const showFriends = useAddExpenseStore((s) => s.showFriends);
  const amount = useAddExpenseStore((s) => s.amount);
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const currency = useAddExpenseStore((s) => s.currency);
  const category = useAddExpenseStore((s) => s.category);
  const description = useAddExpenseStore((s) => s.description);
  const isFileUploading = useAddExpenseStore((s) => s.isFileUploading);

  const { setCurrency, setCategory, setDescription, setAmount, resetState } = useAddExpenseStore(
    (s) => s.actions,
  );

  const addExpenseMutation = api.user.addExpense.useMutation();
  const addGroupExpenseMutation = api.group.addExpense.useMutation();
  const updateProfile = api.user.updateUserDetail.useMutation();

  const router = useRouter();

  function onUpdateAmount(amt: string) {
    const _amt = amt.replace(',', '.');
    setAmountStr(_amt);
    setAmount(Number(_amt) || 0);
  }

  function addExpense() {
    const { group, paidBy, splitType, fileKey } = useAddExpenseStore.getState();
    if (!paidBy) {
      return;
    }

    if (group) {
      addGroupExpenseMutation.mutate(
        {
          name: description,
          currency,
          amount,
          groupId: group.id,
          splitType,
          participants: participants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0,
          })),
          paidBy: paidBy.id,
          category,
          fileKey,
          expenseDate: date,
        },
        {
          onSuccess: (d) => {
            if (d) {
              router
                .push(`/groups/${group.id}/expenses/${d?.id}`)
                .then(() => resetState())
                .catch(console.error);
            }
          },
        },
      );
    } else {
      addExpenseMutation.mutate(
        {
          name: description,
          currency,
          amount,
          splitType,
          participants: participants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0,
          })),
          paidBy: paidBy.id,
          category,
          fileKey,
          expenseDate: date,
        },
        {
          onSuccess: (d) => {
            resetState();
            if (participants[1] && d) {
              router
                .push(`/balances/${participants[1]?.id}/expenses/${d?.id}`)
                .then(() => resetState())
                .catch(console.error);
            }
          },
        },
      );
    }
  }

  const CategoryIcon = CategoryIcons[category] ?? Banknote;

  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex items-center justify-between">
          {participants.length === 1 ? (
            <Link href="/balances">
              <Button variant="ghost" className=" px-0 text-primary">
                {t('cancel')}
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" className=" px-0 text-primary" onClick={resetState}>
              {t('cancel')}
            </Button>
          )}
          <div className="text-center">{t('add_expense')}</div>
          <Button
            variant="ghost"
            className=" px-0 text-primary"
            disabled={
              addExpenseMutation.isLoading ||
              addGroupExpenseMutation.isLoading ||
              !amount ||
              description === '' ||
              isFileUploading
            }
            onClick={addExpense}
          >
            {t('save')}
          </Button>{' '}
        </div>
        <UserInput />
        {showFriends || (participants.length === 1 && !group) ? (
          <SelectUserOrGroup />
        ) : (
          <>
            <div className="mt-10 flex gap-2">
              <AppDrawer
                trigger={
                  <div className="flex w-[70px] justify-center rounded-lg border py-2">
                    <CategoryIcon size={20} />
                  </div>
                }
                title={t('expense_categories')}
                className="h-[70vh]"
                shouldCloseOnAction
              >
                <div className="">
                  {Object.entries(categories).map(([categoryName, categoryDetails]) => {
                    return (
                      <div key={categoryName} className="mb-8">
                        <h3 className="mb-4 text-lg font-semibold">{categoryDetails.name}</h3>
                        <div className="flex flex-wrap justify-between gap-2">
                          {categoryDetails.items.map((item, index) =>
                            Object.entries(item).map(([key, value]) => {
                              const Icon =
                                CategoryIcons[key] ?? CategoryIcons[categoryName] ?? Banknote;
                              return (
                                <DrawerClose key={key}>
                                  <Button
                                    variant="ghost"
                                    className="flex w-[75px] flex-col gap-1 py-8 text-center"
                                    onClick={() => {
                                      setCategory(key === 'other' ? categoryName : key);
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
                </div>
              </AppDrawer>
              <Input
                placeholder={t('expense_description_placeholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value.toString() ?? '')}
                className="text-lg placeholder:text-sm"
              />
            </div>
            <div className="flex gap-2">
              <AppDrawer
                trigger={
                  <div className="flex w-[70px] justify-center rounded-lg border py-2  text-center text-base">
                    {currency ?? 'USD'}
                  </div>
                }
                onTriggerClick={() => setOpen(true)}
                title={t('expense_select_currency')}
                className="h-[70vh]"
                shouldCloseOnAction
                open={open}
                onOpenChange={(openVal) => {
                  if (openVal !== open) setOpen(openVal);
                }}
              >
                <div className="">
                  <Command className="h-[50vh]">
                    <CommandInput className="text-lg" placeholder={t('expense_currency_search')}/>
                    <CommandEmpty>{t('expense_currency_notfound')}.</CommandEmpty>
                    <CommandGroup className="h-full overflow-auto">
                      {CURRENCIES.map((framework) => (
                        <CommandItem
                          key={`${framework.code}-${framework.name}`}
                          value={`${framework.code}-${framework.name}`}
                          onSelect={(currentValue) => {
                            const _currency = currentValue.split('-')[0]?.toUpperCase() ?? 'USD';
                            updateProfile.mutate({ currency: _currency });

                            setCurrency(_currency);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              `${framework.code}-${framework.name.toLowerCase()}`.startsWith(
                                currency,
                              )
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <div className="flex gap-2">
                            <p>{framework.name}</p>
                            <p className=" text-muted-foreground">{framework.code}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </div>
              </AppDrawer>

              <Input
                placeholder={t('expense_amount_placeholder')}
                className="text-lg placeholder:text-sm"
                type="text"
                inputMode="decimal"
                value={amtStr}
                onChange={(e) => onUpdateAmount(e.target.value)}
              />
            </div>
            {!amount || description === '' ? null : (
              <>
                <SplitTypeSection />

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            ' justify-start px-0 text-left font-normal',
                            !date && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-6 w-6 text-cyan-500" />
                          {date ? (
                            format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? (
                              t('today')
                            ) : (
                              //format(date, 'MMM dd')
                              t('local_date', {value: new Date(date)})
                            )
                          ) : (
                            <span>{t('expense_date')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-4">
                    {isStorageConfigured ? <UploadFile /> : null}

                    <Button
                      className=" min-w-[100px]"
                      size="sm"
                      loading={
                        addExpenseMutation.isLoading ||
                        addGroupExpenseMutation.isLoading ||
                        isFileUploading
                      }
                      disabled={
                        addExpenseMutation.isLoading ||
                        addGroupExpenseMutation.isLoading ||
                        !amount ||
                        description === '' ||
                        isFileUploading
                      }
                      onClick={() => addExpense()}
                    >
                      {t('submit')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};
