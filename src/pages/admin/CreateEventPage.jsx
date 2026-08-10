import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateEventModal } from '@/components/event/CreateEventModal';
import { ROUTES } from '@/constants/routes';

export const CreateEventPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <CreateEventModal
        isOpen={true}
        onClose={() => navigate(ROUTES.ADMIN_EVENTS)}
        onEventCreated={(evt) => navigate(`/admin/events/${evt.id}`)}
      />
    </div>
  );
};
