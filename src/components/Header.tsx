import { Menu, Moon, Sun, LogOut, Shield } from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { currentClient, isDarkMode, setDarkMode } = useAccounting();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <div className="bg-gradient-to-br from-blue-700 object-cover to-blue-900 text-white rounded-2xl p-5 md:p-6 mb-6 shadow-lg border-l-4 border-yellow-400 flex flex-col gap-3">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold flex flex-wrap items-center gap-3">
            <span className="hidden sm:inline">📊</span> CAPO Accounting Setup
            {currentClient && (
              <span className="bg-yellow-400 text-blue-950 px-4 py-1 rounded-full text-sm font-bold shadow-sm whitespace-nowrap">
                {currentClient.name}
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden sm:flex text-sm text-blue-200 mr-2 items-center gap-2">
              <span className="truncate max-w-[150px]">{user.email}</span>
              {isAdmin && (
                 <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 text-xs font-bold">
                   <Shield className="w-3 h-3" /> Developer
                 </span>
              )}
            </div>
          )}
          <button
            onClick={() => setDarkMode(!isDarkMode)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-white/10"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-100 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

