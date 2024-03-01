import { useRouter } from 'next/router';
import React from 'react';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { UserInput } from './UserInput';
import { SelectUserOrGroup } from './SelectUserOrGroup';
import { AppDrawer, Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '../ui/drawer';
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

const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'TWD', name: 'Taiwan New Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'ILS', name: 'Israeli New Shekel' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'AED', name: 'United Arab Emirates Dirham' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'QAR', name: 'Qatari Riyal' },
];

const categories = {
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

export const AddExpensePage: React.FC = () => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [open, setOpen] = React.useState(false);
  const [amtStr, setAmountStr] = React.useState('');

  const showFriends = useAddExpenseStore((s) => s.showFriends);
  const amount = useAddExpenseStore((s) => s.amount);
  const participants = useAddExpenseStore((s) => s.participants);
  const currency = useAddExpenseStore((s) => s.currency);
  const category = useAddExpenseStore((s) => s.category);
  const description = useAddExpenseStore((s) => s.description);
  const isFileUploading = useAddExpenseStore((s) => s.isFileUploading);

  const { setCurrency, setCategory, setDescription, setAmount, resetState } = useAddExpenseStore(
    (s) => s.actions,
  );

  const addExpenseMutation = api.user.addExpense.useMutation();
  const addGroupExpenseMutation = api.group.addExpense.useMutation();

  const router = useRouter();

  function onUpdateAmount(amt: string) {
    setAmountStr(amt);
    setAmount(Number(amt) || 0);
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
            resetState();
            if (d) {
              router.push(`/groups/${group.id}/expenses/${d?.id}`).catch(console.error);
            }
          },
        },
      );
    } else {
      console.log('Dateeee', date?.toString());
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
        <div className="text-center">Add new expense</div>
        <UserInput />
        {showFriends || participants.length === 1 ? (
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
                title="Categories"
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
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value.toString() ?? '')}
                className="text-lg"
              />
            </div>
            <div className="flex gap-2">
              <AppDrawer
                trigger={
                  <div className="flex w-[70px] justify-center rounded-lg border py-2  text-center">
                    {currency ?? 'USD'}
                  </div>
                }
                onTriggerClick={() => setOpen(true)}
                title="Select currency"
                className="h-[70vh]"
                shouldCloseOnAction
                open={open}
                onOpenChange={(openVal) => {
                  if (openVal !== open) setOpen(openVal);
                }}
              >
                <div className="">
                  <Command className="h-[60vh]">
                    <CommandInput className="text-lg" placeholder="Search currency" />
                    <CommandEmpty>No currency found.</CommandEmpty>
                    <CommandGroup className="h-full overflow-auto">
                      {currencies.map((framework) => (
                        // <DrawerClose key={`${framework.code}-${framework.name}`} className="w-full">
                        <CommandItem
                          key={`${framework.code}-${framework.name}`}
                          value={`${framework.code}-${framework.name}`}
                          onSelect={(currentValue) => {
                            setCurrency(currentValue.split('-')[0]?.toUpperCase() ?? 'USD');
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
                        // </DrawerClose>
                      ))}
                    </CommandGroup>
                  </Command>
                </div>
              </AppDrawer>

              <Input
                placeholder="Amount"
                className="text-lg"
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
                              'Today'
                            ) : (
                              format(date, 'MMM dd')
                            )
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-4">
                    <UploadFile />

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
                      Submit
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
