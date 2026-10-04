import { useAddExpenseStore } from '~/store/addStore';
import { useAppStore } from '~/store/appStore';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

export const resetStores = () => {
  useAddExpenseStore.setState(useAddExpenseStore.getInitialState(), true);
  useAppStore.setState(useAppStore.getInitialState(), true);
  useCurrencyPreferenceStore.setState(useCurrencyPreferenceStore.getInitialState(), true);
  window.sessionStorage.clear();
  window.localStorage.clear();
};
