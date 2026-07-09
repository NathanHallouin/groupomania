# Groupomania Frontend

Modern enterprise social network frontend built with React 19, TypeScript, and Vite.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter)

## Features

- **Authentication** - Secure login/registration with JWT tokens
- **Real-time Messaging** - Channel-based communication
- **User Profiles** - Customizable profiles with avatars
- **Channel Management** - Create, join, and manage public/private channels
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Code Splitting** - Lazy-loaded routes for optimal performance

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI Framework |
| TypeScript | 5.9 | Type Safety |
| Vite | 8 | Build Tool |
| Tailwind CSS | 4 | Styling |
| React Router | 7 | Routing (Remix-style) |
| Zustand | 5 | State Management |
| TanStack Query | 5 | Data Fetching |
| React Hook Form | 7 | Form Handling |
| Zod | 4 | Schema Validation |
| Axios | 1.x | HTTP Client |
| Lucide React | - | Icons |
| date-fns | 4 | Date Formatting |

## Project Structure

```
src/
├── api/                    # API clients
│   ├── client.ts           # Axios instance with interceptors
│   ├── auth.ts             # Authentication endpoints
│   ├── channels.ts         # Channel endpoints
│   ├── messages.ts         # Message endpoints
│   └── users.ts            # User endpoints
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Avatar.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   └── layout/             # Layout components
│       ├── Header.tsx
│       ├── Layout.tsx
│       └── Sidebar.tsx
├── pages/                  # Page components (lazy-loaded)
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── HomePage.tsx
│   ├── ChannelsPage.tsx
│   ├── ChannelPage.tsx
│   ├── CreateChannelPage.tsx
│   ├── UsersPage.tsx
│   ├── ProfilePage.tsx
│   ├── UserProfilePage.tsx
│   └── SettingsPage.tsx
├── stores/                 # Zustand stores
│   ├── authStore.ts        # Authentication state
│   └── channelStore.ts     # Channel state
├── types/                  # TypeScript types
│   └── index.ts
├── router.tsx              # React Router configuration
├── App.tsx                 # Root component
└── main.tsx                # Entry point
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Backend API running on `http://localhost:3000`

### Installation

```bash
# Clone the repository
git clone https://github.com/NathanHallouin/groupomania-frontend.git
cd groupomania-frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000/api` | Backend API URL |
| `VITE_APP_NAME` | `Groupomania` | Application name |

## Available Scripts

```bash
# Development
npm run dev          # Start dev server on http://localhost:5173

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

## Routing

This project uses React Router 7 with Remix-style data loading patterns:

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | User authentication |
| `/register` | RegisterPage | User registration |
| `/` | HomePage | Dashboard with stats |
| `/channels` | ChannelsPage | Channel list |
| `/channels/new` | CreateChannelPage | Create new channel |
| `/channels/:id` | ChannelPage | Channel messages |
| `/users` | UsersPage | User directory |
| `/users/:id` | UserProfilePage | User profile view |
| `/profile` | ProfilePage | Current user profile |
| `/settings` | SettingsPage | User settings |

### Data Loading Pattern

```tsx
// Routes use loaders for data fetching
{
  path: 'channels/:channelId',
  loader: async ({ params }) => {
    const channel = await channelsApi.getById(params.channelId);
    const messages = await messagesApi.getChannelMessages(params.channelId);
    return { channel, messages };
  },
  lazy: () => import('./pages/ChannelPage'),
}

// Pages access data via useLoaderData
export function ChannelPage() {
  const { channel, messages } = useLoaderData();
  // Data is already loaded!
}
```

## API Integration

The frontend communicates with the Groupomania backend microservices through the API Gateway:

- **Auth Service** - `/api/auth/*` - Authentication & registration
- **User Service** - `/api/users/*` - User profiles & management
- **Message Service** - `/api/messages/*` & `/api/channels/*` - Messaging
- **File Service** - `/api/upload/*` - File uploads

### Authentication Flow

1. User logs in via `/api/auth/login`
2. JWT tokens stored in Zustand (persisted to localStorage)
3. Axios interceptor attaches token to requests
4. Token refresh handled automatically on 401 responses

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [Groupomania Backend Microservices](https://github.com/NathanHallouin/groupomania-backend-microservices) - Backend API
