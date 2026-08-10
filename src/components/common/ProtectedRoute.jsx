import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/constants/routes';

export const ProtectedRoute = () => {
  const { adminUser, isAdminAuthenticated } = useAuthStore();

  if (!isAdminAuthenticated || !adminUser) {
    return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
  }

  return <Outlet />;
};

export const RoleGuard = ({ allowedRole, children }) => {
  const { adminUser, user, isAdminAuthenticated } = useAuthStore();

  if (allowedRole === 'admin') {
    if (!isAdminAuthenticated || !adminUser) {
      return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
    }
  } else {
    if (!user) {
      return <Navigate to={ROUTES.JOIN} replace />;
    }
  }

  return children ? children : <Outlet />;
};
