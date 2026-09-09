import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Gamepad2, User, ShieldCheck, ShoppingBag } from 'lucide-react';

export const MobileBottomNav = () => {
  const { setIsUserProfileOpen, setIsAdminOpen, orders } = useApp();
  const activeOrders = orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-2xl">
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex flex-col items-center gap-1 text-red-600 font-medium text-[11px]"
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </button>

      <button 
        onClick={() => {
          const el = document.getElementById('game-catalog');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-medium text-[11px]"
      >
        <Gamepad2 className="w-5 h-5" />
        <span>Games</span>
      </button>

      <button 
        onClick={() => setIsUserProfileOpen(true)}
        className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-medium text-[11px] relative"
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
        {activeOrders > 0 && (
          <span className="absolute -top-1 right-2 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {activeOrders}
          </span>
        )}
      </button>

      <button 
        onClick={() => setIsAdminOpen(true)}
        className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-medium text-[11px]"
      >
        <ShieldCheck className="w-5 h-5 text-red-500" />
        <span>Admin</span>
      </button>
    </nav>
  );
};
