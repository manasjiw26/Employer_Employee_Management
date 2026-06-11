import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../src/config/supabase';
import { apiFetch } from '../src/config/api';
import { Colors } from '../src/theme/colors';
import { useAuth } from './_layout';

export default function AuthScreen() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  const { user, loginProfile, refreshProfile } = useAuth();
  const router = useRouter();

  // Mode: 'signin' | 'signup' | 'register'
  const [mode, setMode] = useState<'signin' | 'signup' | 'register'>('signin');

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'EMPLOYER' | 'EMPLOYEE'>('EMPLOYEE');
  const [companyName, setCompanyName] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [jiraAccountId, setJiraAccountId] = useState('');
  const [jiraDisplayName, setJiraDisplayName] = useState('');

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync mode with search param (e.g. if root layout redirects to complete registration)
  useEffect(() => {
    if (step === 'register' || (user && !loading)) {
      setMode('register');
    } else {
      setMode('signin');
    }
  }, [step, user]);

  const handleAuth = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const setSessionFromResponse = async (session: any) => {
      if (!session?.access_token) return;
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
      });
      await refreshProfile();
    };

    try {
      if (mode === 'signup') {
        // Call backend signup endpoint
        const signupData = await apiFetch('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email: trimmedEmail, password }),
        });

        if (signupData.session?.access_token) {
          await setSessionFromResponse(signupData.session);
        } else {
          // If signup response did not include a session, sign in immediately
          const signinData = await apiFetch('/auth/signin', {
            method: 'POST',
            body: JSON.stringify({ email: trimmedEmail, password }),
          });
          await setSessionFromResponse(signinData.session);
        }

        Alert.alert('Success', 'Account created! Please complete your profile details.');
        setMode('register');
      } else {
        // Call backend signin endpoint
        const signinData = await apiFetch('/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email: trimmedEmail, password }),
        });
        
        // Store the session in the Supabase client so auth state persists
        await setSessionFromResponse(signinData.session);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterProfile = async () => {
    if (!name) {
      setErrorMessage('Please enter your name');
      return;
    }
    if (role === 'EMPLOYER' && !companyName) {
      setErrorMessage('Please enter your company name');
      return;
    }
    if (role === 'EMPLOYEE' && !registrationCode) {
      setErrorMessage('Please enter the company registration code');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        name,
        role,
        companyName: role === 'EMPLOYER' ? companyName : undefined,
        registrationCode: role === 'EMPLOYEE' ? registrationCode.trim().toUpperCase() : undefined,
        jiraAccountId: jiraAccountId.trim() || undefined,
        jiraDisplayName: jiraDisplayName.trim() || undefined,
      };

      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Update global context with registered profile
      loginProfile(data.profile);

      Alert.alert('Success', 'Profile completed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (data.profile.role === 'EMPLOYER') {
              router.replace('/(employer)');
            } else {
              router.replace('/(employee)');
            }
          },
        },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Profile completion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>TalentSphere</Text>
          <Text style={styles.subtitle}>
            {mode === 'signin' && 'Welcome back! Log in to manage tasks & rewards.'}
            {mode === 'signup' && 'Create an account to join your company.'}
            {mode === 'register' && 'Tell us a bit more to set up your profile.'}
          </Text>

          {mode !== 'register' && (
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentButton, mode === 'signin' && styles.segmentButtonActive]}
                onPress={() => setMode('signin')}
              >
                <Text style={[styles.segmentText, mode === 'signin' && styles.segmentTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, mode === 'signup' && styles.segmentButtonActive]}
                onPress={() => setMode('signup')}
              >
                <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'register' ? <Text style={styles.formHeader}>Complete Your Profile</Text> : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {mode !== 'register' ? (
            /* SIGN IN / SIGN UP FORM */
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@company.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.buttonText}>{mode === 'signin' ? 'Log In' : 'Sign Up'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                style={styles.toggleContainer}
              >
                <Text style={styles.toggleText}>
                  {mode === 'signin'
                    ? "Don't have an account? Sign Up"
                    : 'Already have an account? Log In'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* PROFILE REGISTRATION FORM */
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jane Doe"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>I am an...</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'EMPLOYEE' && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole('EMPLOYEE')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'EMPLOYEE' && styles.roleButtonTextActive,
                      ]}
                    >
                      Employee
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'EMPLOYER' && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole('EMPLOYER')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'EMPLOYER' && styles.roleButtonTextActive,
                      ]}
                    >
                      Employer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {role === 'EMPLOYER' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Company Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Acme Corp"
                    placeholderTextColor={Colors.textMuted}
                    value={companyName}
                    onChangeText={setCompanyName}
                  />
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Company Registration Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="X4Y9Z2"
                    placeholderTextColor={Colors.textMuted}
                    value={registrationCode}
                    onChangeText={setRegistrationCode}
                    autoCapitalize="characters"
                  />
                  <Text style={styles.hintText}>
                    Ask your employer for the 6-character registration code.
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Jira Account ID (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Atlassian accountId"
                  placeholderTextColor={Colors.textMuted}
                  value={jiraAccountId}
                  onChangeText={setJiraAccountId}
                  autoCapitalize="none"
                />
                <Text style={styles.hintText}>
                  Add this if you want assigned tasks to sync with Jira.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Jira Display Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jane Doe"
                  placeholderTextColor={Colors.textMuted}
                  value={jiraDisplayName}
                  onChangeText={setJiraDisplayName}
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleRegisterProfile} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.buttonText}>Complete Registration</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  supabase.auth.signOut();
                  setMode('signin');
                }}
                style={styles.toggleContainer}
              >
                <Text style={styles.toggleText}>Cancel & Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.glass,
    borderRadius: 28,
    padding: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontFamily: 'Outfit',
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Outfit',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: Colors.onPrimary,
  },
  formHeader: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 15,
  },
  hintText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  buttonText: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  toggleContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '500',
  },
  errorText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBg,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
  },
  roleButtonText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  roleButtonTextActive: {
    color: Colors.onPrimary,
  },
});
