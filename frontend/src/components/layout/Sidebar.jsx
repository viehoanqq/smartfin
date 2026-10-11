import React from 'react';
import { NAV_ITEMS } from '../../mock/dashboardData';

const Sidebar = () => (
  <aside className="w-64 h-full py-8 px-6 flex flex-col gap-2 border-r border-[#252836] hidden lg:flex bg-[#1a1c24] shrink-0 overflow-y-auto custom-scrollbar">
    <nav className="flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
              item.active 
                ? 'text-white font-semibold bg-[#252836]' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#252836]/40'
            }`}
          >
            <Icon size={20} className={item.active ? 'text-blue-500' : 'text-gray-500'} />
            {item.label}
          </a>
        );
      })}
    </nav>
  </aside>
);

export default Sidebar;