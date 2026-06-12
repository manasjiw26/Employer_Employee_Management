import Constants from 'expo-constants';
import { supabase } from './supabase';

// IMPORTANT: The .env file only exists on the developer's machine.
// Vercel builds the app without it, so process.env vars will be empty
// unless explicitly added in Vercel Dashboard → Settings → Environment Variables.
// The PRODUCTION_API_URL below is the guaranteed fallback so the app NEVER
// falls back to localhost (which causes "load fail" on all phones/other devices).
const PRODUCTION_API_URL = 'https://employeremployeemanagement-production.up.railway.app/api';

const expoExtra = Constants.expoConfig?.extra as Record<string, string> | undefined;

export const API_BASE_URL: string =
  (expoExtra?.EXPO_PUBLIC_API_URL || '').trim() ||
  (process.env.EXPO_PUBLIC_API_URL || '').trim() ||
  PRODUCTION_API_URL;

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
