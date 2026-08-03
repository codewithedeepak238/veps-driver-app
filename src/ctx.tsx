import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setAuthToken } from '@/lib/api';
import { registerForPush } from '@/lib/push';

const TOKEN_KEY = 'veps_driver_token';
const PROFILE_KEY = 'veps_driver_profile';

export type Role = 'DRIVER' | 'MECHANIC';

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  address: string;
  isActive: boolean;
  cityId: string;
  dateOfJoining?: string | null;
}

// Back-compat alias — driver screens import `Driver`.
export type Driver = AppUser;

interface StoredProfile {
  role: Role;
  user: AppUser;
}

interface SessionValue {
  session: string | null; // the JWT
  role: Role | null;
  user: AppUser | null;
  driver: AppUser | null; // alias of `user` for existing driver screens
  isLoading: boolean; // true while restoring the session from storage
  signIn: (phone: string, password: string, remember?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<SessionValue>({
  session: null,
  role: null,
  user: null,
  driver: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function useSession() {
  return use(AuthContext);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore any persisted session on launch.
  useEffect(() => {
    (async () => {
      try {
        const [token, profileRaw] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(PROFILE_KEY),
        ]);
        if (token) {
          setAuthToken(token);
          setSession(token);
          if (profileRaw) {
            const parsed = JSON.parse(profileRaw);
            // Support both the new shape ({role,user}) and the legacy driver object.
            if (parsed && parsed.role && parsed.user) {
              setRole(parsed.role as Role);
              setUser(parsed.user as AppUser);
              registerForPush(parsed.role as Role);
            } else {
              setRole('DRIVER');
              setUser(parsed as AppUser);
              registerForPush('DRIVER');
            }
          } else {
            setRole('DRIVER');
          }
        }
      } catch (err) {
        console.warn('Failed to restore session', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = async (phone: string, password: string, remember = true) => {
    const res = await api.post('/auth/login', { phone, password });
    const token: string = res.data.token;
    const nextRole: Role = res.data.data.role;
    const nextUser: AppUser = res.data.data.user;

    setAuthToken(token);
    setSession(token);
    setRole(nextRole);
    setUser(nextUser);

    // Only persist across app restarts when "Remember me" is on; otherwise keep
    // the session in memory for this run and clear any previously saved session.
    const profile: StoredProfile = { role: nextRole, user: nextUser };
    if (remember) {
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, token),
        SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile)),
      ]);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(PROFILE_KEY),
      ]);
    }

    registerForPush(nextRole); // best-effort push registration
  };

  const signOut = async () => {
    setAuthToken(null);
    setSession(null);
    setRole(null);
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(PROFILE_KEY),
    ]);
  };

  return (
    <AuthContext value={{ session, role, user, driver: user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext>
  );
}
