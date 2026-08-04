import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Code, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function SettingsPage() {
  const { user, token, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leetcodeUsername, setLeetcodeUsername] = useState(user?.leetcodeUsername || '');
  const [isEditing, setIsEditing] = useState(!user?.leetcodeUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(searchParams.get('accountDeletion') === 'reauthenticated');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.leetcodeUsername) {
      setLeetcodeUsername(user.leetcodeUsername);
      setIsEditing(false);
    } else {
      setLeetcodeUsername('');
      setIsEditing(true);
    }
  }, [user?.leetcodeUsername]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leetcodeUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const res = await api.patch<{ success: boolean; data: typeof user }>('/api/auth/profile', {
        leetcodeUsername: leetcodeUsername.trim(),
      });
      if (res.success && res.data && token) {
        signIn({ accessToken: token, user: res.data });
        setSaved(true);
        setIsEditing(false);
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') { setDeleteError('Type DELETE to confirm.'); return; }
    if (user?.provider === 'LOCAL' && !deletePassword) { setDeleteError('Enter your password to continue.'); return; }
    setDeleting(true); setDeleteError(null);
    try {
      await api.delete<void>('/api/auth/delete-account', user?.provider === 'LOCAL' ? { password: deletePassword } : undefined);
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete account.');
    } finally { setDeleting(false); }
  };

  const beginOAuthDeletionReauth = async () => {
    setDeleting(true); setDeleteError(null);
    try {
      const response = await api.post<{ success: boolean; data: { authorizationUrl: string } }>('/api/auth/delete-account/reauth', {});
      window.location.assign(response.data.authorizationUrl);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to start reauthentication.');
      setDeleting(false);
    }
  };

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

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {!isEditing && user?.leetcodeUsername ? (
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">Linked Username</span>
                  <span className="text-sm font-medium text-[#EDEDEF] mt-0.5">{user.leetcodeUsername}</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#5E6AD2]/10 text-[#8B94E5] border border-[#5E6AD2]/20 uppercase tracking-wider font-mono">
                  Connected
                </span>
              </div>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Change Username
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="LeetCode Username"
                value={leetcodeUsername}
                onChange={(e) => setLeetcodeUsername(e.target.value)}
                placeholder="e.g. your_leetcode_username"
                disabled={loading}
                required
              />
              <div className="flex items-center gap-3">
                <Button type="submit" variant="secondary" disabled={loading}>
                  {loading ? 'Saving...' : user?.leetcodeUsername ? 'Save Username' : 'Link Account'}
                </Button>
                {user?.leetcodeUsername && (
                  <Button type="button" variant="ghost" onClick={() => {
                    setLeetcodeUsername(user.leetcodeUsername || '');
                    setIsEditing(false);
                    setError(null);
                  }} disabled={loading}>
                    Cancel
                  </Button>
                )}
                {saved && <span className="font-mono text-[10px] text-green-400">✓ Saved</span>}
              </div>
            </form>
          )}
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
            <Button variant="danger" onClick={() => { setDeleteOpen(true); setDeleteError(null); }}>Delete Account</Button>
          </div>
          <p className="font-mono text-[10px] text-white/20 mt-3">Account deletion is permanent. Your personal progress and sessions will be removed.</p>

          {deleteOpen && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-red-300">Confirm account deletion</h3>
              <p className="text-xs text-red-200/80">This signs you out everywhere and cannot be undone.</p>
              {deleteError && <p role="alert" className="text-xs text-red-300">{deleteError}</p>}
              {user?.provider === 'LOCAL' ? (
                <Input label="Current password" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} disabled={deleting} autoComplete="current-password" />
              ) : (
                <p className="text-xs text-red-200/80">First confirm your identity again with {user?.provider === 'GOOGLE' ? 'Google' : 'GitHub'}.</p>
              )}
              <Input label="Type DELETE to confirm" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} disabled={deleting} autoComplete="off" />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" disabled={deleting} onClick={() => setDeleteOpen(false)}>Cancel</Button>
                {user?.provider === 'LOCAL' || searchParams.get('accountDeletion') === 'reauthenticated' ? (
                  <Button type="button" variant="danger" disabled={deleting || deleteConfirmation !== 'DELETE'} onClick={deleteAccount}>{deleting ? 'Deleting...' : 'Permanently Delete Account'}</Button>
                ) : (
                  <Button type="button" variant="danger" disabled={deleting} onClick={beginOAuthDeletionReauth}>{deleting ? 'Redirecting...' : 'Reauthenticate to Continue'}</Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
