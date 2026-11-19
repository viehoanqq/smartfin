import React from 'react';
import OverviewCards from '../components/dashboard/OverviewCards';
import TransactionList from '../components/dashboard/TransactionList';
import WalletPanel from '../components/dashboard/WalletPanel';
import TransactionForm from '../components/dashboard/TransactionForm';

const Dashboard = () => {
  return (
    <main className="flex-1 p-6 md:p-8 max-w-[1800px] mx-auto w-full">
      <div className="flex flex-col xl:flex-row gap-6 mb-8">
        {/* Tăng độ rộng cột chứa lên 500px ở màn hình lớn */}
        <div className="w-full xl:w-[500px] shrink-0">
          <WalletPanel />
        </div>
        <div className="flex-1 w-full min-w-0">
          <OverviewCards />
        </div>
      </div>

      <TransactionForm />
      <TransactionList />
    </main>
  );
};

export default Dashboard;