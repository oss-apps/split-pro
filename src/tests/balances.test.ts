import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SplitType } from '@prisma/client';

import { getGroupBalanceSummary, getGroupTotalsWhere } from '~/utils/balances';

void describe('group spending safeguards', () => {
  void it('excludes settlements from group spending totals', () => {
    assert.deepEqual(getGroupTotalsWhere(42), {
      groupId: 42,
      deletedAt: null,
      splitType: { not: SplitType.SETTLEMENT },
    });
  });
});

void describe('group balance summary', () => {
  void it('shows the largest absolute nonzero balance and marks multiple currencies', () => {
    assert.deepEqual(getGroupBalanceSummary({ USD: 0, EUR: -2500, GBP: 1000 }, 'USD'), {
      amount: -2500,
      currency: 'EUR',
      multiCurrency: true,
    });
  });

  void it('uses the group default currency when every balance is zero', () => {
    assert.deepEqual(getGroupBalanceSummary({ EUR: 0 }, 'GBP'), {
      amount: 0,
      currency: 'GBP',
      multiCurrency: false,
    });
  });
});
