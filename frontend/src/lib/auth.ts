/**
 * src/lib/auth.ts
 *
 * Auth context + dev token helper.
 * In production, this would integrate with Google OAuth.
 * For now, supports the existing dev_<base64> token format.
 */

import { createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  signIn: (session: { accessToken: string; user: AuthUser }) => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  signIn: () => {},
  signOut: async () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);
