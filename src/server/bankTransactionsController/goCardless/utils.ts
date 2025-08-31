import { format, subDays } from 'date-fns';
import { GOCARDLESS_CONSTANTS } from './constants';

export const generateRandomId = (length: number = GOCARDLESS_CONSTANTS.RANDOM_ID_LENGTH): string =>
  Array.from({ length }, () => Math.random().toString(36)[2]).join('');

export const createDateRange = (
  intervalInDays: number = GOCARDLESS_CONSTANTS.DEFAULT_INTERVAL_DAYS,
) => ({
  dateTo: format(new Date(), GOCARDLESS_CONSTANTS.DATE_FORMAT),
  dateFrom: format(subDays(new Date(), intervalInDays), GOCARDLESS_CONSTANTS.DATE_FORMAT),
});
