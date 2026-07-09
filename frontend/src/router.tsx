import {
  createBrowserRouter,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { channelsApi, usersApi, messagesApi, authApi } from './api';

// Auth guard for protected routes
const requireAuth = async () => {
  const { isAuthenticated, tokens } = useAuthStore.getState();

  if (!isAuthenticated || !tokens) {
    throw redirect('/login');
  }

  return null;
};

// Redirect if already authenticated
const requireGuest = async () => {
  const { isAuthenticated } = useAuthStore.getState();

  if (isAuthenticated) {
    throw redirect('/');
  }

  return null;
};

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    loader: requireGuest,
    lazy: () => import('./pages/LoginPage').then(m => ({ Component: m.LoginPage })),
  },
  {
    path: '/register',
    loader: requireGuest,
    lazy: () => import('./pages/RegisterPage').then(m => ({ Component: m.RegisterPage })),
  },
  {
    path: '/forgot-password',
    loader: requireGuest,
    lazy: () => import('./pages/ForgotPasswordPage').then(m => ({ Component: m.ForgotPasswordPage })),
  },
  {
    path: '/reset-password',
    lazy: () => import('./pages/ResetPasswordPage').then(m => ({ Component: m.ResetPasswordPage })),
  },
  {
    path: '/verify-email',
    lazy: () => import('./pages/VerifyEmailPage').then(m => ({ Component: m.VerifyEmailPage })),
  },

  // Protected routes with layout
  {
    path: '/',
    loader: requireAuth,
    lazy: () => import('./components/layout/Layout').then(m => ({ Component: m.Layout })),
    children: [
      {
        index: true,
        loader: async () => {
          const [channelsRes, usersRes] = await Promise.all([
            channelsApi.getUserChannels(),
            usersApi.getAll({ limit: 5, sort: 'lastLogin', order: 'DESC' }),
          ]);
          return {
            channels: channelsRes.data?.channels || [],
            recentUsers: usersRes.data || [],
            totalUsers: usersRes.meta?.total || 0,
          };
        },
        lazy: () => import('./pages/HomePage').then(m => ({ Component: m.HomePage })),
      },
      {
        path: 'channels',
        loader: async () => {
          const [userChannelsRes, allChannelsRes] = await Promise.all([
            channelsApi.getUserChannels(),
            channelsApi.getAll({ limit: 50 }),
          ]);
          return {
            userChannels: userChannelsRes.data?.channels || [],
            allChannels: allChannelsRes.data || [],
          };
        },
        lazy: () => import('./pages/ChannelsPage').then(m => ({ Component: m.ChannelsPage })),
      },
      {
        path: 'channels/new',
        action: async ({ request }: ActionFunctionArgs) => {
          const formData = await request.formData();
          const data = {
            name: formData.get('name') as string,
            description: formData.get('description') as string || undefined,
            isPrivate: formData.get('isPrivate') === 'true',
          };

          const response = await channelsApi.create(data);
          if (response.data?.channel) {
            throw redirect(`/channels/${response.data.channel.id}`);
          }
          return { error: 'Failed to create channel' };
        },
        lazy: () => import('./pages/CreateChannelPage').then(m => ({ Component: m.CreateChannelPage })),
      },
      {
        path: 'channels/:channelId',
        loader: async ({ params }: LoaderFunctionArgs) => {
          const channelId = Number(params.channelId);
          const [channelRes, messagesRes] = await Promise.all([
            channelsApi.getById(channelId),
            messagesApi.getChannelMessages(channelId, { limit: 50 }),
          ]);

          if (!channelRes.data?.channel) {
            throw redirect('/channels');
          }

          return {
            channel: channelRes.data.channel,
            messages: messagesRes.data?.messages?.reverse() || [],
          };
        },
        action: async ({ request, params }: ActionFunctionArgs) => {
          const formData = await request.formData();
          const intent = formData.get('intent');
          const channelId = Number(params.channelId);

          if (intent === 'send-message') {
            const content = formData.get('content') as string;
            await messagesApi.create({ content, channelId });
            return { success: true };
          }

          if (intent === 'delete-message') {
            const messageId = Number(formData.get('messageId'));
            await messagesApi.delete(messageId);
            return { success: true };
          }

          return null;
        },
        lazy: () => import('./pages/ChannelPage').then(m => ({ Component: m.ChannelPage })),
      },
      {
        path: 'users',
        loader: async ({ request }: LoaderFunctionArgs) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search') || undefined;
          const department = url.searchParams.get('department') || undefined;
          const role = url.searchParams.get('role') || undefined;
          const sort = url.searchParams.get('sort') || undefined;
          const order = (url.searchParams.get('order') as 'ASC' | 'DESC' | null) || undefined;

          const [usersRes, departmentsRes] = await Promise.all([
            usersApi.getAll({ search, department, role, sort, order, limit: 20 }),
            usersApi.getDepartments(),
          ]);

          return {
            users: usersRes.data || [],
            pagination: usersRes.meta,
            departments: departmentsRes.data?.departments || [],
          };
        },
        lazy: () => import('./pages/UsersPage').then(m => ({ Component: m.UsersPage })),
      },
      {
        path: 'users/:userId',
        loader: async ({ params }: LoaderFunctionArgs) => {
          const userId = Number(params.userId);
          const response = await usersApi.getById(userId);

          if (!response.data?.user) {
            throw redirect('/users');
          }

          return { user: response.data.user };
        },
        lazy: () => import('./pages/UserProfilePage').then(m => ({ Component: m.UserProfilePage })),
      },
      {
        path: 'profile',
        loader: async () => {
          const response = await authApi.getProfile();
          return { user: response.data?.user };
        },
        action: async ({ request }: ActionFunctionArgs) => {
          const formData = await request.formData();
          const intent = formData.get('intent');
          const { user } = useAuthStore.getState();

          if (!user) return { error: 'Not authenticated' };

          if (intent === 'update-profile') {
            const data = {
              firstName: formData.get('firstName') as string,
              lastName: formData.get('lastName') as string,
              bio: formData.get('bio') as string || undefined,
              phone: formData.get('phone') as string || undefined,
              location: formData.get('location') as string || undefined,
            };

            const response = await usersApi.update(user.id, data);
            if (response.data?.user) {
              useAuthStore.getState().updateUser(response.data.user);
              return { success: true };
            }
          }

          if (intent === 'change-password') {
            const currentPassword = formData.get('currentPassword') as string;
            const newPassword = formData.get('newPassword') as string;

            await authApi.changePassword(currentPassword, newPassword);
            return { success: true, message: 'Password changed' };
          }

          return null;
        },
        lazy: () => import('./pages/ProfilePage').then(m => ({ Component: m.ProfilePage })),
      },
      {
        path: 'settings',
        lazy: () => import('./pages/SettingsPage').then(m => ({ Component: m.SettingsPage })),
      },
    ],
  },

  // Catch all
  {
    path: '*',
    loader: () => redirect('/'),
  },
]);
