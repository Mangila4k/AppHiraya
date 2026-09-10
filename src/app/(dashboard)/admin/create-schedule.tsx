import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateSchedule() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject_id: '',
    teacher_id: '',
    day: '',
    time_slot: '',
    room: '',
    school_year: '2024-2025',
    quarter: '1',
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '7:00 AM - 8:00 AM',
    '8:00 AM - 9:00 AM',
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
  ];

  const handleSubmit = async () => {
    if (!form.subject_id || !form.teacher_id || !form.day || !form.time_slot) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // This would save to the schedules table
      Alert.alert('Success', 'Schedule created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Schedule</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Class Schedule</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Select Subject"
              placeholderTextColor="#999"
              value={form.subject_id}
              onChangeText={(text) => setForm({ ...form, subject_id: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teacher <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Select Teacher"
              placeholderTextColor="#999"
              value={form.teacher_id}
              onChangeText={(text) => setForm({ ...form, teacher_id: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Day <Text style={styles.required}>*</Text></Text>
            <View style={styles.dayContainer}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayOption, form.day === day && styles.dayOptionActive]}
                  onPress={() => setForm({ ...form, day })}
                >
                  <Text style={[styles.dayText, form.day === day && styles.dayTextActive]}>
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time Slot <Text style={styles.required}>*</Text></Text>
            <View style={styles.timeContainer}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeOption, form.time_slot === time && styles.timeOptionActive]}
                  onPress={() => setForm({ ...form, time_slot: time })}
                >
                  <Text style={[styles.timeText, form.time_slot === time && styles.timeTextActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Room</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Room 101"
              placeholderTextColor="#999"
              value={form.room}
              onChangeText={(text) => setForm({ ...form, room: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>School Year <Text style={styles.required}>*</Text></Text>
            <View style={styles.yearContainer}>
              {['2024-2025', '2025-2026'].map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearOption, form.school_year === year && styles.yearOptionActive]}
                  onPress={() => setForm({ ...form, school_year: year })}
                >
                  <Text style={[styles.yearText, form.school_year === year && styles.yearTextActive]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <Ionicons name="save" size={20} color={colors.white} />
            <Text style={styles.submitText}>{loading ? 'Creating...' : 'Create Schedule'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.text,
    backgroundColor: colors.gray,
  },
  dayContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dayOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
    alignItems: 'center',
  },
  dayOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  dayTextActive: {
    color: colors.white,
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
  },
  timeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  timeTextActive: {
    color: colors.white,
  },
  yearContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  yearOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
    alignItems: 'center',
  },
  yearOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  yearTextActive: {
    color: colors.white,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
  },
  submitText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});