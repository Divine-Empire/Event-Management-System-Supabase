import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, Sun, Moon, LogOut, User as UserIcon, Check, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useEvent } from '../../context/EventContext';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';

export const Header = ({ onToggleSidebar, sidebarHidden }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminUser, user, logout } = useAuthStore();
  const { 
    eventData, 
    notifications, 
    markNotificationsRead, 
    clearNotifications,
    updateEventDetails 
  } = useEvent();

  const isAdminPage = location.pathname.startsWith('/admin');
  const currentUser = isAdminPage ? (adminUser || { name: 'System Admin', role: 'admin' }) : (user || { name: 'Participant', role: 'user' });

  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate(isAdminPage ? ROUTES.ADMIN_LOGIN : ROUTES.LOGIN);
  };

  const handleThemeToggle = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);

    const nextTheme = nextDark ? 'dark' : 'light';
    updateEventDetails({
      settings: {
        ...(eventData?.settings || {}),
        theme: nextTheme
      }
    });

    document.documentElement.setAttribute('data-theme', nextTheme);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const getDisplayRole = (role) => {
    if (!role) return 'Admin';
    const r = String(role).trim().toLowerCase();
    if (r === 'admin') return 'Admin';
    if (r === 'user') return 'User';
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  return (
    <header className="h-12 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 w-full">
      {/* Left side: Hamburger Toggle Button (only when sidebar is hidden or on mobile) */}
      <button 
        type="button" 
        className={`w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-700 items-center justify-center hover:bg-slate-50 cursor-pointer transition-all active:scale-95 shrink-0 ${
          sidebarHidden ? 'flex' : 'flex md:hidden'
        }`}
        onClick={onToggleSidebar}
        title="Toggle Sidebar Navigation"
      >
        <Menu size={18} />
      </button>

      {/* Right side controls */}
      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {/* Real Notification Bell Popover */}
        <div className="relative">
          <button 
            type="button" 
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 relative cursor-pointer transition-all active:scale-95"
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              setShowProfileMenu(false);
            }}
            title="System Logs & Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Real Notification Popover Menu */}
          {showNotificationMenu && (
            <div className="absolute top-12 right-0 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-black text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell size={14} /> System Activity Logs
                </span>
                {unreadCount > 0 && (
                  <button 
                    type="button" 
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    onClick={() => {
                      markNotificationsRead();
                    }}
                  >
                    <Check size={12} /> Mark Read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-semibold">No activity logs recorded.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-2.5 rounded-xl border text-xs space-y-0.5 ${n.read ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-blue-50/70 border-blue-200 text-slate-900 font-medium'}`}>
                      <div className="font-bold">{n.text}</div>
                      <div className="text-[10px] text-slate-400 text-right">{n.time}</div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button 
                    type="button" 
                    className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    onClick={() => {
                      clearNotifications();
                    }}
                  >
                    <Trash2 size={12} /> Clear Logs
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button 
          type="button" 
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
          onClick={handleThemeToggle}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-slate-700" />}
        </button>

        {/* User Profile Avatar Dropdown */}
        <div className="relative">
          <button 
            type="button"
            className="flex items-center gap-3 border-none bg-transparent cursor-pointer"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotificationMenu(false);
            }}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-950 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="font-extrabold text-xs text-slate-800">{currentUser?.name || 'User'}</span>
              <span className="text-[10px] font-bold text-slate-500">{getDisplayRole(currentUser?.role)}</span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute top-12 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 flex flex-col gap-1 z-50">
              <button 
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-900 w-full text-left cursor-pointer"
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate(ROUTES.SETTINGS);
                }}
              >
                <UserIcon size={14} />
                <span>My Profile / Settings</span>
              </button>

              <button 
                type="button" 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 w-full text-left cursor-pointer"
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
