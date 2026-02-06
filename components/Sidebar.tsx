import React from 'react';
import { LayoutDashboard, Users, Calendar, Repeat, LogOut, Settings, X } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onLogout, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Faturamento', icon: LayoutDashboard },
    { id: 'students', label: 'Alunos', icon: Users },
    { id: 'schedule', label: 'Aulas da Semana', icon: Calendar },
    { id: 'replacements', label: 'Reposições', icon: Repeat },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">
              BILLER'S <span className="text-yellow-400">PILATES</span>
            </h1>
            <p className="text-[10px] tracking-widest text-zinc-500 mt-1 uppercase">Studio</p>
          </div>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="md:hidden text-zinc-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  onClose(); // Close sidebar on mobile when item clicked
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-yellow-400 text-black shadow-md' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair do Sistema
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;