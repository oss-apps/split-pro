/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import { RecurrencePreview } from '~/components/Expense/RecurrencePreview';
import common from '../../public/locales/en/common.json';

const mockPreview = {
  data: undefined as { nextRun: Date; timeZone: string; schedule: string } | undefined,
  isError: false,
};

jest.mock('~/utils/api', () => ({
  api: {
    expense: {
      getRecurrencePreview: { useQuery: () => mockPreview },
    },
  },
}));
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en-US' },
    t: (key: string, values: Record<string, string> = {}) => {
      const translations = jest.requireActual('../../public/locales/en/common.json');
      const text = translations.recurrence[key.split('.')[1]!];
      return Object.entries(values).reduce(
        (result, [name, value]) => result.replaceAll(`{${name}}`, value),
        text,
      );
    },
  }),
}));
jest.mock('~/hooks/useIntlCronParser', () => ({
  useIntlCronParser: () => ({ cronParser: (schedule: string) => schedule }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('RecurrencePreview', () => {
  beforeEach(() => {
    mockPreview.data = undefined;
    mockPreview.isError = false;
    const options = new Intl.DateTimeFormat().resolvedOptions();
    jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...options,
      timeZone: 'America/Los_Angeles',
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const renderPreview = async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<RecurrencePreview schedule="0 0 1 1 *" />));
    return {
      container,
      cleanup: async () => {
        await act(async () => root.unmount());
        container.remove();
      },
    };
  };

  it('shows the browser-local date and time, including the previous year', async () => {
    mockPreview.data = {
      nextRun: new Date('2027-01-01T02:35:00Z'),
      timeZone: 'UTC',
      schedule: '35 2 1 1 *',
    };
    const { container, cleanup } = await renderPreview();
    try {
      expect(container.textContent).toContain('Thursday, December 31, 2026 at 6:35 PM');
      expect(container.textContent).toContain('America/Los_Angeles, your time zone');
      expect(container.textContent).toContain('Schedule: 35 2 1 1 * (UTC)');
      expect(container.textContent).not.toContain('cron(');
    } finally {
      await cleanup();
    }
  });

  it('uses the browser offset for the occurrence date, including daylight saving', async () => {
    mockPreview.data = {
      nextRun: new Date('2027-07-01T02:35:00Z'),
      timeZone: 'UTC',
      schedule: '35 2 1 * *',
    };
    const { container, cleanup } = await renderPreview();
    try {
      expect(container.textContent).toContain('Wednesday, June 30, 2027 at 7:35 PM');
    } finally {
      await cleanup();
    }
  });

  it('does not format a server-rendered preview in the server process time zone', () => {
    mockPreview.data = {
      nextRun: new Date('2027-01-01T02:35:00Z'),
      timeZone: 'UTC',
      schedule: '35 2 1 1 *',
    };
    const html = renderToStaticMarkup(<RecurrencePreview schedule="0 0 1 1 *" />);
    expect(html).toContain(common.recurrence.execution_time_loading);
    expect(html).not.toContain('2027');
    expect(html).not.toContain('UTC');
  });

  it('shows loading instead of a misleading midnight default', async () => {
    const { container, cleanup } = await renderPreview();
    try {
      expect(container.textContent).toBe(common.recurrence.execution_time_loading);
    } finally {
      await cleanup();
    }
  });

  it('shows an explicit error if execution settings cannot be fetched', async () => {
    mockPreview.isError = true;
    const { container, cleanup } = await renderPreview();
    try {
      expect(container.textContent).toBe(common.recurrence.execution_time_unavailable);
    } finally {
      await cleanup();
    }
  });
});
