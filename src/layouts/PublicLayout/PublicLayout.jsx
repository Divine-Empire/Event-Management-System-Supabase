import React from 'react';
import { Outlet } from 'react-router-dom';
import { Footer } from '@/components/common/Footer';

export const PublicLayout = () => {
  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-900 flex flex-col justify-between w-full">
      <div className="flex-1 flex items-center justify-center overflow-hidden w-full">
        <Outlet />
      </div>
      <Footer variant="dark" />
    </div>
  );
};
