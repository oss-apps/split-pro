import { format, subDays } from 'date-fns';
import { PLAID_CONSTANTS } from './constants';

export const createDateRange = (
  intervalInDays: number = PLAID_CONSTANTS.DEFAULT_INTERVAL_DAYS,
) => ({
  start_date: format(subDays(new Date(), intervalInDays), PLAID_CONSTANTS.DATE_FORMAT),
  end_date: format(new Date(), PLAID_CONSTANTS.DATE_FORMAT),
});
