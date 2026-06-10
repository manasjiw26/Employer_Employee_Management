import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Edit2, LogOut, User } from 'lucide-react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { useAuth } from '../_layout';

export default function EmployerProfile() {
  const { profile, logout, refreshProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [editingName, setEditingName] = useState(profile?.name || '');
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const handleAvatarUpdate = async () => {
    if (!avatarUrl) {
      Alert.alert('Error', 'Please enter a valid image URL.');
      return;
    }

    setUploading(true);
    try {
      await apiFetch('/auth/me/avatar', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl }),
      });
      setAvatarUrl('');
      await refreshProfile();
      Alert.alert('Success', 'Profile photo updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editingName) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }

    setSavingName(true);
    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: editingName }),
      });
      await refreshProfile();
      Alert.alert('Success', 'Profile updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.profileHeaderCard}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User color={Colors.textSecondary} size={48} />
          </View>
        )}

        <Text style={styles.userName}>{profile?.name}</Text>
        <Text style={styles.userEmail}>{profile?.email}</Text>
        <Text style={styles.companyName}>{profile?.company?.name}</Text>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.settingsLabel}>Display Name</Text>
        <TextInput
          style={styles.settingsInput}
          value={editingName}
          onChangeText={setEditingName}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveName} disabled={savingName}>
          {savingName ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.settingsLabel}>Update Profile Photo URL</Text>
        <TextInput
          style={styles.settingsInput}
          placeholder="https://example.com/avatar.jpg"
          placeholderTextColor={Colors.textMuted}
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleAvatarUpdate} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <View style={styles.buttonContent}>
              <Edit2 color={Colors.onPrimary} size={16} />
              <Text style={styles.primaryButtonText}>Update Profile Photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <LogOut color={Colors.danger} size={18} />
        <Text style={styles.logoutText}>Logout Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  userName: {
    fontFamily: 'Outfit',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  userEmail: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  companyName: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 10,
  },
  settingsGroup: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  settingsLabel: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  settingsInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 13,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimary,
    marginLeft: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tagRed,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 16,
    padding: 16,
  },
  logoutText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
    marginLeft: 8,
  },
});
