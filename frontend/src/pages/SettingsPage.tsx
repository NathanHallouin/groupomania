import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui';
import { Bell, Moon, Globe, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export function SettingsPage() {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

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
              defaultChecked
            />
            <SettingToggle
              label="Notifications push"
              description="Recevoir des notifications dans le navigateur"
              defaultChecked
            />
            <SettingToggle
              label="Mentions"
              description="Être notifié quand quelqu'un vous mentionne"
              defaultChecked
            />
            <SettingToggle
              label="Messages directs"
              description="Être notifié pour les nouveaux messages directs"
              defaultChecked
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card padding="none">
        <CardHeader className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <Moon className="h-5 w-5 text-gray-400" />
            <CardTitle>Apparence</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Thème</p>
                <p className="text-sm text-gray-500">Choisir le thème de l'interface</p>
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="light">Clair</option>
                <option value="dark">Sombre</option>
                <option value="system">Système</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
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
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
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
            />
            <SettingToggle
              label="Afficher mon département"
              description="Afficher mon département sur mon profil"
              defaultChecked
            />
            <SettingToggle
              label="Afficher ma dernière connexion"
              description="Montrer quand j'étais en ligne pour la dernière fois"
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
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
            <Button variant="danger" onClick={handleLogout}>
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
  defaultChecked?: boolean;
}

function SettingToggle({ label, description, defaultChecked }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
      </label>
    </div>
  );
}
