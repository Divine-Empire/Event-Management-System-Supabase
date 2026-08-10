import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Hash, 
  Trophy, 
  Settings, 
  LogOut, 
  ShieldCheck
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/authStore';
import { useEvent } from '@/context/EventContext';
import { CompanyLogo } from '@/components/common/CompanyLogo';

export const AdminSidebar = ({ collapsed, mobileOpen, onCloseMobile }) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { eventData } = useEvent();

  const navItems = [
    { label: 'Dashboard', path: ROUTES.ADMIN, icon: LayoutDashboard },
    { label: 'Events', path: ROUTES.ADMIN_EVENTS, icon: Calendar },
    { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings }
  ];

  const handleLogout = () => {
    logout();
    navigate(ROUTES.ADMIN_LOGIN);
  };

  return (
    <aside className={`fixed top-0 bottom-0 left-0 bg-white border-r border-slate-200 z-50 flex flex-col transition-all duration-200 shadow-sm ${collapsed ? 'w-18' : 'w-70'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      {/* Brand Header */}
      <div className="h-12 flex items-center px-3.5 border-b border-slate-200 flex-shrink-0 overflow-hidden min-w-0">
        <CompanyLogo size="sm" showText={!collapsed} />
      </div>

      {/* Active Event Indicator Pill */}
      {!collapsed && eventData && (
        <div className="px-3 pt-3 pb-1">
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse"></div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">SELECTED EVENT</span>
              <span className="font-extrabold text-blue-900 break-words leading-tight">{eventData.name || 'Default Event'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === ROUTES.ADMIN}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-colors ${
                  isActive 
                    ? 'bg-blue-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-blue-900'
                }`
              }
              onClick={onCloseMobile}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-100">
        <button 
          type="button" 
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
          onClick={handleLogout}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
