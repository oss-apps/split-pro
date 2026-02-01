/**
 * Migration: v2.0.0 - Settle Groups
 *
 * Migrates settlements from SplitPro v1.5.x to v2.0.0+.
 *
 * Problem:
 * In v1.5.x, settlements were created with groupId: null, but the old system
 * would clear both Balance AND GroupBalance tables when total balance reached zero.
 * With the new BalanceView in v2.0.0, settlements with null groupId don't affect
 * group-specific balances, causing incorrect group balances.
 *
 * Solution:
 * For each settlement with groupId: null, calculate the historical per-group balances
 * at the time of settlement. If they match exactly, split the settlement into
 * group-specific settlements.
 */

import { SplitType } from '@prisma/client';
import { getHistoricalBalances } from '~/server/api/services/splitService';
import { db } from '~/server/db';

/**
 * Migrate null-groupId settlements to group-specific settlements.
 */
export async function migrateSettlementsToGroups(): Promise<void> {
  // Find all null-groupId settlements
  const settlements = await db.expense.findMany({
    where: {
      splitType: SplitType.SETTLEMENT,
      groupId: null,
      deletedAt: null,
    },
    include: {
      expenseParticipants: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${settlements.length} settlements with null groupId\n`);

  if (settlements.length === 0) {
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let reviewManually = false;

  for (const settlement of settlements) {
    const participants = settlement.expenseParticipants;

    if (participants.length !== 2) {
      console.warn(
        `  [SKIP] ${settlement.id} (amount: ${settlement.amount} ${settlement.currency}): ` +
          `has ${participants.length} participants (expected 2)`,
      );
      skipped++;
      continue;
    }

    // Sort user IDs to have consistent ordering (userA < userB)
    const sortedUserIds = participants.map((p) => p.userId).sort((a, b) => a - b);
    const userA = sortedUserIds[0]!;
    const userB = sortedUserIds[1]!;

    // Get historical per-group balances at settlement time
    const historicalBalances = await getHistoricalBalances(
      userA,
      userB,
      settlement.currency,
      settlement.createdAt,
    );

    // Calculate total and compare to settlement
    // The historical balance is from userA's perspective (userA < userB)
    const totalBalance = historicalBalances.reduce((sum, b) => sum + b.amount, 0n);

    // Get userA's participant amount (this is what the settlement was correcting)
    const userAParticipant = participants.find((p) => p.userId === userA);
    const settlementAmount = userAParticipant?.amount ?? 0n;

    // The settlement should have zeroed out the balance, so:
    // - If userA owed userB (balance was negative), the settlement gave userA a positive amount
    // - If userB owed userA (balance was positive), the settlement gave userA a negative amount
    // So the settlement amount should be the OPPOSITE of the historical balance
    const balanceMatches =
      totalBalance === -settlementAmount || // Normal case: opposite signs
      (totalBalance === 0n && settlementAmount === 0n); // Edge case: both zero

    if (!balanceMatches) {
      // Also check absolute values to identify partial settlements
      const absTotal = totalBalance < 0n ? -totalBalance : totalBalance;
      const absSettlement = settlementAmount < 0n ? -settlementAmount : settlementAmount;

      if (absTotal !== absSettlement) {
        console.warn(
          `  [SKIP] ${settlement.id} (amount: ${settlement.amount} ${settlement.currency}): ` +
            `balance mismatch (likely partial settlement). ` +
            `Settlement: ${settlementAmount}, Calculated: ${totalBalance}`,
        );
        reviewManually = true;
      } else {
        // Amounts match but signs are same (shouldn't happen in normal flow)
        console.warn(
          `  [SKIP] ${settlement.id} (amount: ${settlement.amount} ${settlement.currency}): ` +
            `unexpected sign convention. ` +
            `Settlement: ${settlementAmount}, Calculated: ${totalBalance}`,
        );
      }
      skipped++;
      continue;
    }

    // No group balances found - this was purely an individual balance
    if (historicalBalances.length === 0) {
      console.log(
        `  [SKIP] ${settlement.id} (amount: ${settlement.amount} ${settlement.currency}): ` +
          `no group balances found, keeping as individual`,
      );
      skipped++;
      continue;
    }

    // Only individual balance (null groupId) - nothing to split
    if (historicalBalances.length === 1 && historicalBalances[0]!.groupId === null) {
      console.log(
        `  [SKIP] ${settlement.id} (amount: ${settlement.amount} ${settlement.currency}): ` +
          `only individual balance, no groups involved`,
      );
      skipped++;
      continue;
    }

    // Create new group-specific settlements and delete original
    if (historicalBalances.length > 1) {
      console.log(
        `  [MIGRATE] ${settlement.id} (amount: ${settlement.amount} ${settlement.currency}): ` +
          `splitting into ${historicalBalances.length} group settlements`,
      );
    } else {
      console.log(
        `  [MIGRATE] ${settlement.id} (amount: ${settlement.amount} ${settlement.currency}): ` +
          `converting to group-specific settlement`,
      );
    }

    await db.$transaction(async (tx) => {
      for (const gb of historicalBalances) {
        // The settlement should CANCEL OUT the historical balance
        // Historical balance gb.amount is from userA's perspective:
        // - Negative means userA owes userB
        // - Positive means userB owes userA
        //
        // Settlement participant amounts should be the OPPOSITE to zero out the balance
        // So userA's settlement amount = -gb.amount
        const userASettlementAmount = -gb.amount;
        const userBSettlementAmount = gb.amount;

        await tx.expense.create({
          data: {
            groupId: gb.groupId,
            paidBy: settlement.paidBy,
            addedBy: settlement.addedBy,
            name: settlement.name,
            category: settlement.category,
            amount: gb.amount < 0n ? -gb.amount : gb.amount, // Store absolute amount
            splitType: SplitType.SETTLEMENT,
            currency: settlement.currency,
            expenseDate: settlement.expenseDate,
            createdAt: settlement.createdAt,
            expenseParticipants: {
              create: [
                {
                  userId: userA,
                  amount: userASettlementAmount,
                },
                {
                  userId: userB,
                  amount: userBSettlementAmount,
                },
              ],
            },
          },
        });
      }

      // Hard-delete original settlement
      await db.expense.delete({
        where: { id: settlement.id },
      });
    });

    migrated++;
  }

  console.log('\nMigration Summary:');
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);

  if (reviewManually) {
    console.log(
      '\nSome settlements were skipped due to potential partial settlements or discrepancies.' +
        ' Please review these manually to ensure data integrity. Consult the logs and release notes for guidance.',
    );
  }
}
