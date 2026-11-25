/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

let queryResult: { isPending: boolean; data?: { rate: number } } = { isPending: true };
const setCurrency = jest.fn();
const onSubmit = jest.fn();
const mockToUIString = (value: bigint) => (Number(value) / 100).toFixed(2);
const mockToSafeBigInt = (value: string) => BigInt(Math.round(Number(value) * 100));

jest.mock('~/hooks/useTranslationWithUtils', () => ({
  useTranslationWithUtils: () => ({
    t: (key: string) => key,
    getCurrencyHelpersCached: (currency: string) => ({
      toUIString: mockToUIString,
      toSafeBigInt: mockToSafeBigInt,
      currency,
    }),
  }),
}));

jest.mock('~/utils/api', () => ({
  api: { expense: { getCurrencyRate: { useQuery: () => queryResult } } },
}));

jest.mock('~/store/addStore', () => ({
  useAddExpenseStore: (selector: (state: unknown) => unknown) =>
    selector({ currency: 'EUR', actions: { setCurrency } }),
}));

jest.mock('../ui/drawer', () => ({
  AppDrawer: ({
    children,
    trigger,
    actionOnClick,
  }: React.PropsWithChildren<{
    trigger: React.ReactNode;
    actionOnClick: () => void;
  }>) => (
    <div>
      {trigger}
      {children}
      <button onClick={actionOnClick}>Save conversion</button>
    </div>
  ),
}));

jest.mock('../ui/currency-input', () => ({
  CurrencyInput: ({
    'aria-label': label,
    strValue,
    onValueChange,
    disabled,
  }: {
    'aria-label': string;
    strValue: string;
    onValueChange: (value: { strValue: string; bigIntValue?: bigint }) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label={label}
      disabled={disabled}
      value={strValue}
      onChange={(event) =>
        onValueChange({
          strValue: event.target.value,
          bigIntValue: BigInt(Math.round(Number(event.target.value) * 100)),
        })
      }
    />
  ),
}));

jest.mock('../AddExpense/CurrencyPicker', () => ({
  CurrencyPicker: ({ onCurrencyPick }: { onCurrencyPick: (value: string) => void }) => (
    <button onClick={() => onCurrencyPick('GBP')}>Choose GBP</button>
  ),
}));

jest.mock('../AddExpense/DateSelector', () => ({ DateSelector: () => null }));

import { CurrencyConversion } from './CurrencyConversion';

const setup = (props: Partial<React.ComponentProps<typeof CurrencyConversion>> = {}) =>
  render(
    <CurrencyConversion amount={10000n} currency="USD" onSubmit={onSubmit} {...props}>
      <button>Open conversion</button>
    </CurrencyConversion>,
  );

describe('CurrencyConversion compiler state regression', () => {
  beforeEach(() => {
    queryResult = { isPending: false, data: { rate: 1.5 } };
    setCurrency.mockClear();
    onSubmit.mockClear();
  });

  it('lets a changed asynchronous quote replace a previously edited rate', () => {
    const view = setup();
    const rate = screen.getByRole('spinbutton', { name: 'currency_conversion.rate' });

    fireEvent.change(rate, { target: { value: '2.5' } });
    expect(rate).toHaveValue(2.5);

    queryResult = { isPending: false, data: { rate: 1.75 } };
    view.rerender(
      <CurrencyConversion amount={10000n} currency="USD" onSubmit={onSubmit}>
        <button>Open conversion</button>
      </CurrencyConversion>,
    );

    expect(rate).toHaveValue(1.75);
  });

  it('keeps an editing rate on the first render while the query is pending', () => {
    queryResult = { isPending: true };
    setup({ editingRate: 1.25 });
    expect(screen.getByRole('spinbutton', { name: 'currency_conversion.rate' })).toHaveValue(1.25);
  });

  it('rounds a target edit through the source amount and recalculates for rate, currency, and prop changes', () => {
    queryResult = { isPending: false, data: { rate: 2 } };
    const view = setup();

    const target = screen.getByRole('textbox', {
      name: 'currency_conversion.converted_amount_aria_label',
    });
    fireEvent.change(target, { target: { value: '123.45' } });
    expect(target).toHaveValue('123.44');

    const rate = screen.getByRole('spinbutton', { name: 'currency_conversion.rate' });
    fireEvent.change(rate, { target: { value: '3' } });
    expect(target).toHaveValue('185.16');

    fireEvent.click(screen.getByRole('button', { name: 'Choose GBP' }));
    expect(target).toHaveValue('0.00');
    queryResult = { isPending: false, data: { rate: 1.5 } };
    view.rerender(
      <CurrencyConversion amount={10000n} currency="USD" onSubmit={onSubmit}>
        <button>Open conversion</button>
      </CurrencyConversion>,
    );
    expect(target).toHaveValue('92.58');

    const source = screen.getByRole('textbox', { name: 'currency_conversion.amount_aria_label' });
    fireEvent.change(source, { target: { value: '50.00' } });
    expect(target).toHaveValue('75.00');

    view.rerender(
      <CurrencyConversion amount={20000n} currency="USD" onSubmit={onSubmit}>
        <button>Open conversion</button>
      </CurrencyConversion>,
    );
    expect(source).toHaveValue('200.00');
  });
});
