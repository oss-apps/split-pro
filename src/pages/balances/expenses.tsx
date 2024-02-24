import { type NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import MainLayout from '~/components/Layout/MainLayout';

const ExpensesPage: NextPage = () => {
  const router = useRouter();
  const { friendId } = router.query;
  const [expenses, setExpenses] = useState([]);

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
