import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Code,
  Share2,
  Copy,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
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
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareTrackerId, setShareTrackerId] = useState<string | null>(null);
  const [trackers, setTrackers] = useState<{ id: string; companyName: string }[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void Promise.all([
      api.get<{ success: boolean; data: { enabled: boolean; shareUrl: string | null; trackerId: string | null } }>(
        '/api/share/settings'
      ),
      api.get<{ success: boolean; data: { trackers: { id: string; companyName: string }[] } }>('/api/trackers'),
    ])
      .then(([share, trackerResult]) => {
        setShareEnabled(share.data.enabled);
        setShareUrl(share.data.shareUrl);
        setShareTrackerId(share.data.trackerId);
        setTrackers(trackerResult.data.trackers);
      })
      .catch(() => {});
  }, []);

  const updateSharing = async (enabled: boolean) => {
    setSharing(true);
    try {
      const res = await api.patch<{ success: boolean; data: { enabled: boolean; shareUrl: string | null } }>(
        '/api/share/settings',
        { enabled, trackerId: shareTrackerId }
      );
      setShareEnabled(res.data.enabled);
      setShareUrl(res.data.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update sharing settings.');
    } finally {
      setSharing(false);
    }
  };

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
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE to confirm.');
      return;
    }
    if (user?.provider === 'LOCAL' && !deletePassword) {
      setDeleteError('Enter your password to continue.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete<void>(
        '/api/auth/delete-account',
        user?.provider === 'LOCAL' ? { password: deletePassword } : undefined
      );
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  const beginOAuthDeletionReauth = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await api.post<{ success: boolean; data: { authorizationUrl: string } }>(
        '/api/auth/delete-account/reauth',
        {}
      );
      window.location.assign(response.data.authorizationUrl);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to start reauthentication.');
      setDeleting(false);
    }
  };

  const handleCopyShare = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 py-8 sm:px-6 lg:py-10">
      {/* Page Header */}
      <header className="mb-6 border-b border-white/[0.08] pb-4">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#F3F4F6] tracking-tight">
          System Configuration
        </h1>
        <p className="font-mono text-xs text-[#8A8F98] mt-1">
          Manage integration telemetry, public visibility, and core account parameters.
        </p>
      </header>

      <div className="space-y-5">
        {/* Section 1: Identity Payload */}
        <Card className="p-5 sm:p-6 noise-bg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
              Identity Payload
            </h2>
            <span className="font-mono text-[10px] text-[#525866]">
              PROVIDER: {user?.provider || 'LOCAL'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-[#525866] uppercase tracking-wider">
                HANDLE / NAME
              </label>
              <input
                type="text"
                readOnly
                value={user?.name || 'Dev User'}
                className="w-full bg-[#0A0A0C] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs text-[#F3F4F6] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] text-[#525866] uppercase tracking-wider">
                PRIMARY EMAIL
              </label>
              <input
                type="email"
                readOnly
                value={user?.email || 'dev@yeap.srs'}
                className="w-full bg-[#0A0A0C] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs text-[#F3F4F6] outline-none"
              />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-[#525866] uppercase">Auth Token Version</span>
              <span className="font-mono text-[11px] text-[#8A8F98]">v2.4.0-stable</span>
            </div>
            <button
              onClick={() => {
                void signOut();
              }}
              className="font-mono text-[11px] text-[#8A8F98] hover:text-[#F3F4F6] bg-[#0A0A0C] border border-white/[0.08] px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound size={12} />
              <span>Rotate Session</span>
            </button>
          </div>
        </Card>

        {/* Section 2: Data Source Binding (LeetCode) */}
        <Card className="p-5 sm:p-6 noise-bg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Code size={16} className="text-[#bdc2ff]" />
              <h2 className="font-mono text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                Data Source Binding
              </h2>
            </div>
            {user?.leetcodeUsername && !isEditing && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#4bdcc6] bg-[#4bdcc6]/10 border border-[#4bdcc6]/30 px-2.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4bdcc6] animate-pulse" />
                <span>Connected: @{user.leetcodeUsername}</span>
              </div>
            )}
          </div>

          <p className="font-mono text-xs text-[#8A8F98] mb-4">
            Telemetry streams accepted submissions from your linked LeetCode profile into the SRS engine.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded bg-[#FF375F]/10 border border-[#FF375F]/30 text-[#FF375F] font-mono text-xs">
              {error}
            </div>
          )}

          {!isEditing && user?.leetcodeUsername ? (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Re-bind Profile Handle
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="LeetCode Username"
                value={leetcodeUsername}
                onChange={(e) => setLeetcodeUsername(e.target.value)}
                placeholder="e.g. neetcode_dev"
                disabled={loading}
                required
              />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Binding...' : user?.leetcodeUsername ? 'Update Binding' : 'Bind Profile'}
                </Button>
                {user?.leetcodeUsername && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setLeetcodeUsername(user.leetcodeUsername || '');
                      setIsEditing(false);
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                )}
                {saved && (
                  <span className="font-mono text-xs text-[#4bdcc6] flex items-center gap-1">
                    <CheckCircle2 size={13} /> Saved
                  </span>
                )}
              </div>
            </form>
          )}
        </Card>

        {/* Section 3: Public Sharing */}
        <Card className="p-5 sm:p-6 noise-bg">
          <div className="flex items-center gap-2 mb-3">
            <Share2 size={16} className="text-[#bdc2ff]" />
            <h2 className="font-mono text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
              Public Telemetry Card
            </h2>
          </div>

          <p className="font-mono text-xs text-[#8A8F98] mb-4">
            Publish a read-only progress badge showing your active streaks and solve counts.
          </p>

          <label className="flex items-center gap-2.5 font-mono text-xs text-[#F3F4F6] cursor-pointer">
            <input
              type="checkbox"
              checked={shareEnabled}
              disabled={sharing}
              onChange={(e) => void updateSharing(e.target.checked)}
              className="rounded border-white/[0.1] bg-[#0A0A0C] text-[#5e6ad2] focus:ring-0 cursor-pointer"
            />
            <span>Enable public sharing endpoint</span>
          </label>

          {shareEnabled && trackers.length > 0 && (
            <div className="mt-4">
              <label className="block font-mono text-[10px] uppercase text-[#8A8F98] mb-1">
                Company Target Highlight
              </label>
              <select
                value={shareTrackerId ?? ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setShareTrackerId(val);
                  void api.patch('/api/share/settings', { enabled: true, trackerId: val });
                }}
                className="w-full bg-[#0A0A0C] border border-white/[0.08] rounded p-2 font-mono text-xs text-[#F3F4F6] focus:border-[#bdc2ff] focus:outline-none"
              >
                <option value="">None (General Telemetry)</option>
                {trackers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {shareUrl && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                aria-label="Public share link"
                className="flex-1 bg-[#0A0A0C] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs text-[#8A8F98]"
              />
              <Button variant="secondary" onClick={handleCopyShare}>
                <Copy size={13} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          )}
        </Card>

        {/* Section 4: Danger Zone */}
        <Card className="p-5 sm:p-6 noise-bg border-[#FF375F]/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-[#FF375F]" />
            <h2 className="font-mono text-[11px] font-medium text-[#FF375F] uppercase tracking-wider">
              Irreversible Actions
            </h2>
          </div>

          <p className="font-mono text-xs text-[#8A8F98] mb-4">
            Account deletion purges your historical review intervals, progress telemetry, and account credentials.
          </p>

          <Button
            variant="danger"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteError(null);
            }}
          >
            Delete Account
          </Button>

          {deleteOpen && (
            <div className="mt-5 rounded border border-[#FF375F]/30 bg-[#FF375F]/[0.05] p-4 space-y-3">
              <h3 className="font-headline text-sm font-semibold text-[#FF375F]">
                Confirm Account Purge
              </h3>
              <p className="font-mono text-xs text-[#8A8F98]">
                This action is immediate and cannot be recovered.
              </p>

              {deleteError && (
                <p role="alert" className="font-mono text-xs text-[#FF375F]">
                  {deleteError}
                </p>
              )}

              {user?.provider === 'LOCAL' ? (
                <Input
                  label="Account Password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  disabled={deleting}
                  autoComplete="current-password"
                />
              ) : (
                <p className="font-mono text-xs text-[#8A8F98]">
                  Re-authentication required via {user?.provider === 'GOOGLE' ? 'Google' : 'GitHub'}.
                </p>
              )}

              <Input
                label="Type DELETE to confirm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                disabled={deleting}
                autoComplete="off"
                placeholder="DELETE"
              />

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={deleting}
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </Button>
                {user?.provider === 'LOCAL' || searchParams.get('accountDeletion') === 'reauthenticated' ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={deleting || deleteConfirmation !== 'DELETE'}
                    onClick={deleteAccount}
                  >
                    {deleting ? 'Purging...' : 'Permanently Delete'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={deleting}
                    onClick={beginOAuthDeletionReauth}
                  >
                    {deleting ? 'Redirecting...' : 'Reauthenticate to Delete'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
