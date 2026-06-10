import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/config/supabase';
import { apiFetch } from '../src/config/api';
import { Colors } from '../src/theme/colors';

// Define the Auth Context structure
interface AuthContextType {
  user: any | null;
  profile: any | null;
  isLoading: boolean;
  loginProfile: (profileData: any) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  loginProfile: () => {},
  refreshProfile: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const fetchProfile = async () => {
    try {
      const data = await apiFetch('/auth/me');
      setProfile(data);
    } catch (err: any) {
      if (err.message === 'Profile not found. Please complete registration.') {
        setProfile(null);
        return;
      }
      console.log('Error fetching profile:', err.message);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile();
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsLoading(false);
  };

  const loginProfile = (profileData: any) => {
    setProfile(profileData);
  };

  // Set up auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoading(true);
        fetchProfile().finally(() => setIsLoading(false));
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle routing based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth' || segments.length === 0;
    const hasSession = !!user;
    const hasProfile = !!profile;

    if (!hasSession) {
      // Direct user to auth screen if not signed in
      if (segments[0] !== 'auth') {
        router.replace('/auth');
      }
    } else if (!hasProfile) {
      // Direct user to register details if signed in but no profile exists
      if (segments[0] !== 'auth' || !segments.includes('register')) {
        router.replace('/auth?step=register');
      }
    } else {
      // User is fully logged in and has profile
      const role = profile.role; // 'EMPLOYER' or 'EMPLOYEE'
      const inCorrectGroup = segments[0] === `(${role.toLowerCase()})`;

      if (!inCorrectGroup) {
        if (role === 'EMPLOYER') {
          router.replace('/(employer)');
        } else {
          router.replace('/(employee)');
        }
      }
    }
  }, [user, profile, isLoading, segments]);

  const statusBarStyle = 'dark';

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}> 
        <ActivityIndicator size="large" color={Colors.primary} />
        <StatusBar style={statusBarStyle} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, profile, isLoading, loginProfile, refreshProfile, logout }}>
        <View style={[styles.appShell, { backgroundColor: Colors.background }]}> 
          <Slot />
        </View>
        <StatusBar style={statusBarStyle} />
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

// Simple Error Boundary to catch render errors and log them
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    return this.props.children as any;
  }
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    minHeight: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
