import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { EventProvider } from '../context/EventContext';
import { Toaster } from 'sonner';

export const AppProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <EventProvider>
        {children}
        <Toaster position="top-right" richColors />
      </EventProvider>
    </BrowserRouter>
  );
};
