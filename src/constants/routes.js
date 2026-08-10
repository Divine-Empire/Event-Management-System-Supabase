export const ROUTES = {
  LANDING: '/',
  LOGIN: '/admin/login',
  ADMIN_LOGIN: '/admin/login',
  
  // Public Participant Event Link Routes
  PUBLIC_EVENT: '/event/:token',
  PUBLIC_EVENT_WAITING: '/event/:token/waiting',
  PUBLIC_EVENT_LUCKY_NUMBER: '/event/:token/lucky-number',
  PUBLIC_EVENT_SUBMITTED: '/event/:token/submitted',
  PUBLIC_LIVE: '/live/:token',

  // Admin Console Routes
  ADMIN: '/admin',
  ADMIN_EVENTS: '/admin/events',
  ADMIN_EVENT_CREATE: '/admin/events/create',
  ADMIN_EVENT_DETAIL: '/admin/events/:id',
  ADMIN_PARTICIPANTS: '/admin/events/:id/participants',
  ADMIN_WINNERS: '/admin/events/:id/winners',
  ADMIN_LIVE: '/admin/live/:id',
  SETTINGS: '/admin/settings',

  // Fallbacks
  NOT_FOUND: '*'
};

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};
