import { Menu, Moon, Sun, LogOut, Shield, Monitor, Smartphone, Tablet, Cpu } from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { currentClient, isDarkMode, setDarkMode, isSyncing, deviceType, setDeviceType, activeDevice } = useAccounting();
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
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold flex flex-wrap items-center gap-3">
              <span className="hidden sm:inline">📊</span> 
              {currentClient ? (currentClient.registeredName || currentClient.tradeName || 'CAPO Accounting Setup') : 'CAPO Accounting Setup'}
            </h1>
            {isSyncing && (
              <span className="text-[10px] text-blue-200 animate-pulse flex items-center gap-1 mt-1 font-bold uppercase tracking-widest pl-9">
                <span className="w-1 h-1 bg-blue-200 rounded-full animate-ping"></span>
                Syncing with Cloud...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Device Controls bar */}
          <div className="flex bg-blue-950/40 p-1 rounded-full border border-white/10 items-center">
            <button
              onClick={() => setDeviceType('auto')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${deviceType === 'auto' ? 'bg-yellow-400 text-blue-950 shadow-md' : 'text-blue-200 hover:text-white'}`}
              title="Auto Detect Device"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto</span>
            </button>
            <button
              onClick={() => setDeviceType('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${deviceType === 'mobile' ? 'bg-yellow-400 text-blue-950 shadow-md' : 'text-blue-200 hover:text-white'}`}
              title="Force Mobile Layout"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
            <button
              onClick={() => setDeviceType('tablet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${deviceType === 'tablet' ? 'bg-yellow-400 text-blue-950 shadow-md' : 'text-blue-200 hover:text-white'}`}
              title="Force Tablet Layout"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              onClick={() => setDeviceType('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${deviceType === 'desktop' ? 'bg-yellow-400 text-blue-950 shadow-md' : 'text-blue-200 hover:text-white'}`}
              title="Force Desktop Layout"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <span className="text-blue-200 mr-1.5">View:</span>
            <span className="font-extrabold text-yellow-400 uppercase tracking-wider">{activeDevice}</span>
          </div>

          <button
            onClick={() => setDarkMode(!isDarkMode)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-white/10"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>
    </div>
  );
}

