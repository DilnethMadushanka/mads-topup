import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Gamepad2, User, ShieldCheck, ShoppingBag } from 'lucide-react';

export const MobileBottomNav = () => {
  const { 
    setIsUserProfileOpen, 
    setIsAdminOpen, 
    orders, 
    openCatalog, 
    closeCatalog, 
    isGameCatalogOpen,
    setSelectedGame,
    selectedGame,
    openAuth,
    isLoggedIn
  } = useApp();
  
  const activeOrders = orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;

  const handleHomeClick = () => {
    setSelectedGame(null);
    closeCatalog();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCatalogClick = () => {
    setSelectedGame(null);
    openCatalog();
  };

  const handleProfileClick = () => {
    if (isLoggedIn) {
      setIsUserProfileOpen(true);
    } else {
      openAuth('login');
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-2xl">
      <button 
        onClick={handleHomeClick}
        className={`flex flex-col items-center gap-1 font-bold text-[10px] uppercase tracking-wider cursor-pointer ${!isGameCatalogOpen && !selectedGame ? 'text-[#cc040a]' : 'text-slate-500'}`}
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </button>

      <button 
        onClick={handleCatalogClick}
        className={`flex flex-col items-center gap-1 font-bold text-[10px] uppercase tracking-wider cursor-pointer ${isGameCatalogOpen && !selectedGame ? 'text-[#cc040a]' : 'text-slate-500'}`}
      >
        <Gamepad2 className="w-5 h-5" />
        <span>Games</span>
      </button>

      {isLoggedIn ? (
        <button 
          onClick={handleProfileClick}
          className="flex flex-col items-center gap-1 text-[#cc040a] font-bold text-[10px] uppercase tracking-wider relative cursor-pointer"
        >
          <User className="w-5 h-5 text-[#cc040a]" />
          <span>Profile</span>
        </button>
      ) : (
        <button 
          onClick={() => openAuth('login')}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
        >
          <User className="w-5 h-5" />
          <span>Login</span>
        </button>
      )}

      <button 
        onClick={handleProfileClick}
        className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-bold text-[10px] uppercase tracking-wider relative cursor-pointer"
      >
        <ShoppingBag className="w-5 h-5 text-indigo-600" />
        <span>My Orders</span>
        {orders.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#cc040a] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            {orders.length}
          </span>
        )}
      </button>

      <button 
        onClick={() => setIsAdminOpen(true)}
        className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
      >
        <ShieldCheck className="w-5 h-5 text-amber-500" />
        <span>Admin</span>
      </button>
    </nav>
  );
};
