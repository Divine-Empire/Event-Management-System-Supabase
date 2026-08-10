import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { Header } from '@/layouts/shared/Header';
import { Footer } from '@/components/common/Footer';

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 relative overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Admin Sidebar Navigation */}
      <AdminSidebar 
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden min-w-0 transition-all duration-200 ${collapsed ? 'md:ml-18' : 'md:ml-70'}`}>
        <Header 
          sidebarHidden={collapsed}
          onToggleSidebar={() => {
            if (window.innerWidth < 768) {
              setMobileOpen(!mobileOpen);
            } else {
              setCollapsed(!collapsed);
            }
          }}
        />

        <main className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 max-w-7xl w-full mx-auto min-w-0 overflow-y-auto">
          <Outlet />
        </main>

        <Footer variant="light" />
      </div>
    </div>
  );
};
