import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch, API_BASE_URL } from '../../src/config/api';
import { supabase } from '../../src/config/supabase';
import { useAuth } from '../_layout';

export default function PayrollsPage() {
  const { profile } = useAuth();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const qs: string[] = [];
      if (month) qs.push(`month=${encodeURIComponent(month)}`);
      if (year) qs.push(`year=${encodeURIComponent(year)}`);
      const query = qs.length ? `?${qs.join('&')}` : '';
      const data = await apiFetch(`/payroll/history${query}`);
      setPayrolls(data || []);
    } catch (err: any) {
      console.warn('Failed to load payrolls', err.message || err);
      Alert.alert('Error', err.message || 'Failed to load payrolls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayrolls(); }, []);

  const exportCsv = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(`${API_BASE_URL}/payroll/${id}/export?format=csv`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!resp.ok) throw new Error(`Export failed: ${resp.statusText}`);
      const text = await resp.text();
      // For now, just show a confirmation with size — downloading in-app requires native FS
      Alert.alert('CSV Exported', `Received ${text.length} bytes. Paste content elsewhere to save.`);
    } catch (err: any) {
      console.warn('Export error', err);
      Alert.alert('Export failed', err.message || 'Failed to export CSV');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Payroll History</Text>

      <View style={styles.filterRow}>
        <TextInput placeholder="Month (1-12)" keyboardType="numeric" style={styles.input} value={month} onChangeText={setMonth} />
        <TextInput placeholder="Year (e.g. 2026)" keyboardType="numeric" style={styles.input} value={year} onChangeText={setYear} />
        <TouchableOpacity style={styles.btn} onPress={fetchPayrolls}><Text style={styles.btnText}>Filter</Text></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : payrolls.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>No payrolls found.</Text></View>
      ) : (
        payrolls.map(p => (
          <View key={p.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{p.profile?.name || profile?.name}</Text>
              <Text style={styles.amount}>₹{p.net_salary}</Text>
            </View>
            <Text style={styles.meta}>Period: {p.month}/{p.year} • Status: {p.status}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => exportCsv(p.id)} style={styles.linkBtn}><Text style={styles.linkText}>Export CSV</Text></TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontFamily: 'Outfit', fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, backgroundColor: Colors.inputBg, padding: 10, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  btn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: Colors.onPrimary, fontWeight: '700' },
  empty: { padding: 18, backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary },
  card: { backgroundColor: Colors.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: 'Outfit', fontSize: 16, fontWeight: '700', color: Colors.text },
  amount: { fontFamily: 'Outfit', fontSize: 16, fontWeight: '700', color: Colors.success },
  meta: { marginTop: 6, color: Colors.textSecondary, fontSize: 12 },
  cardActions: { marginTop: 8, flexDirection: 'row' },
  linkBtn: { marginRight: 12 },
  linkText: { color: Colors.primary, fontWeight: '700' },
});
