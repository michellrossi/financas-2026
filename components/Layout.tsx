import React from 'react';
import { ViewState, User } from '../types';
import { LayoutDashboard, CircleArrowUp, CircleArrowDown, CreditCard, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (v: ViewState) => void;
  user: User;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, user, onLogout }) => {

  const NavIcon = ({ view, icon: Icon, tooltip, mobile = false }: { view: ViewState; icon: any; tooltip: string, mobile?: boolean }) => (
    <button
      onClick={() => setView(view)}
      className={`group relative flex items-center justify-center transition-all duration-200 
        ${mobile 
          ? 'flex-col gap-1 w-full h-full py-2' 
          : 'w-12 h-12 rounded-2xl'
        }
        ${currentView === view 
          ? (mobile ? 'text-emerald-600' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200') 
          : (mobile ? 'text-slate-400' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600')
        }`}
      title={tooltip}
    >
      <Icon size={mobile ? 24 : 24} strokeWidth={currentView === view ? 2.5 : 2} />
      {mobile && <span className="text-[10px] font-medium">{tooltip}</span>}
      
      {!mobile && (
        <span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {tooltip}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col items-center justify-center w-24 bg-white border-r border-slate-100 py-8 relative">
        <nav className="flex flex-col gap-6 w-full items-center px-2">
          <NavIcon view="DASHBOARD" icon={LayoutDashboard} tooltip="Visão Geral" />
          <NavIcon view="INCOMES" icon={CircleArrowUp} tooltip="Entradas" />
          <NavIcon view="EXPENSES" icon={CircleArrowDown} tooltip="Saídas" />
          <NavIcon view="CARDS" icon={CreditCard} tooltip="Cartões" />
        </nav>

        <div className="absolute bottom-8 flex flex-col gap-4 items-center w-full">
           <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
           <button 
             onClick={onLogout} 
             className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
             title="Sair"
           >
             <LogOut size={20} />
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {/* Header for Mobile only to show Title/User */}
          <div className="md:hidden flex justify-between items-center mb-6">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">F</div>
                <h1 className="font-bold text-slate-800 text-lg">Finanças</h1>
             </div>
             <button onClick={onLogout} className="p-2 text-slate-400"><LogOut size={20}/></button>
          </div>
          {children}
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 pb-safe">
         <div className="flex justify-around items-center h-16">
            <NavIcon view="DASHBOARD" icon={LayoutDashboard} tooltip="Visão" mobile />
            <NavIcon view="INCOMES" icon={CircleArrowUp} tooltip="Entradas" mobile />
            <NavIcon view="EXPENSES" icon={CircleArrowDown} tooltip="Saídas" mobile />
            <NavIcon view="CARDS" icon={CreditCard} tooltip="Cartões" mobile />
         </div>
      </div>
    </div>
  );
};