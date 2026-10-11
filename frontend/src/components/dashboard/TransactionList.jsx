import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { TRANSACTIONS } from '../../mock/dashboardData';

const TransactionList = () => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-lg font-semibold text-white">Transactions</h3>
      <MoreHorizontal size={20} className="text-gray-500 cursor-pointer" />
    </div>

    <div className="flex flex-col gap-3">
      {TRANSACTIONS.map((trx) => {
        const Icon = trx.icon;
        return (
          <div key={trx.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${trx.active ? 'bg-[#252836]' : 'hover:bg-[#252836]/50'}`}>
            <div className="flex items-center gap-4 w-40">
              <div className="w-10 h-10 rounded-xl bg-[#181920] border border-gray-800 flex items-center justify-center text-gray-400">
                <Icon size={18} />
              </div>
              <span className="font-medium text-white">{trx.name}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-gray-500 mb-0.5">Date</p>
              <p className="text-sm text-gray-300">{trx.date}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-xs text-gray-500 mb-0.5">Time</p>
              <p className="text-sm text-gray-300">{trx.time}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Amount</p>
              <p className="text-sm font-semibold text-white">{trx.amount}</p>
            </div>
            <button className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${trx.active ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-400 border border-gray-700 hover:bg-gray-800'}`}>
              See invoice
            </button>
          </div>
        );
      })}
    </div>
  </div>
);

export default TransactionList;