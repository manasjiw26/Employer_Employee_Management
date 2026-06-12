import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Colors } from '../theme/colors';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

interface DatePickerProps {
  visible: boolean;
  value: string; // YYYY-MM-DD
  onClose: () => void;
  onSelectDate: (date: string) => void;
  title?: string;
}

export default function DatePicker({
  visible,
  value,
  onClose,
  onSelectDate,
  title = 'Select Date',
}: DatePickerProps) {
  // Parse initial value or fallback to today
  const initialDate = value ? new Date(value) : new Date();
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(validInitialDate.getFullYear(), validInitialDate.getMonth(), 1)
  );
  const [selectedDateState, setSelectedDateState] = useState<Date>(validInitialDate);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  // Format date helper: YYYY-MM-DD in local time
  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

  // Previous month fill-in
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    days.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(year, month - 1, d),
    });
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    days.push({
      day: d,
      isCurrentMonth: true,
      date: new Date(year, month, d),
    });
  }

  // Next month fill-in to make grids of 7
  const totalCells = Math.ceil(days.length / 7) * 7;
  const nextMonthDaysNeeded = totalCells - days.length;
  for (let d = 1; d <= nextMonthDaysNeeded; d++) {
    days.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(year, month + 1, d),
    });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleSelectDay = (date: Date) => {
    setSelectedDateState(date);
  };

  const handleConfirm = () => {
    onSelectDate(formatDateString(selectedDateState));
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={Colors.text} size={20} />
            </TouchableOpacity>
          </View>

          {/* Month/Year Navigation */}
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <ChevronLeft color={Colors.text} size={20} />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {monthNames[month]} {year}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <ChevronRight color={Colors.text} size={20} />
            </TouchableOpacity>
          </View>

          {/* Weekdays Headers */}
          <View style={styles.weekdaysRow}>
            {weekdayNames.map((name, index) => (
              <View key={index} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{name}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.gridContainer}>
            {days.map((item, index) => {
              const isSelected =
                selectedDateState.getDate() === item.date.getDate() &&
                selectedDateState.getMonth() === item.date.getMonth() &&
                selectedDateState.getFullYear() === item.date.getFullYear();

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDayCell,
                    !item.isCurrentMonth && styles.otherMonthDayCell,
                  ]}
                  onPress={() => handleSelectDay(item.date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      !item.isCurrentMonth && styles.otherMonthDayText,
                    ]}
                  >
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navBtn: {
    padding: 6,
  },
  monthText: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
  },
  selectedDayCell: {
    backgroundColor: Colors.primary,
  },
  otherMonthDayCell: {
    opacity: 0.4,
  },
  dayText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.text,
  },
  selectedDayText: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  otherMonthDayText: {
    color: Colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
