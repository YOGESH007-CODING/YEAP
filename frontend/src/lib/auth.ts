/**
 * src/lib/auth.ts
 *
 * Auth context – provides user session state and sign-in/sign-out
 * methods to the React component tree via AuthContext.
 */

import { createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  leetcodeUsername?: string | null;
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
