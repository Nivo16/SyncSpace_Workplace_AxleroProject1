import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, LogIn, UserPlus, LogOut, Zap, Moon, Sun } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const Header = ({ title = 'Dashboard', onMenuClick, searchQuery = '', setSearchQuery }) => {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    showToast('Logged out', 'info');
    navigate('/login', { replace: true });
  };

  const notifications = [
    { id: 1, title: 'Project Alpha updated', time: '10m ago', unread: true },
    { id: 2, title: 'Alex Vance joined workspace', time: '25m ago', unread: true },
    { id: 3, title: 'Weekly activity summary ready', time: '2h ago', unread: false },
  ];

  const isLightMode = theme === 'light';

  return (
    <header className="h-16 border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-slate-400 hover:text-cyan-300 p-2 rounded-xl hover:bg-slate-900 border border-slate-800" aria-label="Open sidebar menu">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <span>{title}</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {setSearchQuery && (
          <div className="relative hidden md:block w-64 lg:w-72">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-8 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">⌘K</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setTheme(isLightMode ? 'cyan' : 'light');
            showToast(isLightMode ? 'Dark mode enabled' : 'Light mode enabled', 'info');
          }}
          className="p-2 rounded-xl border border-slate-800/80 text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
          aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
          title={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-900 border border-slate-800/80 transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950 animate-ping" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950 p-4 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="font-semibold text-sm text-slate-200">Notifications</span>
                <span className="text-xs text-cyan-400 font-medium cursor-pointer hover:underline" onClick={() => showToast('All marked as read', 'info')}>Mark all read</span>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 transition-colors flex items-start justify-between border border-slate-800/60">
                    <div>
                      <p className="text-xs font-medium text-slate-200">{n.title}</p>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button variant="outline" size="sm" icon={<LogOut className="w-4 h-4 text-cyan-400" />} onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" icon={<LogIn className="w-4 h-4 text-cyan-400" />} onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button variant="thunder" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => navigate('/register')} className="hidden sm:inline-flex">
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};