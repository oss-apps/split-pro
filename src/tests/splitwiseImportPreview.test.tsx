/** @jest-environment jsdom */

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import ImportSplitwisePage from '~/pages/import-splitwise';

const mockMutate = jest.fn();

jest.mock('~/utils/api', () => ({
  api: {
    user: {
      importUsersFromSplitWise: {
        useMutation: () => ({ isPending: false, mutate: mockMutate }),
      },
    },
  },
}));
jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('next/head', () => ({ __esModule: true, default: () => null }));
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
jest.mock('~/components/Layout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('~/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
jest.mock('~/components/ui/checkbox', () => ({ Checkbox: () => null }));
jest.mock('~/components/ui/separator', () => ({ Separator: () => null }));
jest.mock('~/utils/i18n/server', () => ({ withI18nStaticProps: jest.fn() }));

const userRecord = {
  id: 19,
  first_name: 'Ada',
  last_name: null,
  email: 'ada@example.com',
  balance: [{ currency_code: 'USD', amount: '900719925474099312345.6789' }],
  picture: { small: '', medium: '', large: '' },
  registration_status: 'confirmed',
};

const makeFile = (contents: string, name = 'export.json') => {
  const file = new File([contents], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(contents) });
  return file;
};

const upload = (file: File) => {
  const input = document.getElementById('splitwise-json');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Splitwise file input was not rendered');
  }
  fireEvent.change(input, { target: { files: [file] } });
};

const renderPage = () =>
  renderWithProviders(
    <ImportSplitwisePage
      user={{
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        image: '',
        currency: 'USD',
        preferredLanguage: 'en',
        hiddenFriendIds: [],
      }}
    />,
  );

const buttons = () => screen.getAllByRole('button', { name: 'actions.import' });

describe('Splitwise import preview', () => {
  beforeEach(() => mockMutate.mockClear());

  it('submits the validated preview with the original monetary string unchanged', async () => {
    renderPage();
    upload(makeFile(JSON.stringify({ friends: [userRecord], groups: [] })));

    await waitFor(() =>
      expect(buttons().every((button) => !button.hasAttribute('disabled'))).toBe(true),
    );
    fireEvent.click(buttons()[0]!);

    expect(mockMutate).toHaveBeenCalledWith(
      {
        usersWithBalance: [
          expect.objectContaining({
            id: 19,
            balance: [{ currency_code: 'USD', amount: '900719925474099312345.6789' }],
          }),
        ],
        groups: [],
      },
      expect.any(Object),
    );
  });

  it('clears the previous preview and disables both submissions after an invalid replacement', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    renderPage();
    upload(makeFile(JSON.stringify({ friends: [userRecord], groups: [] })));
    await waitFor(() =>
      expect(buttons().every((button) => !button.hasAttribute('disabled'))).toBe(true),
    );

    upload(makeFile('{ invalid json', 'broken.json'));

    expect(buttons()).toHaveLength(2);
    expect(buttons().every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    fireEvent.click(buttons()[1]!);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('keeps both submissions disabled while a file read is pending', async () => {
    const deferred: { resolve: (contents: string) => void } = { resolve: () => undefined };
    const file = new File([''], 'pending.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: () => new Promise<string>((resolve) => (deferred.resolve = resolve)),
    });
    renderPage();
    upload(file);

    expect(buttons().every((button) => button.hasAttribute('disabled'))).toBe(true);
    await act(async () => {
      deferred.resolve(JSON.stringify({ friends: [userRecord], groups: [] }));
    });
    await waitFor(() =>
      expect(buttons().every((button) => !button.hasAttribute('disabled'))).toBe(true),
    );
  });

  it('does not let an older file read overwrite the latest upload', async () => {
    const deferred: { resolve: (contents: string) => void } = { resolve: () => undefined };
    const oldFile = new File([''], 'old.json', { type: 'application/json' });
    Object.defineProperty(oldFile, 'text', {
      value: () => new Promise<string>((resolve) => (deferred.resolve = resolve)),
    });
    renderPage();
    upload(oldFile);
    upload(makeFile(JSON.stringify({ friends: [userRecord], groups: [] }), 'latest.json'));
    await waitFor(() =>
      expect(buttons().every((button) => !button.hasAttribute('disabled'))).toBe(true),
    );
    await act(async () => {
      deferred.resolve(
        JSON.stringify({ friends: [], groups: [{ id: 7, name: 'Old', members: [userRecord] }] }),
      );
    });

    await waitFor(() => expect(screen.queryByText('Old')).not.toBeInTheDocument());
    fireEvent.click(buttons()[0]!);
    expect(mockMutate.mock.calls[0]?.[0]).toEqual({
      usersWithBalance: [expect.objectContaining({ id: 19 })],
      groups: [],
    });
  });
});
