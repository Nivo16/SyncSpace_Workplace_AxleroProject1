import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, History, Layers, Zap, X, Video, ShieldCheck, ScrollText, PlaySquare, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Workspaces', path: '/workspaces', icon: FolderKanban },
    { name: 'Interviews', path: '/interviews', icon: Video },
    { name: 'Recent Sessions', path: '/sessions', icon: History },
    { name: 'Activity History', path: '/audit-logs', icon: ScrollText },
    ...(role === 'admin' || role === 'interviewer' ? [{ name: 'Recordings', path: '/recordings', icon: PlaySquare }] : []),
    ...(role === 'admin' ? [{ name: 'Admin', path: '/admin', icon: ShieldCheck }] : []),
  ];
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-md lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed top-0 bottom-0 left-0 z-40 w-64 overflow-hidden bg-slate-950/90 backdrop-blur-xl border-r border-cyan-500/20 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
            <button type="button" className="flex items-center gap-3" onClick={() => navigate('/dashboard')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/30"><Layers className="w-5 h-5 text-white" /></div>
              <div className="flex flex-col text-left"><span className="font-extrabold text-lg text-slate-100 tracking-tight flex items-center gap-1">SyncSpace <Zap className="w-3.5 h-3.5 text-cyan-400" /></span></div>
            </button>
            <button onClick={() => setMobileOpen(false)} className="lg:hidden text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
          </div>
          <nav className="p-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Navigation</div>
            {navItems.map(({ name, path, icon: Icon }) => {
              const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
              return <NavLink key={name} to={path} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${isActive ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'}`}><Icon className="w-4 h-4" /><span>{name}</span>{isActive && <span className="ml-auto w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}</NavLink>;
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <button type="button" onClick={() => { setMobileOpen(false); navigate('/profile'); }} className="w-full flex items-center gap-3 rounded-xl p-2.5 hover:bg-slate-900 text-left">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center overflow-hidden">{user?.avatarUrl ? <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <UserCircle className="w-5 h-5 text-cyan-300" />}</div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-100 truncate">{user?.name || 'My Profile'}</p><p className="text-[10px] uppercase tracking-wider text-cyan-400">{role || 'user'}</p></div>
          </button>
          <button type="button" onClick={() => { setMobileOpen(false); logout(); navigate('/login'); }} className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"><LogOut className="w-3.5 h-3.5" /> Sign out</button>
        </div>
      </aside>
    </>
  );
};
