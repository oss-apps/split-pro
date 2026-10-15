/** @jest-environment jsdom */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import { createMockRouter } from '~/tests/helpers/router';
import { LanguageSelector } from './LanguageSelector';

const mockI18n = { language: 'en' };

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ i18n: mockI18n }),
}));

describe('LanguageSelector', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockI18n.language = 'en';
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('toggles the language list and closes it from the backdrop', () => {
    renderWithProviders(<LanguageSelector />);

    const toggle = screen.getByRole('button', { name: /english/i });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Français' })).toBeInTheDocument();

    fireEvent.click(document.querySelector('.fixed.inset-0')!);
    expect(screen.queryByRole('button', { name: 'Français' })).not.toBeInTheDocument();
  });

  it('marks the selected language and persists and routes to a chosen language', async () => {
    const router = createMockRouter({ asPath: '/groups/42?tab=expenses' });
    renderWithProviders(<LanguageSelector />, { router });
    fireEvent.click(screen.getByRole('button', { name: /english/i }));

    const selectedLanguage = screen.getByText('✓').closest('button');
    expect(selectedLanguage).not.toBeNull();
    expect(selectedLanguage).toHaveClass('bg-blue-50');
    expect(selectedLanguage).toHaveTextContent('✓');

    fireEvent.click(screen.getByRole('button', { name: 'Français' }));
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        '/groups/42?tab=expenses',
        '/groups/42?tab=expenses',
        {
          locale: 'fr',
          scroll: false,
        },
      ),
    );
    expect(global.fetch).toHaveBeenCalledWith('/api/locale?locale=fr');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Français' })).not.toBeInTheDocument(),
    );
  });

  it('keeps the list open when navigation fails', async () => {
    const router = createMockRouter();
    jest.mocked(router.push).mockRejectedValueOnce(new Error('navigation failed'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    renderWithProviders(<LanguageSelector />, { router });
    fireEvent.click(screen.getByRole('button', { name: /english/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Français' }));

    expect(await screen.findByRole('button', { name: 'Français' })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith('Error changing language:', expect.any(Error));
  });
});
