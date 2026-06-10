import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { DollarSign, ChevronDown, ChevronUp } from 'lucide-react-native';

export default function EmployerMore() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Section toggle states
  const [payrollOpen, setPayrollOpen] = useState(false);

  // Payroll Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1 + '');
  const [year, setYear] = useState(new Date().getFullYear() + '');
  const [baseSalary, setBaseSalary] = useState('3000');
  const [bonuses, setBonuses] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [creatingPayroll, setCreatingPayroll] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const employeeList = await apiFetch('/employees');
      setEmployees(employeeList.filter((emp: any) => emp.role === 'EMPLOYEE'));

      const payrollList = await apiFetch('/payroll');
      setPayrolls(payrollList);
    } catch (err: any) {
      console.log('Error fetching manager details:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePayroll = async () => {
    if (!selectedEmpId || !month || !year || !baseSalary) {
      Alert.alert('Error', 'Please fill in Employee, Month, Year, and Base Salary.');
      return;
    }

    setCreatingPayroll(true);
    try {
      const payload = {
        profile_id: selectedEmpId,
        month: parseInt(month),
        year: parseInt(year),
        base_salary: parseFloat(baseSalary),
        bonuses: parseFloat(bonuses) || 0,
        deductions: parseFloat(deductions) || 0,
      };

      const newPayroll = await apiFetch('/payroll', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setPayrolls([newPayroll, ...payrolls]);
      Alert.alert('Success', 'Payroll generated successfully!');
      
      // Reset form
      setBonuses('0');
      setDeductions('0');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create payroll');
    } finally {
      setCreatingPayroll(false);
    }
  };

  const handleMarkPaid = async (payrollId: string) => {
    try {
      await apiFetch(`/payroll/${payrollId}/pay`, {
        method: 'PATCH',
      });

      setPayrolls(payrolls.map(p => 
        p.id === payrollId ? { ...p, status: 'PAID' } : p
      ));

      Alert.alert('Success', 'Payroll marked as PAID!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update payroll status');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* PAYROLL MANAGER SECTION */}
      <TouchableOpacity 
        style={styles.accordionHeader} 
        onPress={() => setPayrollOpen(!payrollOpen)}
      >
        <View style={styles.accordionTitleRow}>
          <DollarSign color={Colors.primary} size={20} />
          <Text style={styles.accordionTitle}>Payroll Management</Text>
        </View>
        {payrollOpen ? <ChevronUp color={Colors.text} size={20} /> : <ChevronDown color={Colors.text} size={20} />}
      </TouchableOpacity>

      {payrollOpen && (
        <View style={styles.accordionContent}>
          <Text style={styles.sectionTitle}>Generate Monthly Payslip</Text>
          {loading && payrolls.length === 0 && employees.length === 0 ? (
            <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
          ) : null}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Staff</Text>
            <View style={styles.dropdown}>
              {employees.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  style={[
                    styles.employeeOption,
                    selectedEmpId === emp.id && styles.employeeOptionActive
                  ]}
                  onPress={() => setSelectedEmpId(emp.id)}
                >
                  <Text style={[
                    styles.employeeOptionText,
                    selectedEmpId === emp.id && styles.employeeOptionTextActive
                  ]}>{emp.name}</Text>
                </TouchableOpacity>
              ))}
              {employees.length === 0 && (
                <Text style={styles.errorText}>No employees to generate payroll for.</Text>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Month (1-12)</Text>
              <TextInput
                style={styles.input}
                value={month}
                onChangeText={setMonth}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Base Salary ($)</Text>
            <TextInput
              style={styles.input}
              value={baseSalary}
              onChangeText={setBaseSalary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Bonuses ($)</Text>
              <TextInput
                style={styles.input}
                value={bonuses}
                onChangeText={setBonuses}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Deductions ($)</Text>
              <TextInput
                style={styles.input}
                value={deductions}
                onChangeText={setDeductions}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleCreatePayroll}
            disabled={creatingPayroll}
          >
            {creatingPayroll ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.submitBtnText}>Generate Payslip</Text>
            )}
          </TouchableOpacity>

          {/* Payslip History / Mark Paid */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Payroll Statements</Text>
          {payrolls.length === 0 ? (
            <Text style={styles.mutedText}>No payroll records found.</Text>
          ) : (
            payrolls.slice(0, 5).map((pay) => (
              <View key={pay.id} style={styles.payrollItem}>
                <View style={styles.payrollHeader}>
                  <Text style={styles.payrollEmp}>{pay.profile?.name || 'Staff'}</Text>
                  <Text style={[
                    styles.statusPill,
                    pay.status === 'PAID' ? styles.statusPaid : styles.statusUnpaid
                  ]}>
                    {pay.status}
                  </Text>
                </View>
                <Text style={styles.payrollDate}>Period: {pay.month}/{pay.year}</Text>
                <Text style={styles.payrollAmount}>Net Salary: ${pay.net_salary}</Text>
                {pay.status === 'UNPAID' && (
                  <TouchableOpacity 
                    style={styles.payBtn}
                    onPress={() => handleMarkPaid(pay.id)}
                  >
                    <Text style={styles.payBtnText}>Mark as Paid</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      )}

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
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 12,
  },
  accordionContent: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    marginTop: -8,
  },
  sectionTitle: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 14,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.inputBg,
    padding: 6,
  },
  employeeOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
  },
  employeeOptionActive: {
    backgroundColor: Colors.primary,
  },
  employeeOptionText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  employeeOptionTextActive: {
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  inlineLoader: {
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
    padding: 8,
  },
  mutedText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 10,
  },
  payrollItem: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  payrollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payrollEmp: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  statusPill: {
    fontFamily: 'Outfit',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: Colors.tagGreen,
    color: Colors.success,
  },
  statusUnpaid: {
    backgroundColor: Colors.tagRed,
    color: Colors.danger,
  },
  payrollDate: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  payrollAmount: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  payBtnText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
