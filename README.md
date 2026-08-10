# Divine Empire Event Management System

React + Vite event management application for admin-managed participant registration, approval, lucky-number selection, and live winner reveal.

## Project structure

```text
src/
├── app/                    # Application bootstrap, providers, routes
├── components/             # Reusable UI components
│   ├── common/
│   ├── draw/
│   ├── event/
│   ├── participant/
│   └── participants/
├── constants/              # Route and application constants
├── context/                # Global and participant workflow state
├── layouts/                # Admin/public/live layouts
├── lib/                    # External clients (Supabase)
├── pages/                  # Route-level pages
│   ├── admin/
│   ├── auth/
│   ├── live/
│   └── participant/
├── services/               # Data/API access
├── stores/                 # Zustand stores
└── utils/                  # Shared business/utilities
```

## Participant workflow

The participant workflow is intentionally split into independent route-level pages:

1. `/event/:token` — Participant verification
2. `/event/:token/lucky-number` — Lucky number selection
3. `/event/:token/submitted` — Submission confirmation and pass download
4. `/event/:token/waiting` — Waiting for admin approval
5. `/live/:token` — Live draw portal

The workflow state and existing participant logic are centralized in `ParticipantEventContext.jsx`, so splitting the pages does not duplicate the underlying business logic.

## Admin workflow

- `/admin` — Dashboard
- `/admin/events` — Event list
- `/admin/events/create` — Create event
- `/admin/events/:id` — Event overview
- `/admin/events/:id/participants` — Participant management
- `/admin/events/:id/winners` — Winner history
- `/admin/live/:id` — Live draw console
- `/admin/settings` — Settings






