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
