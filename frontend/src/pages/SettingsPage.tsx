import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui';
import { Bell, Moon, Globe, Shield, LogOut, Save } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { usersApi } from '../api';
import type { User, UserPreferences } from '../types';

const DEFAULTS: UserPreferences = {
  theme: 'light',
  language: 'fr',
  notifications: { email: true, push: true, mentions: true, messages: true },
  privacy: { showEmail: false, showDepartment: true, showLastLogin: false },
};

export function SettingsPage() {
  const { user } = useLoaderData() as { user: User | null };
  const { logout, updateUser } = useAuthStore();

  const [prefs, setPrefs] = useState<UserPreferences>({
    ...DEFAULTS,
    ...user?.preferences,
    notifications: { ...DEFAULTS.notifications, ...user?.preferences?.notifications },
    privacy: { ...DEFAULTS.privacy, ...user?.preferences?.privacy },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setNotif = (k: keyof UserPreferences['notifications'], v: boolean) =>
    setPrefs((p) => ({ ...p, notifications: { ...p.notifications, [k]: v } }));
  const setPrivacy = (k: keyof UserPreferences['privacy'], v: boolean) =>
    setPrefs((p) => ({ ...p, privacy: { ...p.privacy, [k]: v } }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await usersApi.update(user.id, { preferences: prefs });
      if (res.data?.user) updateUser(res.data.user);
      setSaved(true);
    } catch {
      // erreur silencieuse
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">Enregistré ✓</span>}
          <Button onClick={save} isLoading={saving}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <Card padding="none">
        <CardHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-400" />
            <CardTitle>Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-4">
            <SettingToggle
              label="Notifications par email"
              description="Recevoir des notifications par email"
              checked={prefs.notifications.email}
              onChange={(v) => setNotif('email', v)}
            />
            <SettingToggle
              label="Notifications push"
              description="Recevoir des notifications dans le navigateur"
              checked={prefs.notifications.push}
              onChange={(v) => setNotif('push', v)}
            />
            <SettingToggle
              label="Mentions"
              description="Être notifié quand quelqu'un vous mentionne"
              checked={prefs.notifications.mentions}
              onChange={(v) => setNotif('mentions', v)}
            />
            <SettingToggle
              label="Messages directs"
              description="Être notifié pour les nouveaux messages directs"
              checked={prefs.notifications.messages}
              onChange={(v) => setNotif('messages', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Apparence */}
      <Card padding="none">
        <CardHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <Moon className="h-5 w-5 text-gray-400" />
            <CardTitle>Apparence</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Thème</p>
              <p className="text-sm text-gray-500">Choisir le thème de l'interface</p>
            </div>
            <select
              value={prefs.theme}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, theme: e.target.value as UserPreferences['theme'] }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Langue */}
      <Card padding="none">
        <CardHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-400" />
            <CardTitle>Langue</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Langue de l'interface</p>
              <p className="text-sm text-gray-500">Choisir la langue d'affichage</p>
            </div>
            <select
              value={prefs.language}
              onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Confidentialité */}
      <Card padding="none">
        <CardHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400" />
            <CardTitle>Confidentialité</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-4">
            <SettingToggle
              label="Afficher mon email"
              description="Permettre aux autres utilisateurs de voir mon email"
              checked={prefs.privacy.showEmail}
              onChange={(v) => setPrivacy('showEmail', v)}
            />
            <SettingToggle
              label="Afficher mon département"
              description="Afficher mon département sur mon profil"
              checked={prefs.privacy.showDepartment}
              onChange={(v) => setPrivacy('showDepartment', v)}
            />
            <SettingToggle
              label="Afficher ma dernière connexion"
              description="Montrer quand j'étais en ligne pour la dernière fois"
              checked={prefs.privacy.showLastLogin}
              onChange={(v) => setPrivacy('showLastLogin', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Zone de danger */}
      <Card padding="none" className="border-red-200">
        <CardHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <LogOut className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-600">Zone de danger</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Se déconnecter</p>
              <p className="text-sm text-gray-500">
                Vous serez déconnecté de tous vos appareils
              </p>
            </div>
            <Button variant="danger" onClick={() => logout()}>
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
      </label>
    </div>
  );
}
