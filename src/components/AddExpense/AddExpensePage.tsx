import { useRouter } from 'next/router';
import React from 'react';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { UserInput } from './UserInput';
import { SelectUserOrGroup } from './SelectUserOrGroup';
import { AppDrawer, DrawerClose } from '../ui/drawer';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { Banknote, CalendarIcon, Check, HeartHandshakeIcon } from 'lucide-react';
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
import { env } from '~/env';

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

export const AddOrEditExpensePage: React.FC<{
  isStorageConfigured: boolean;
  enableSendingInvites: boolean;
  expenseId?: string;
}> = ({ isStorageConfigured, enableSendingInvites, expenseId }) => {
  const [open, setOpen] = React.useState(false);

  const showFriends = useAddExpenseStore((s) => s.showFriends);
  const amount = useAddExpenseStore((s) => s.amount);
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const currency = useAddExpenseStore((s) => s.currency);
  const category = useAddExpenseStore((s) => s.category);
  const description = useAddExpenseStore((s) => s.description);
  const isFileUploading = useAddExpenseStore((s) => s.isFileUploading);
  const amtStr = useAddExpenseStore((s) => s.amountStr);
  const expenseDate = useAddExpenseStore((s) => s.expenseDate);

  const {
    setCurrency,
    setCategory,
    setDescription,
    setAmount,
    setAmountStr,
    resetState,
    setSplitScreenOpen,
    setExpenseDate,
  } = useAddExpenseStore((s) => s.actions);

  const addExpenseMutation = api.user.addOrEditExpense.useMutation();
  const addGroupExpenseMutation = api.group.addOrEditExpense.useMutation();
  const updateProfile = api.user.updateUserDetail.useMutation();

  const router = useRouter();

  function onUpdateAmount(amt: string) {
    const _amt = amt.replace(',', '.');
    setAmountStr(_amt);
    setAmount(Number(_amt) || 0);
  }

  function addExpense() {
    const { group, paidBy, splitType, fileKey, canSplitScreenClosed } =
      useAddExpenseStore.getState();
    if (!paidBy) {
      return;
    }

    if (!canSplitScreenClosed) {
      setSplitScreenOpen(true);
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
          expenseDate,
          expenseId,
        },
        {
          onSuccess: (d) => {
            if (d) {
              router
                .push(`/groups/${group.id}/expenses/${d?.id ?? expenseId}`)
                .then(() => resetState())
                .catch(console.error);
            }
          },
        },
      );
    } else {
      addExpenseMutation.mutate(
        {
          expenseId,
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
          expenseDate,
        },
        {
          onSuccess: (d) => {
            if (participants[1] && d) {
              router
                .push(`expenses/${d?.id ?? expenseId}`)
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
                Cancel
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" className=" px-0 text-primary" onClick={resetState}>
              Cancel
            </Button>
          )}
          <div className="text-center">Add new expense</div>
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
            Save
          </Button>{' '}
        </div>
        <UserInput isEditing={!!expenseId} />
        {showFriends || (participants.length === 1 && !group) ? (
          <SelectUserOrGroup enableSendingInvites={enableSendingInvites} />
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
                placeholder="Enter description"
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
                title="Select currency"
                className="h-[70vh]"
                shouldCloseOnAction
                open={open}
                onOpenChange={(openVal) => {
                  if (openVal !== open) setOpen(openVal);
                }}
              >
                <div className="">
                  <Command className="h-[50vh]">
                    <CommandInput className="text-lg" placeholder="Search currency" />
                    <CommandEmpty>No currency found.</CommandEmpty>
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
                placeholder="Enter amount"
                className="text-lg placeholder:text-sm"
                type="text"
                inputMode="decimal"
                value={amtStr}
                onChange={(e) => onUpdateAmount(e.target.value)}
              />
            </div>
            {!amount || description === '' ? (
              <div className="h-[180px]"></div>
            ) : (
              <div className="h-[180px]">
                <SplitTypeSection />

                <div className="mt-4 flex  items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            ' justify-start px-0 text-left font-normal',
                            !expenseDate && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-6 w-6 text-cyan-500" />
                          {expenseDate ? (
                            format(expenseDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? (
                              'Today'
                            ) : (
                              format(expenseDate, 'MMM dd')
                            )
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={expenseDate} onSelect={setExpenseDate} initialFocus />
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
                      Submit
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className=" flex w-full justify-center">
              <Link
                href="https://github.com/sponsors/KMKoushik"
                target="_blank"
                className="mx-auto"
              >
                <Button
                  variant="outline"
                  className="text-md  justify-between rounded-full border-pink-500 hover:text-foreground/80"
                >
                  <div className="flex items-center gap-4">
                    <HeartHandshakeIcon className="h-5 w-5 text-pink-500" />
                    Sponsor us
                  </div>
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
};
