import { type NextPage } from 'next';
import { useRouter } from 'next/router';
import React, {useEffect} from 'react';
import MainLayout from '~/components/Layout/MainLayout';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';

const ExpensesPage: NextPage = () => {
  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);
  return (
    <MainLayout>
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-semibold">{t('expenses')}</h1>
        <div className="mt-4">{t('nothing')}</div>
      </div>
    </MainLayout>
  );
};

export default ExpensesPage;
