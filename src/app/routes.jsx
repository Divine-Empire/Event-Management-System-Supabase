import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES, ROLES } from '@/constants/routes';

import { PublicLayout } from '@/layouts/PublicLayout/PublicLayout';
import { PublicEventLayout } from '@/layouts/PublicEventLayout/PublicEventLayout';
import { AdminLayout } from '@/layouts/AdminLayout/AdminLayout';
import { LiveLayout } from '@/layouts/LiveLayout/LiveLayout';

import { ProtectedRoute, RoleGuard } from '@/components/common/ProtectedRoute';
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';

import { ParticipantEventProvider } from '@/context/ParticipantEventContext';
import { ParticipantVerificationPage } from '@/pages/participant/ParticipantVerificationPage';
import { ParticipantWaitingPage } from '@/pages/participant/ParticipantWaitingPage';
import { ParticipantLuckyNumberPage } from '@/pages/participant/ParticipantLuckyNumberPage';
import { ParticipantSubmissionPage } from '@/pages/participant/ParticipantSubmissionPage';

import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { EventListPage } from '@/pages/admin/EventListPage';
import { CreateEventPage } from '@/pages/admin/CreateEventPage';
import { EventDetailPage } from '@/pages/admin/EventDetailPage';
import { EventParticipantsPage } from '@/pages/admin/EventParticipantsPage';
import { EventWinnersPage } from '@/pages/admin/EventWinnersPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { AdminLivePage } from '@/pages/live/admin/AdminLivePage';
import { ParticipantLivePage } from '@/pages/live/participant/ParticipantLivePage';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to={ROUTES.ADMIN_LOGIN} replace />} />
    <Route path="/login" element={<Navigate to={ROUTES.ADMIN_LOGIN} replace />} />

    <Route element={<PublicLayout />}>
      <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />
    </Route>

    <Route element={<PublicEventLayout />}>
      <Route element={<ParticipantEventProvider />}>
        <Route path={ROUTES.PUBLIC_EVENT} element={<ParticipantVerificationPage />} />
        <Route path={ROUTES.PUBLIC_EVENT_WAITING} element={<ParticipantWaitingPage />} />
        <Route path={ROUTES.PUBLIC_EVENT_LUCKY_NUMBER} element={<ParticipantLuckyNumberPage />} />
        <Route path={ROUTES.PUBLIC_EVENT_SUBMITTED} element={<ParticipantSubmissionPage />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<RoleGuard allowedRole={ROLES.ADMIN} />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.ADMIN} element={<AdminDashboardPage />} />
          <Route path={ROUTES.ADMIN_EVENTS} element={<EventListPage />} />
          <Route path={ROUTES.ADMIN_EVENT_CREATE} element={<CreateEventPage />} />
          <Route path={ROUTES.ADMIN_EVENT_DETAIL} element={<EventDetailPage />} />
          <Route path={ROUTES.ADMIN_PARTICIPANTS} element={<EventParticipantsPage />} />
          <Route path={ROUTES.ADMIN_WINNERS} element={<EventWinnersPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path="/admin/event" element={<Navigate to={ROUTES.ADMIN_EVENTS} replace />} />
          <Route path="/admin/participants" element={<Navigate to={ROUTES.ADMIN_EVENTS} replace />} />
          <Route path="/admin/winners" element={<Navigate to={ROUTES.ADMIN_EVENTS} replace />} />
        </Route>
      </Route>
    </Route>

    <Route element={<LiveLayout />}>
      <Route path={ROUTES.ADMIN_LIVE} element={<AdminLivePage />} />
    </Route>

    <Route element={<PublicEventLayout />}>
      <Route path={ROUTES.PUBLIC_LIVE} element={<ParticipantLivePage />} />
    </Route>

    <Route path="*" element={<Navigate to={ROUTES.ADMIN_LOGIN} replace />} />
  </Routes>
);
