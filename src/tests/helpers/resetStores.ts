import { useAddExpenseStore } from '~/store/addStore';
import { useAppStore } from '~/store/appStore';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

const initialAddExpenseState = useAddExpenseStore.getState();
const initialAppState = useAppStore.getState();
const initialCurrencyPreferenceState = useCurrencyPreferenceStore.getState();

export const resetStores = () => {
  useAddExpenseStore.setState(initialAddExpenseState, true);
  useAppStore.setState(initialAppState, true);
  useCurrencyPreferenceStore.setState(initialCurrencyPreferenceState, true);
  window.sessionStorage.clear();
};
