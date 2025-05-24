import { type NextPage } from 'next';
import React from 'react';

import MainLayout from '~/components/Layout/MainLayout';

const ExpensesPage: NextPage = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <div className="mt-4">Nothing</div>
      </div>
    </MainLayout>
  );
};

export default ExpensesPage;
