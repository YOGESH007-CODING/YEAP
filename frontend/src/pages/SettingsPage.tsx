import { useState } from 'react';
import { User, Code, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function SettingsPage() {
  const { user } = useAuth();
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent">Settings</h1>
        <p className="text-sm text-[#8A8F98] mt-0.5">Profile and preferences</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Profile */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
              <User size={18} className="text-[#8A8F98]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#EDEDEF]">Profile</h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Account</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span className="font-mono text-[10px] uppercase tracking-widest text-white/30">Name</span><p className="text-sm text-[#EDEDEF] mt-0.5">{user?.name || 'Dev User'}</p></div>
            <div><span className="font-mono text-[10px] uppercase tracking-widest text-white/30">Email</span><p className="text-sm text-[#EDEDEF] mt-0.5">{user?.email || 'dev@local'}</p></div>
            <div><span className="font-mono text-[10px] uppercase tracking-widest text-white/30">User ID</span><p className="font-mono text-xs text-[#8A8F98] mt-0.5">{user?.id || '—'}</p></div>
          </div>
        </Card>

        {/* LeetCode */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
              <Code size={18} className="text-[#8A8F98]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#EDEDEF]">LeetCode</h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Account Link</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input label="LeetCode Username" value={leetcodeUsername} onChange={(e) => setLeetcodeUsername(e.target.value)} placeholder="e.g. YOGESH_SHARMA_1209" />
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleSave}>Save Username</Button>
              {saved && <span className="font-mono text-[10px] text-green-400">✓ Saved</span>}
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-red-500/20">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#EDEDEF]">Danger Zone</h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Irreversible</p>
            </div>
          </div>
          <p className="text-sm text-[#8A8F98] mb-4">These actions are permanent and cannot be undone.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled>Reset All Progress</Button>
            <Button variant="danger" disabled>Delete Account</Button>
          </div>
          <p className="font-mono text-[10px] text-white/20 mt-3">Disabled until backend endpoints are built</p>
        </Card>
      </div>
    </div>
  );
}
