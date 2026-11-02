/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CronBuilder } from '~/components/ui/cron-builder';

jest.mock('~/components/Expense/RecurrencePreview', () => ({ RecurrencePreview: () => null }));

describe('CronBuilder custom calendar fields', () => {
  it('shows only calendar fields when opening an existing custom schedule', () => {
    render(<CronBuilder value="35 6 * 1 1" onChange={jest.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('* 1 1');
  });

  it('preserves spaces while typing a complete custom calendar rule', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<CronBuilder value="0 0 * 1 1" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '* ');
    expect(input).toHaveValue('* ');
    await user.type(input, '1 ');
    expect(input).toHaveValue('* 1 ');
    await user.type(input, '1');
    expect(input).toHaveValue('* 1 1');
    expect(onChange).toHaveBeenLastCalledWith('0 0 * 1 1');
  });

  it('rejects extra fields instead of silently dropping one', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<CronBuilder value="0 0 * 1 1" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '1 * 1 1');
    expect(input).toHaveValue('1 * 1 1');
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});

describe('CronBuilder calendar tiles', () => {
  it('selects weekdays without a dropdown', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<CronBuilder value="0 0 * * 0" onChange={onChange} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await user.click(screen.getByText('Mon', { selector: 'button' }));
    expect(onChange).toHaveBeenLastCalledWith('0 0 * * 1');
    expect(screen.getByText('Mon', { selector: 'button' })).toHaveAttribute('data-state', 'on');
    await user.click(screen.getByText('Mon', { selector: 'button' }));
    expect(onChange).toHaveBeenLastCalledWith('0 0 * * 1');
  });

  it('selects the last day of the month', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<CronBuilder value="0 0 1 * *" onChange={onChange} />);
    await user.click(screen.getByText('Last day', { selector: 'button' }));
    expect(onChange).toHaveBeenLastCalledWith('0 0 L * *');
  });

  it('selects a month and day for yearly recurrence', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<CronBuilder value="0 0 1 1 *" onChange={onChange} />);
    await user.click(screen.getByText('Aug', { selector: 'button' }));
    await user.click(screen.getByText('25', { selector: 'button' }));
    expect(onChange).toHaveBeenLastCalledWith('0 0 25 8 *');
  });
});
