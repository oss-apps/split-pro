import { type GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { AddOrEditExpensePage } from '~/components/AddExpense/AddExpensePage';
import MainLayout from '~/components/Layout/MainLayout';
import { env } from '~/env';
import { cronFromBackend } from '~/lib/cron';
import { parseCurrencyCode } from '~/lib/currency';
import { isBankConnectionConfigured } from '~/server/bankTransactionHelper';
import { useAddExpenseStore } from '~/store/addStore';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { toast } from 'sonner';
import { deserializeDefaultSplit } from '~/lib/defaultSplit';
import { useAppStore } from '~/store/appStore';
import { isStringQueryParam } from '~/utils/queryParams';

const AddPage: NextPageWithUser<{
  enableSendingInvites: boolean;
  bankConnectionEnabled: boolean;
  maxUploadFileSizeMB: number;
}> = ({ user, enableSendingInvites, bankConnectionEnabled, maxUploadFileSizeMB }) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const {
    setCurrentUser,
    setGroup,
    setParticipants,
    setCurrency,
    setAmount,
    setDescription,
    setPaidBy,
    setAmountStr,
    setExpenseDate,
    setCategory,
    resetState,
    setCronExpression,
    setFileKey,
    applySplitPreset,
  } = useAddExpenseStore((s) => s.actions);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const initializedGroupIdRef = useRef<number | null>(null);
  const initializedFriendIdRef = useRef<number | null>(null);
  const initializedExpenseIdRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      resetState();
      initializedExpenseIdRef.current = null;
      initializedGroupIdRef.current = null;
      initializedFriendIdRef.current = null;
    },
    [resetState],
  );

  // TODO: Set this globally from env var with app router later
  const { setMaxUploadFileSizeMB } = useAppStore((s) => s.actions);
  setMaxUploadFileSizeMB(maxUploadFileSizeMB);

  const router = useRouter();
  const { friendId, groupId, expenseId } = router.query;

  useEffect(() => {
    setCurrentUser({
      ...user,
      defaultCurrency: user.defaultCurrency ?? null,
      emailVerified: null,
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
      obapiProviderId: user.obapiProviderId ?? null,
      bankingId: user.bankingId ?? null,
    });
    if (router.isReady && !groupId) {
      const preferredCurrency = user.currency ?? user.defaultCurrency;
      if (preferredCurrency) {
        setCurrency(parseCurrencyCode(preferredCurrency));
      }
    }
  }, [setCurrentUser, setCurrency, groupId, router.isReady, user]);

  const parsedGroupId = isStringQueryParam(groupId) ? parseInt(groupId) : Number.NaN;
  const parsedFriendId = isStringQueryParam(friendId) ? parseInt(friendId) : Number.NaN;
  const parsedExpenseId = isStringQueryParam(expenseId) ? expenseId : '';
  const groupQuery = api.group.getGroupDetails.useQuery(
    { groupId: parsedGroupId },
    {
      enabled: router.isReady && Boolean(parsedGroupId) && !parsedExpenseId,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const friendQuery = api.user.getFriend.useQuery(
    { friendId: parsedFriendId },
    {
      enabled: router.isReady && Boolean(parsedFriendId) && !parsedExpenseId,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const expenseQuery = api.expense.getExpenseDetails.useQuery(
    { expenseId: parsedExpenseId },
    {
      enabled: router.isReady && Boolean(parsedExpenseId),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (!groupId || !parsedGroupId) {
      initializedGroupIdRef.current = null;
      return;
    }

    if (initializedGroupIdRef.current === parsedGroupId) {
      return;
    }

    // Set group
    if (groupId && !groupQuery.isPending && groupQuery.data && currentUser) {
      initializedGroupIdRef.current = parsedGroupId;
      setGroup(groupQuery.data);

      setParticipants([
        currentUser,
        ...groupQuery.data.groupUsers
          .map((gu) => gu.user)
          .filter((groupUser) => groupUser.id !== currentUser.id),
      ]);
      const preferredCurrency =
        currentUser.currency ?? groupQuery.data.defaultCurrency ?? currentUser.defaultCurrency;
      if (preferredCurrency) {
        setCurrency(parseCurrencyCode(preferredCurrency));
      }
      const parsedDefaultSplit = deserializeDefaultSplit(groupQuery.data.defaultSplit);
      if (parsedDefaultSplit) {
        applySplitPreset(parsedDefaultSplit.splitType, parsedDefaultSplit.shares);
      }
      useAddExpenseStore.setState({ showFriends: false });
    }
  }, [
    parsedGroupId,
    groupId,
    groupQuery.isPending,
    groupQuery.data,
    currentUser,
    setGroup,
    setParticipants,
    setCurrency,
    applySplitPreset,
  ]);

  useEffect(() => {
    if (!friendId || !parsedFriendId) {
      initializedFriendIdRef.current = null;
      return;
    }

    if (initializedFriendIdRef.current === parsedFriendId) {
      return;
    }

    if (friendId && currentUser && friendQuery.data) {
      initializedFriendIdRef.current = parsedFriendId;
      setParticipants([currentUser, friendQuery.data]);
      const parsedDefaultSplit = deserializeDefaultSplit(friendQuery.data.defaultSplit);
      if (parsedDefaultSplit) {
        applySplitPreset(parsedDefaultSplit.splitType, parsedDefaultSplit.shares);
      }
      useAddExpenseStore.setState({ showFriends: false });
    }
  }, [parsedFriendId, friendId, friendQuery.data, currentUser, setParticipants, applySplitPreset]);

  useEffect(() => {
    if (!parsedExpenseId || !expenseQuery.data) {
      initializedExpenseIdRef.current = null;
      return;
    }

    if (initializedExpenseIdRef.current === parsedExpenseId) {
      return;
    }

    initializedExpenseIdRef.current = parsedExpenseId;

    if (expenseQuery.data.group) {
      setGroup(expenseQuery.data.group);
    }
    setPaidBy(expenseQuery.data.paidByUser);
    setCurrency(parseCurrencyCode(expenseQuery.data.currency));
    setAmountStr(
      getCurrencyHelpersCached(expenseQuery.data.currency).toUIString(
        expenseQuery.data.amount,
        true,
        true,
      ),
    );
    setDescription(expenseQuery.data.name);
    setCategory(expenseQuery.data.category);
    setAmount(expenseQuery.data.amount);
    setParticipants(
      expenseQuery.data.expenseParticipants.map((ep) => ({
        ...ep.user,
        amount: ep.amount,
      })),
      expenseQuery.data.splitType,
    );
    useAddExpenseStore.setState({ showFriends: false });
    setExpenseDate(expenseQuery.data.expenseDate);
    if (expenseQuery.data.recurrence) {
      try {
        const cronExpression = cronFromBackend(expenseQuery.data.recurrence.job.schedule);
        setCronExpression(cronExpression);
      } catch {
        toast.error(t('errors.invalid_cron_expression'));
        console.error(
          `Failed to parse cron expression for expense: ${expenseQuery.data.recurrence.job.schedule}`,
        );
      }
    }
    if (expenseQuery.data.fileKey) {
      setFileKey(expenseQuery.data.fileKey);
    }
  }, [
    parsedExpenseId,
    expenseQuery.data,
    setAmount,
    setAmountStr,
    setCategory,
    setCurrency,
    setDescription,
    setExpenseDate,
    setGroup,
    setPaidBy,
    setParticipants,
    setCronExpression,
    setFileKey,
    getCurrencyHelpersCached,
    t,
  ]);

  return (
    <>
      <Head>
        <title>{parsedExpenseId ? t('actions.edit_expense') : t('actions.add_expense')}</title>
      </Head>
      <MainLayout hideAppBar>
        {currentUser && (!parsedExpenseId || expenseQuery.data) && (
          <AddOrEditExpensePage
            enableSendingInvites={enableSendingInvites}
            expenseId={parsedExpenseId}
            bankConnectionEnabled={bankConnectionEnabled}
          />
        )}
      </MainLayout>
    </>
  );
};

AddPage.auth = true;

export default AddPage;

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    enableSendingInvites: env.ENABLE_SENDING_INVITES,
    bankConnectionEnabled: isBankConnectionConfigured(),
    maxUploadFileSizeMB: env.UPLOAD_MAX_FILE_SIZE_MB,
    ...(await customServerSideTranslations(context.locale, ['common', 'categories', 'currencies'])),
  },
});
