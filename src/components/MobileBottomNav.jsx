import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Gamepad2, User, ShieldCheck, ShoppingBag } from 'lucide-react';

export const MobileBottomNav = () => {
  const { setIsUserProfileOpen, setIsAdminOpen, orders } = useApp();
  const activeOrders = orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090D16]/95 backdrop-blur-xl border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl">
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex flex-col items-center gap-1 text-[#00B4D8] font-bold text-[11px] cursor-pointer"
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </button>

      <button 
        onClick={() => {
          const el = document.getElementById('game-catalog');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        className="flex flex-col items-center gap-1 text-slate-400 hover:text-white font-medium text-[11px] cursor-pointer"
      >
        <Gamepad2 className="w-5 h-5" />
        <span>Games</span>
      </button>

      <button 
        onClick={() => setIsUserProfileOpen(true)}
        className="flex flex-col items-center gap-1 text-slate-400 hover:text-white font-medium text-[11px] relative cursor-pointer"
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
        {activeOrders > 0 && (
          <span className="absolute -top-1 right-2 bg-[#3B2896] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {activeOrders}
          </span>
        )}
      </button>

      <button 
        onClick={() => setIsAdminOpen(true)}
        className="flex flex-col items-center gap-1 text-slate-400 hover:text-white font-medium text-[11px] cursor-pointer"
      >
        <ShieldCheck className="w-5 h-5 text-[#00B4D8]" />
        <span>Admin</span>
      </button>
    </nav>
  );
};
