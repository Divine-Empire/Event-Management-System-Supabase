import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEvent } from '@/context/EventContext';
import { WinnerHistoryPage } from './WinnerHistoryPage';

export const EventWinnersPage = () => {
  const { id } = useParams();
  const { setActiveEvent } = useEvent();

  useEffect(() => {
    if (id) setActiveEvent(id);
  }, [id]);

  return <WinnerHistoryPage />;
};
