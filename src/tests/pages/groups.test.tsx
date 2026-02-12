import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import React from 'react';

import BalancePage from '~/pages/groups';

// Next-i18next – return translation keys as-is
jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// MainLayout mock component
jest.mock('~/components/Layout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// CreateGroup mock component
jest.mock('~/components/group/CreateGroup', () => ({
  CreateGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="create-group">{children}</div>
  ),
}));

// BalanceEntry mock component
jest.mock('~/components/Expense/BalanceEntry', () => ({
  BalanceEntry: ({ entity }: { entity: { name?: string | null }; id: number }) => (
    <div data-testid="balance-entry">{entity.name}</div>
  ),
}));

// Accordion mock component
jest.mock('~/components/ui/accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accordion">{children}</div>
  ),
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accordion-trigger">{children}</div>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

interface GroupWithBalances {
  id: number;
  name: string;
  image: string | null;
  balances: Record<string, bigint>;
}

const makeGroup = (id: number, name: string): GroupWithBalances => ({
  id,
  name,
  image: null,
  balances: {},
});

const mockUseQuery = jest.fn();

jest.mock('~/utils/api', () => ({
  api: {
    group: {
      getAllGroupsWithBalances: {
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
      },
    },
  },
}));

const setupQueries = ({
  active = [] as GroupWithBalances[],
  archived = [] as GroupWithBalances[],
  isPending = false,
}: {
  active?: GroupWithBalances[];
  archived?: GroupWithBalances[];
  isPending?: boolean;
} = {}) => {
  mockUseQuery.mockImplementation((input?: { getArchived?: boolean }) => {
    if (input?.getArchived) {
      return { data: archived, isPending: false };
    }
    return { data: active, isPending };
  });
};

const mockUser = { id: 1, name: 'Test', email: 'test@test.com' } as React.ComponentProps<
  typeof BalancePage
>['user'];

describe('Groups page', () => {
  it('should show the create group button when there are no active and no archived groups', () => {
    setupQueries({ active: [], archived: [] });

    render(<BalancePage user={mockUser} />);

    expect(screen.getByTestId('create-group')).toBeInTheDocument();
    expect(screen.queryByTestId('accordion')).not.toBeInTheDocument();
  });

  it('should show active groups when they exist', () => {
    setupQueries({
      active: [makeGroup(1, 'Trip to Paris'), makeGroup(2, 'Household')],
      archived: [],
    });

    render(<BalancePage user={mockUser} />);

    const entries = screen.getAllByTestId('balance-entry');
    expect(entries).toHaveLength(2);
    expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
    expect(screen.getByText('Household')).toBeInTheDocument();
    expect(screen.queryByTestId('accordion')).not.toBeInTheDocument();
  });

  it('should show archived groups when there are no active groups (bug regression)', () => {
    setupQueries({ active: [], archived: [makeGroup(10, 'Old Trip')] });

    render(<BalancePage user={mockUser} />);

    expect(screen.getByTestId('accordion')).toBeInTheDocument();
    expect(screen.getByText('Old Trip')).toBeInTheDocument();
  });

  it('should show both active and archived groups', () => {
    setupQueries({
      active: [makeGroup(1, 'Active Group')],
      archived: [makeGroup(2, 'Archived Group')],
    });

    render(<BalancePage user={mockUser} />);

    expect(screen.getByText('Active Group')).toBeInTheDocument();
    expect(screen.getByText('Archived Group')).toBeInTheDocument();
  });
});
