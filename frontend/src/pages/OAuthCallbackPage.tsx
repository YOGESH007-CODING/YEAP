/**
 * src/pages/OAuthCallbackPage.tsx
 *
 * Handles the redirect back from OAuth sign-in.
 *
 * The backend passes the access token and base64url-encoded user object via
 * query params so the initial session bootstrap doesn't depend on a cross-site
 * cookie surviving the redirect (which mobile Safari ITP and some Android
 * browsers block).
 *
 * Flow:
 *  1. Read `token` and `user` query params
 *  2. Decode the user object
 *  3. Sign in via AuthContext
 *  4. Strip the sensitive params from the URL and navigate to /dashboard
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import type { AuthUser } from '../lib/auth';

function decodeUser(encoded: string): AuthUser | null {
  try {
    // base64url → JSON → AuthUser
    const json = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(json) as AuthUser;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function OAuthCallbackPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userParam = params.get('user');

    if (!token || !userParam) {
      navigate('/login?oauthError=missing_token', { replace: true });
      return;
    }

    const user = decodeUser(userParam);
    if (!user) {
      navigate('/login?oauthError=oauth_sign_in_failed', { replace: true });
      return;
    }

    api.setAccessToken(token);
    signIn({ accessToken: token, user });

    // Clean sensitive data out of the URL before navigating
    window.history.replaceState({}, '', '/oauth-callback');
    navigate('/dashboard', { replace: true });
  }, [signIn, navigate]);

  return null;
}
