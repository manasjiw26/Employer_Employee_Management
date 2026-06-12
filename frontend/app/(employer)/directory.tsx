import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { User, Shield, Trash2, X, Search } from 'lucide-react-native';
import { useAuth } from '../_layout';

export default function EmployeeDirectory() {
  const { profile: currentUserProfile } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal control
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [jiraAccountId, setJiraAccountId] = useState('');
  const [jiraDisplayName, setJiraDisplayName] = useState('');
  const [mappingJira, setMappingJira] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/employees');
      setEmployees(data);
    } catch (err: any) {
      console.log('Error fetching employees:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleUserSelect = (user: any) => {
    // Avoid actions on oneself
    if (user.id === currentUserProfile?.id) {
      Alert.alert('Info', 'This is your own profile. Actions are disabled.');
      return;
    }
    setSelectedUser(user);
    setJiraAccountId(user.jira_account_id || '');
    setJiraDisplayName(user.jira_display_name || user.name || '');
    setActionModalVisible(true);
  };

  const handleRoleChange = async (newRole: string) => {
    if (!selectedUser) return;
    try {
      await apiFetch(`/employees/${selectedUser.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      
      setEmployees(employees.map(emp => 
        emp.id === selectedUser.id ? { ...emp, role: newRole } : emp
      ));

      Alert.alert('Success', `Updated ${selectedUser.name}'s role to ${newRole}`);
      setActionModalVisible(false);
      setSelectedUser(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update role');
    }
  };

  const handleRemoveUser = () => {
    if (!selectedUser) return;

    Alert.alert(
      'Remove Staff',
      `Are you sure you want to remove ${selectedUser.name} from the company? This action is permanent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/employees/${selectedUser.id}`, {
                method: 'DELETE',
              });

              setEmployees(employees.filter(emp => emp.id !== selectedUser.id));

              Alert.alert('Success', `${selectedUser.name} has been removed.`);
              setActionModalVisible(false);
              setSelectedUser(null);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove employee');
            }
          },
        },
      ]
    );
  };

  const handleAutoMapJira = async () => {
    if (!selectedUser) return;

    setMappingJira(true);
    try {
      const mapped = await apiFetch(`/employees/${selectedUser.id}/jira/map`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      setEmployees(employees.map(emp =>
        emp.id === selectedUser.id ? { ...emp, ...mapped } : emp
      ));
      setSelectedUser({ ...selectedUser, ...mapped });
      setJiraAccountId(mapped.jira_account_id || '');
      setJiraDisplayName(mapped.jira_display_name || '');
      Alert.alert('Success', 'Jira account mapped from email.');
    } catch (err: any) {
      Alert.alert(
        'Jira Email Mapping Failed',
        `${err.message || 'Could not find Jira user by email'}\n\nPaste the Jira accountId manually below.`,
      );
    } finally {
      setMappingJira(false);
    }
  };

  const handleManualMapJira = async () => {
    if (!selectedUser) return;
    if (!jiraAccountId.trim()) {
      Alert.alert('Error', 'Please enter the Jira accountId.');
      return;
    }

    setMappingJira(true);
    try {
      const mapped = await apiFetch(`/employees/${selectedUser.id}/jira/map`, {
        method: 'POST',
        body: JSON.stringify({
          accountId: jiraAccountId.trim(),
          displayName: jiraDisplayName.trim() || selectedUser.name,
        }),
      });

      setEmployees(employees.map(emp =>
        emp.id === selectedUser.id ? { ...emp, ...mapped } : emp
      ));
      setSelectedUser({ ...selectedUser, ...mapped });
      Alert.alert('Success', 'Jira accountId saved to Supabase.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save Jira accountId');
    } finally {
      setMappingJira(false);
    }
  };

  const renderEmployeeItem = ({ item }: { item: any }) => {
    const isSelf = item.id === currentUserProfile?.id;

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleUserSelect(item)}
        activeOpacity={isSelf ? 1 : 0.7}
      >
        <View style={styles.profileRow}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User color={Colors.textSecondary} size={28} />
            </View>
          )}

          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{item.name}</Text>
              {isSelf && <Text style={styles.selfPill}>You</Text>}
            </View>
            <Text style={styles.emailText}>{item.email}</Text>
            
            <View style={styles.tagRow}>
              <View style={[
                styles.roleBadge,
                item.role === 'EMPLOYER' ? styles.roleEmployer : styles.roleEmployee
              ]}>
                <Text style={[
                  styles.roleText,
                  item.role === 'EMPLOYER' ? { color: Colors.primary } : { color: Colors.secondary }
                ]}>
                  {item.role}
                </Text>
              </View>
              {item.jira_account_id ? (
                <View style={styles.jiraBadge}>
                  <Text style={styles.jiraText}>Jira mapped</Text>
                </View>
              ) : (
                <View style={styles.jiraMissingBadge}>
                  <Text style={styles.jiraMissingText}>No Jira ID</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && employees.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      (emp.name && emp.name.toLowerCase().includes(query)) ||
      (emp.email && emp.email.toLowerCase().includes(query)) ||
      (emp.role && emp.role.toLowerCase().includes(query))
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color={Colors.textSecondary} size={18} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or role..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIconContainer}>
              <X color={Colors.textSecondary} size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployeeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No matching employees found.' : 'No employees found.'}
            </Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchEmployees}
      />

      {/* Action Sheet Modal */}
      {selectedUser && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={actionModalVisible}
          onRequestClose={() => setActionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manage Staff</Text>
                <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                  <X color={Colors.text} size={24} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalUser}>{selectedUser.name}</Text>
              <Text style={styles.modalEmail}>{selectedUser.email}</Text>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Change Role</Text>
              <View style={styles.roleOptions}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    selectedUser.role === 'EMPLOYEE' && styles.optionButtonActive
                  ]}
                  onPress={() => handleRoleChange('EMPLOYEE')}
                >
                  <User color={selectedUser.role === 'EMPLOYEE' ? Colors.onPrimary : Colors.textSecondary} size={20} />
                  <Text style={[
                    styles.optionText,
                    selectedUser.role === 'EMPLOYEE' && styles.optionTextActive
                  ]}>Employee</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    selectedUser.role === 'EMPLOYER' && styles.optionButtonActive
                  ]}
                  onPress={() => handleRoleChange('EMPLOYER')}
                >
                  <Shield color={selectedUser.role === 'EMPLOYER' ? Colors.onPrimary : Colors.textSecondary} size={20} />
                  <Text style={[
                    styles.optionText,
                    selectedUser.role === 'EMPLOYER' && styles.optionTextActive
                  ]}>Employer</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Jira Mapping</Text>
              <Text style={styles.helperText}>
                Auto-map uses the staff email. If Jira hides email addresses, paste the Atlassian accountId manually.
              </Text>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleAutoMapJira}
                disabled={mappingJira}
              >
                {mappingJira ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Auto-map by Email</Text>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Jira accountId"
                placeholderTextColor={Colors.textMuted}
                value={jiraAccountId}
                onChangeText={setJiraAccountId}
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Jira display name (optional)"
                placeholderTextColor={Colors.textMuted}
                value={jiraDisplayName}
                onChangeText={setJiraDisplayName}
              />

              <TouchableOpacity
                style={styles.saveJiraButton}
                onPress={handleManualMapJira}
                disabled={mappingJira}
              >
                {mappingJira ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.saveJiraButtonText}>Save Jira ID</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.removeButton} onPress={handleRemoveUser}>
                <Trash2 color={Colors.danger} size={20} />
                <Text style={styles.removeButtonText}>Remove Employee</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  clearIconContainer: {
    padding: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCol: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  selfPill: {
    fontFamily: 'Outfit',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: Colors.border,
    color: Colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  emailText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  roleEmployer: {
    backgroundColor: Colors.tagOrange,
  },
  roleEmployee: {
    backgroundColor: Colors.tagBlue,
  },
  roleText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '700',
  },
  jiraBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.tagGreen,
  },
  jiraText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },
  jiraMissingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.tagRed,
  },
  jiraMissingText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Outfit',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalUser: {
    fontFamily: 'Outfit',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  modalEmail: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  sectionTitle: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  roleOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helperText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 13,
    marginTop: 10,
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    backgroundColor: Colors.tagBlue,
  },
  secondaryButtonText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  saveJiraButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  saveJiraButtonText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 4,
  },
  optionButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  optionTextActive: {
    color: Colors.onPrimary,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tagRed,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  removeButtonText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
    marginLeft: 8,
  },
});
