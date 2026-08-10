import { create } from 'zustand';
import { authService } from '@/services/authService';

const getInitialAdminUser = () => {
  try {
    const stored = localStorage.getItem('dei_admin_user') || sessionStorage.getItem('dei_admin_user');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

const getInitialIsAdminAuthenticated = () => {
  try {
    const storedAuth = localStorage.getItem('dei_is_admin_authenticated') || sessionStorage.getItem('dei_is_admin_authenticated');
    return storedAuth === 'true';
  } catch (e) {
    return false;
  }
};

export const useAuthStore = create((set, get) => ({
  adminUser: getInitialAdminUser(),
  isAdminAuthenticated: getInitialIsAdminAuthenticated(),

  user: null,
  isAuthenticated: true,
  isLoading: false,

  login: async (usernameOrEmail, password, requestedRole = 'admin') => {
    set({ isLoading: true });

    if (requestedRole === 'admin') {
      const res = await authService.loginAdmin(usernameOrEmail, password);
      if (res.success) {
        try {
          localStorage.setItem('dei_admin_user', JSON.stringify(res.user));
          localStorage.setItem('dei_is_admin_authenticated', 'true');
        } catch (e) {
          console.error('Error saving auth session:', e);
        }
        set({ adminUser: res.user, isAdminAuthenticated: true, isLoading: false });
        return { success: true, user: res.user };
      } else {
        set({ isLoading: false });
        return { success: false, message: res.message };
      }
    }

    const activeUser = {
      id: `usr_${Date.now()}`,
      username: usernameOrEmail.trim(),
      name: usernameOrEmail.trim(),
      role: 'user'
    };

    set({ user: activeUser, isAuthenticated: true, isLoading: false });
    return { success: true, user: activeUser };
  },

  registerAdmin: async (username, password) => {
    set({ isLoading: true });
    const res = await authService.registerAdmin(username, password);
    set({ isLoading: false });
    return res;
  },

  logout: () => {
    try {
      localStorage.removeItem('dei_admin_user');
      localStorage.removeItem('dei_is_admin_authenticated');
      sessionStorage.removeItem('dei_admin_user');
      sessionStorage.removeItem('dei_is_admin_authenticated');
    } catch (e) {
      console.error('Error clearing auth session:', e);
    }
    set({ adminUser: null, isAdminAuthenticated: false });
  },

  logoutParticipant: () => {
    set({ user: null });
  }
}));
