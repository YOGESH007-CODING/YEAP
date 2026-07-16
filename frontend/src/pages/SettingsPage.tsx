import { useState } from 'react';
import { User, Code, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';

export function SettingsPage() {
  const { user } = useAuth();
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    try {
      await api.patch('/api/auth/profile', { leetcodeUsername });
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save username');
    }
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="border-b-4 border-[#111] pb-4 mb-8">
        <h1 className="font-display text-3xl lg:text-5xl font-black text-[#111]">Settings</h1>
        <p className="font-body text-sm text-[#737373] mt-1">Profile and preferences</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Profile */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="border border-[#111] h-12 w-12 flex items-center justify-center">
              <User size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Profile</h2>
              <p className="font-data text-[10px] uppercase tracking-widest text-[#737373]">Google Account</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="font-data text-[10px] uppercase tracking-widest text-[#737373]">Name</span>
              <p className="font-body text-sm mt-1">{user?.name || 'Dev User'}</p>
            </div>
            <div>
              <span className="font-data text-[10px] uppercase tracking-widest text-[#737373]">Email</span>
              <p className="font-body text-sm mt-1">{user?.email || 'dev@local'}</p>
            </div>
            <div>
              <span className="font-data text-[10px] uppercase tracking-widest text-[#737373]">User ID</span>
              <p className="font-data text-xs mt-1 text-[#737373]">{user?.id || '—'}</p>
            </div>
          </div>
        </Card>

        {/* LeetCode */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="border border-[#111] h-12 w-12 flex items-center justify-center">
              <Code size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">LeetCode</h2>
              <p className="font-data text-[10px] uppercase tracking-widest text-[#737373]">Account Link</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="LeetCode Username"
              value={leetcodeUsername}
              onChange={(e) => setLeetcodeUsername(e.target.value)}
              placeholder="e.g. Your_LeetCode_User_Id "
            />
            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={handleSave}>
                Save Username
              </Button>
              {saved && (
                <span className="font-data text-[10px] uppercase tracking-widest text-green-600">
                  ✓ Saved
                </span>
              )}
              {error && <span className="text-sm text-[#CC0000]">{error}</span>}
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card inverted>
          <div className="flex items-center gap-3 mb-6">
            <div className="border border-[#F9F9F7] h-12 w-12 flex items-center justify-center">
              <AlertTriangle size={20} strokeWidth={1.5} className="text-[#CC0000]" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#F9F9F7]">Danger Zone</h2>
              <p className="font-data text-[10px] uppercase tracking-widest text-[#A3A3A3]">Irreversible Actions</p>
            </div>
          </div>

          <p className="font-body text-sm text-[#A3A3A3] mb-4">
            These actions are permanent and cannot be undone. Proceed with caution.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button variant="danger" disabled>
              Reset All Progress
            </Button>
            <Button variant="danger" disabled>
              Delete Account
            </Button>
          </div>
          <p className="font-data text-[10px] uppercase tracking-widest text-[#A3A3A3] mt-3">
            Disabled until backend endpoints are built
          </p>
        </Card>
      </div>
    </div>
  );
}
