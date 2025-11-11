import type { DummyExpenseInfo } from '~/dummies/expenseGenerator';
import type { DummyGroupInfo } from '~/dummies/groupGenerator';
import type { DummyUserInfo } from '~/dummies/userGenerator';

/**
 * Generates comprehensive statistics about the seeded data
 */
export function generateSeedStatistics(
  users: DummyUserInfo[],
  groups: DummyGroupInfo[],
  expenses: DummyExpenseInfo[],
) {
  // Build connection graph (set of unique user pairs)
  const connections = new Map<number, Set<number>>();
  const userGroups = new Map<number, number[]>();
  const userExpenses = new Map<number, number>();

  // Initialize maps
  users.forEach((user) => {
    connections.set(user.id, new Set());
    userGroups.set(user.id, []);
    userExpenses.set(user.id, 0);
  });

  // Populate group memberships and build connection graph
  groups.forEach((group, groupIdx) => {
    const memberIds = group.members.map((m) => users.findIndex((u) => u.id === m.id));

    memberIds.forEach((userId) => {
      const userGroupsList = userGroups.get(userId);
      if (userGroupsList) {
        userGroupsList.push(groupIdx);
      }
    });
  });

  // Count expenses per user
  expenses.forEach((expense) => {
    expense.participants.forEach((participant) => {
      const userId = typeof participant.id === 'string' ? parseInt(participant.id) : participant.id;
      userExpenses.set(userId, (userExpenses.get(userId) ?? 0) + 1);
      if (userId === expense.paidBy.id) {
        return;
      }
      connections.get(expense.paidBy.id)?.add(userId);
      connections.get(userId)?.add(expense.paidBy.id);
    });
  });

  // Calculate connection statistics
  const connectionCounts = Array.from(connections.values()).map((set) => set.size);
  const nonZeroConnections = connectionCounts.filter((c) => c > 0);
  const totalConnections = nonZeroConnections.reduce((sum, c) => sum + c, 0) / 2; // Divide by 2 because connections are bidirectional
  const usersWithoutFriends = connectionCounts.filter((c) => c === 0).length;

  // Build top connected users list
  const connectedUsersList = users
    .map((user) => ({
      email: user.email,
      connections: connections.get(user.id)?.size ?? 0,
      groups: userGroups.get(user.id)?.length ?? 0,
    }))
    .sort((a, b) => b.connections - a.connections);

  const topConnectedUsers = connectedUsersList.slice(0, 3);
  const bottomConnectedUsers = connectedUsersList.slice(-3).reverse();

  // Expense analysis
  const expensesByCategory: Record<string, number> = {};
  const expensesByCurrency: Record<string, number> = {};
  const expensesBySplitType: Record<string, number> = {};
  let totalAmount = 0n;

  expenses.forEach((expense) => {
    expensesByCategory[expense.category] = (expensesByCategory[expense.category] ?? 0) + 1;
    expensesByCurrency[expense.currency] = (expensesByCurrency[expense.currency] ?? 0) + 1;
    expensesBySplitType[expense.splitType] = (expensesBySplitType[expense.splitType] ?? 0) + 1;
    totalAmount += expense.amount;
  });

  // Group type distribution
  const groupTypeDistribution: Record<string, number> = {};
  groups.forEach((group) => {
    const typeName = group.type;
    groupTypeDistribution[typeName] = (groupTypeDistribution[typeName] ?? 0) + 1;
  });

  // Find users without expenses
  const usersWithExpenses = new Set(expenses.flatMap((e) => e.participants.map((p) => p.id)));
  const usersWithoutExpenses = users.length - usersWithExpenses.size;

  // Find groups without expenses
  const groupsWithExpenses = new Set(
    expenses.map((e) => e.groupId).filter((id) => id !== null && id !== undefined),
  );
  const groupsWithoutExpenses = groups.filter((g, idx) => !groupsWithExpenses.has(idx)).length;

  // Expense per user stats
  const expenseCounts = Array.from(userExpenses.values());
  const avgExpensesPerUser =
    expenseCounts.length > 0 ? expenseCounts.reduce((a, b) => a + b, 0) / expenseCounts.length : 0;

  // Top 3 users by currency
  const topUsersByCurrency: Record<string, typeof topConnectedUsers> = {};
  Object.keys(expensesByCurrency).forEach((currency) => {
    const connectedUsersList = users
      .filter((user) => user.currency === currency)
      .map((user) => ({
        email: user.email,
        connections: connections.get(user.id)?.size ?? 0,
        groups: userGroups.get(user.id)?.length ?? 0,
      }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 3);

    topUsersByCurrency[currency] = connectedUsersList;
  });

  return {
    totalUsers: users.length,
    totalGroups: groups.length,
    totalExpenses: expenses.length,

    avgGroupsPerUser:
      users.length > 0
        ? Array.from(userGroups.values()).reduce((sum, grps) => sum + grps.length, 0) / users.length
        : 0,
    avgGroupSize:
      groups.length > 0 ? groups.reduce((sum, g) => sum + g.members.length, 0) / groups.length : 0,
    groupTypeDistribution,

    totalConnections,
    avgConnectionsPerUser: users.length > 0 ? (totalConnections * 2) / users.length : 0,
    usersWithoutFriends,
    maxConnectivity: Math.max(...connectionCounts, 0),
    minConnectivity: Math.min(...connectionCounts, 0),

    topConnectedUsers,
    bottomConnectedUsers,
    topUsersByCurrency,

    totalExpensesAmount: totalAmount,
    expensesByCategory,
    expensesByCurrency,
    expensesBySplitType,
    avgExpenseAmount:
      expenses.length > 0 ? (totalAmount / BigInt(expenses.length)).toString() : '0',
    expensesPerUser: {
      avg: avgExpensesPerUser,
      max: Math.max(...expenseCounts, 0),
      min: Math.min(...expenseCounts, 0),
    },

    usersWithoutExpenses,
    groupsWithoutExpenses,
  };
}

export type SeedStatistics = ReturnType<typeof generateSeedStatistics>;

/**
 * Formats statistics as markdown for documentation
 */
export function formatSeedStatisticsMarkdown(stats: SeedStatistics): string {
  const formatCurrency = (amount: bigint): string => {
    const mainAmount = amount / 100n;
    const cents = amount % 100n;
    return `${mainAmount.toString()}.${cents.toString().padStart(2, '0')}`;
  };

  const lines: string[] = [];

  lines.push('# 📊 Seeding Statistics Report\n');
  lines.push(`Generated at: ${new Date().toISOString()}\n`);

  // Overview
  lines.push('## 📈 Overview\n');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Users | ${stats.totalUsers.toLocaleString()} |`);
  lines.push(`| Total Groups | ${stats.totalGroups.toLocaleString()} |`);
  lines.push(`| Total Expenses | ${stats.totalExpenses.toLocaleString()} |\n`);

  // Groups
  lines.push('## 👥 Group Analysis\n');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Avg Groups per User | ${stats.avgGroupsPerUser.toFixed(2)} |`);
  lines.push(`| Avg Group Size | ${stats.avgGroupSize.toFixed(2)} members |`);
  lines.push();
  lines.push('### Group Type Distribution');
  lines.push();
  Object.entries(stats.groupTypeDistribution).forEach(([type, count]) => {
    const percentage = ((count / stats.totalGroups) * 100).toFixed(1);
    lines.push(`- ${type}: ${count} (${percentage}%)`);
  });
  lines.push();

  // Social Graph
  lines.push('## 🔗 Social Graph Analysis\n');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(
    `| Total Unique Connections | ${Math.round(stats.totalConnections).toLocaleString()} |`,
  );
  lines.push(`| Avg Connections per User | ${stats.avgConnectionsPerUser.toFixed(2)} |`);
  lines.push(`| Max Connectivity | ${stats.maxConnectivity} connections |`);
  lines.push(`| Min Connectivity | ${stats.minConnectivity} connections |`);
  lines.push(
    `| Users without Friends | ${stats.usersWithoutFriends.toLocaleString()} (${((stats.usersWithoutFriends / stats.totalUsers) * 100).toFixed(1)}%) |\n`,
  );

  // Top 3 connected users
  lines.push('## ⭐ Most Connected Users\n');
  lines.push(`| # | Email | Connections | Groups |`);
  lines.push(`|---|-------|-------------|--------|`);
  stats.topConnectedUsers.forEach((user, idx) => {
    lines.push(`| ${idx + 1} | ${user.email} | ${user.connections} | ${user.groups} |`);
  });
  lines.push();

  lines.push('## 📊 Least Connected Users\n');
  lines.push(`| # | Email | Connections | Groups |`);
  lines.push(`|---|-------|-------------|--------|`);
  stats.bottomConnectedUsers.forEach((user, idx) => {
    lines.push(`| ${idx + 1} | ${user.email} | ${user.connections} | ${user.groups} |`);
  });
  lines.push();

  // Top 3 users by currency
  lines.push('## 🌍 Most Connected Users by Currency\n');
  Object.entries(stats.topUsersByCurrency).forEach(([currency, users]) => {
    lines.push(`### ${currency}\n`);
    lines.push(`| # | Email | Connections | Groups |`);
    lines.push(`|---|-------|-------------|--------|`);
    users.forEach((user, idx) => {
      lines.push(`| ${idx + 1} | ${user.email} | ${user.connections} | ${user.groups} |`);
    });
    lines.push();
  });

  // Expenses
  lines.push('## 💰 Expense Analysis\n');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Amount | ${formatCurrency(stats.totalExpensesAmount)} |`);
  lines.push(`| Avg Expense Amount | ${formatCurrency(BigInt(stats.avgExpenseAmount))} |`);
  lines.push(`| Expenses per User (avg) | ${stats.expensesPerUser.avg.toFixed(1)} |`);
  lines.push(`| Expenses per User (max) | ${stats.expensesPerUser.max} |`);
  lines.push(`| Expenses per User (min) | ${stats.expensesPerUser.min} |`);
  lines.push(
    `| Users without Expenses | ${stats.usersWithoutExpenses.toLocaleString()} (${((stats.usersWithoutExpenses / stats.totalUsers) * 100).toFixed(1)}%) |`,
  );
  lines.push(
    `| Groups without Expenses | ${stats.groupsWithoutExpenses.toLocaleString()} (${((stats.groupsWithoutExpenses / stats.totalGroups) * 100).toFixed(1)}%) |\n`,
  );

  // Expenses by Currency
  lines.push('## 💵 Expenses by Currency\n');
  lines.push(`| Currency | Count | Percentage |`);
  lines.push(`|----------|-------|-----------|`);
  const sortedCurrencies = Object.entries(stats.expensesByCurrency).sort(([, a], [, b]) => b - a);
  sortedCurrencies.forEach(([currency, count]) => {
    const percentage = ((count / stats.totalExpenses) * 100).toFixed(1);
    lines.push(`| ${currency} | ${count.toLocaleString()} | ${percentage}% |`);
  });
  lines.push();

  // Expenses by Category
  lines.push('## 📂 Expenses by Category\n');
  lines.push(`| Category | Count | Percentage |`);
  lines.push(`|----------|-------|-----------|`);
  const sortedCategories = Object.entries(stats.expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);
  sortedCategories.forEach(([category, count]) => {
    const percentage = ((count / stats.totalExpenses) * 100).toFixed(1);
    lines.push(`| ${category} | ${count.toLocaleString()} | ${percentage}% |`);
  });
  const categoryCount = Object.keys(stats.expensesByCategory).length;
  if (categoryCount > 15) {
    lines.push(`| ... and ${categoryCount - 15} more categories | | |`);
  }
  lines.push();

  // Split Types
  lines.push('## 🔀 Split Type Distribution\n');
  lines.push(`| Split Type | Count | Percentage | Distribution |`);
  lines.push(`|------------|-------|-----------|--------------|`);
  const sortedSplitTypes = Object.entries(stats.expensesBySplitType).sort(([, a], [, b]) => b - a);
  sortedSplitTypes.forEach(([splitType, count]) => {
    const percentage = ((count / stats.totalExpenses) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((count / stats.totalExpenses) * 20));
    lines.push(`| ${splitType} | ${count.toLocaleString()} | ${percentage}% | ${bar} |`);
  });

  return lines.join('\n');
}
