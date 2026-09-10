import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Attendance = {
  id: string;
  teacher_name: string;
  date: string;
  status: string;
  time_in: string;
  time_out: string;
  remarks: string;
};

export default function AdminAttendance() {
  const router = useRouter();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          status,
          time_in,
          time_out,
          remarks,
          teachers:teacher_id (users:user_id (first_name, last_name))
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedAttendance = data.map((item: any) => ({
          id: item.id,
          date: item.date,
          status: item.status,
          time_in: item.time_in || '--:--',
          time_out: item.time_out || '--:--',
          remarks: item.remarks || '',
          teacher_name: item.teachers?.users 
            ? `${item.teachers.users.first_name} ${item.teachers.users.last_name}` 
            : 'Unknown',
        }));
        setAttendance(formattedAttendance);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      Alert.alert('Error', 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return '#4CAF50';
      case 'Absent': return '#F44336';
      case 'Late': return '#FF9800';
      default: return '#999';
    }
  };

  const filteredAttendance = attendance.filter((record) =>
    record.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Teacher Attendance</Text>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teachers..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView style={styles.list}>
          {filteredAttendance.map((record) => (
            <View key={record.id} style={styles.attendanceCard}>
              <View style={styles.attendanceHeader}>
                <Text style={styles.teacherName}>{record.teacher_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                    {record.status}
                  </Text>
                </View>
              </View>
              <View style={styles.attendanceDetails}>
                <Text style={styles.detailText}>
                  <Ionicons name="calendar" size={12} color="#666" /> {record.date}
                </Text>
                <Text style={styles.detailText}>
                  <Ionicons name="time" size={12} color="#666" /> In: {record.time_in}
                </Text>
                <Text style={styles.detailText}>
                  <Ionicons name="time" size={12} color="#666" /> Out: {record.time_out}
                </Text>
                {record.remarks && (
                  <Text style={styles.remarksText}>
                    <Ionicons name="chatbubble" size={12} color="#666" /> {record.remarks}
                  </Text>
                )}
              </View>
            </View>
          ))}
          {filteredAttendance.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No attendance records found</Text>
            </View>
          )}
        </ScrollView>
      </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  list: {
    flex: 1,
  },
  attendanceCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  teacherName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  attendanceDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailText: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  remarksText: {
    fontSize: typography.sizes.xs,
    color: '#666',
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: '#999',
    marginTop: spacing.md,
  },
});