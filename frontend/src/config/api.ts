import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const expoExtra = Constants.expoConfig?.extra as Record<string, string> | undefined;
const LOCAL_IP =
  expoExtra?.EXPO_PUBLIC_API_HOST ||
  process.env.EXPO_PUBLIC_API_HOST ||
  'localhost';

export const API_BASE_URL =
  expoExtra?.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  Platform.select({
    android: `http://10.0.2.2:5000/api`, // Map localhost for Android Emulator
    ios: `http://${LOCAL_IP}:5000/api`,
    default: `http://localhost:5000/api`,
  });

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  // Only try to get token if not a signup/signin request
  let token: string | undefined;
  
  if (!endpoint.includes('/auth/signup') && !endpoint.includes('/auth/signin')) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;
      if (!token) console.warn('[apiFetch] No access token found in session');
    } catch (err) {
      console.warn('Failed to get session token:', err);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value: string, key: string) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      for (const [key, value] of options.headers) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, options.headers);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!response.ok) {
    console.error(`[apiFetch] ${endpoint} failed`, {
      status: response.status,
      statusText: response.statusText,
      response: text,
      parsed: json,
    });
    throw new Error(json?.error || `Request failed with status ${response.status}`);
  }

  return json;
};
