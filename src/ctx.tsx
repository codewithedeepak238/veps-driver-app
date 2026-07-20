import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setAuthToken } from '@/lib/api';

const TOKEN_KEY = 'veps_driver_token';
const DRIVER_KEY = 'veps_driver_profile';

export interface Driver {
  id: string;
  employeeId: string;
  name: string;
  phone: string;
  address: string;
  isActive: boolean;
  cityId: string;
}

interface SessionValue {
  session: string | null; // the JWT
  driver: Driver | null;
  isLoading: boolean; // true while restoring the session from storage
  signIn: (employeeId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<SessionValue>({
  session: null,
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
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore any persisted session on launch.
  useEffect(() => {
    (async () => {
      try {
        const [token, profile] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(DRIVER_KEY),
        ]);
        if (token) {
          setAuthToken(token);
          setSession(token);
          if (profile) setDriver(JSON.parse(profile) as Driver);
        }
      } catch (err) {
        console.warn('Failed to restore session', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = async (employeeId: string, password: string) => {
    const res = await api.post('/driver/login', { employeeId, password });
    const token: string = res.data.token;
    const nextDriver: Driver = res.data.data.driver;

    setAuthToken(token);
    setSession(token);
    setDriver(nextDriver);

    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(DRIVER_KEY, JSON.stringify(nextDriver)),
    ]);
  };

  const signOut = async () => {
    setAuthToken(null);
    setSession(null);
    setDriver(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(DRIVER_KEY),
    ]);
  };

  return (
    <AuthContext value={{ session, driver, isLoading, signIn, signOut }}>
      {children}
    </AuthContext>
  );
}
