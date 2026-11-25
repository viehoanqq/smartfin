import React, { useEffect, useState } from 'react';
import OverviewCards from '../../components/customer/dashboard/OverviewCards';
import TransactionList from '../../components/customer/dashboard/TransactionList';
import WalletPanel from '../../components/customer/dashboard/WalletPanel';
import TransactionForm from '../../components/customer/dashboard/TransactionForm';

const Dashboard = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener('smartfin-transactions-changed', refresh);
    return () => window.removeEventListener('smartfin-transactions-changed', refresh);
  }, []);
  return (
    <main className="flex-1 p-6 md:p-8 max-w-[1800px] mx-auto w-full">
      <div className="flex flex-col xl:flex-row gap-6 mb-8">
        {/* Tăng độ rộng cột chứa lên 500px ở màn hình lớn */}
        <div className="w-full xl:w-[500px] shrink-0">
          <WalletPanel key={`wallet-${refreshKey}`} />
        </div>
        <div className="flex-1 w-full min-w-0">
          <OverviewCards key={`overview-${refreshKey}`} />
        </div>
      </div>

      <TransactionForm />
      <TransactionList key={`transactions-${refreshKey}`} />
    </main>
  );
};

export default Dashboard;
