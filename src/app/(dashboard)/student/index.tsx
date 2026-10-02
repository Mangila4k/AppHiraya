import NotificationBell from '@/components/NotificationBell';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.78, 320);

type StudentInfo = {
  id: string;
  lrn: string;
  first_name: string;
  last_name: string;
  full_name: string;
  grade_level: string;
  strand: string;
  section_name: string;
  section_id: string;
  documents_status: string;
  enrollment_status: string;
};

type Stats = {
  averageGrade: number | null;
  totalSubjects: number;
  attendanceRate: number;
  daysPresent: number;
  daysAbsent: number;
};

const NEU = {
  bg: '#E8EDF2',
  bgDark: '#D1D9E6',
  lightShadow: '#FFFFFF',
  darkShadow: '#A3B1C6',
  text: '#2E3A4D',
  textMuted: '#7A8699',
  textFaint: '#A0ACBE',
  accent: '#4C6FFF',
  danger: '#EF4444',
};

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [stats, setStats] = useState<Stats>({
    averageGrade: null,
    totalSubjects: 0,
    attendanceRate: 0,
    daysPresent: 0,
    daysAbsent: 0,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-DRAWER_WIDTH))[0];

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        setLoading(false);
        return;
      }

      let studentData: any = null;

      if (userData.student_id) {
        const { data } = await supabase
          .from('students')
          .select(`
            id, lrn, first_name, last_name, middle_name, suffix,
            grade_level, strand, section_id, documents_status,
            sections:section_id (name)
          `)
          .eq('id', userData.student_id)
          .maybeSingle();
        studentData = data;
      }

      if (!studentData) {
        const { data } = await supabase
          .from('students')
          .select(`
            id, lrn, first_name, last_name, middle_name, suffix,
            grade_level, strand, section_id, documents_status,
            sections:section_id (name)
          `)
          .eq('email', email)
          .maybeSingle();
        studentData = data;
      }

      if (!studentData) {
        setLoading(false);
        return;
      }

      let enrollmentStatus = 'Not Enrolled';
      if (studentData.documents_status === 'complete') enrollmentStatus = 'Enrolled';
      else if (studentData.documents_status === 'Pending') enrollmentStatus = 'Pending';
      else if (studentData.documents_status) enrollmentStatus = studentData.documents_status;

      const middle = studentData.middle_name
        ? ` ${studentData.middle_name.charAt(0)}.`
        : '';
      const suffix = studentData.suffix ? ` ${studentData.suffix}` : '';
      const fullName =
        `${studentData.first_name || ''}${middle} ${studentData.last_name || ''}${suffix}`.trim() ||
        'Student';

      const sectionRel = Array.isArray(studentData.sections)
        ? studentData.sections[0]
        : studentData.sections;

      setStudent({
        id: studentData.id,
        lrn: studentData.lrn || 'N/A',
        first_name: studentData.first_name || '',
        last_name: studentData.last_name || '',
        full_name: fullName,
        grade_level: studentData.grade_level || 'N/A',
        strand: studentData.strand || 'N/A',
        section_name: sectionRel?.name || 'No Section',
        section_id: studentData.section_id || '',
        documents_status: studentData.documents_status || 'N/A',
        enrollment_status: enrollmentStatus,
      });

      const { data: gradesData } = await supabase
        .from('grades')
        .select('grade')
        .eq('student_id', studentData.id);

      let avgGrade: number | null = null;
      if (gradesData && gradesData.length > 0) {
        const sum = gradesData.reduce((acc, g) => acc + (g.grade || 0), 0);
        avgGrade = Math.round((sum / gradesData.length) * 100) / 100;
      }

      const gradeNum = parseInt(studentData.grade_level);
      const isSeniorHigh = gradeNum >= 11;

      let subjectsQuery = supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('grade_level', studentData.grade_level);

      if (isSeniorHigh && studentData.strand && studentData.strand !== 'N/A') {
        subjectsQuery = subjectsQuery.eq('strand', studentData.strand);
      }

      const { count: subjectsCount } = await subjectsQuery;

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentData.id);

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      if (attendanceData) {
        attendanceData.forEach((a: any) => {
          const s = String(a.status || '').toLowerCase();
          if (s === 'present') presentCount++;
          if (s === 'absent') absentCount++;
          if (s === 'late') lateCount++;
        });
      }

      const totalDays = presentCount + absentCount + lateCount;
      const attendanceRate =
        totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0;

      setStats({
        averageGrade: avgGrade,
        totalSubjects: subjectsCount || 0,
        attendanceRate,
        daysPresent: presentCount,
        daysAbsent: absentCount,
      });
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, onPress, suffix }: any) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={18} color={NEU.accent} />
      </View>
      <Text style={styles.statNumber}>
        {value}
        {suffix || ''}
      </Text>
      <Text style={styles.statTitle} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const DrawerItem = ({ icon, title, onPress, badge }: any) => (
    <TouchableOpacity
      style={styles.drawerItem}
      onPress={() => {
        closeDrawer();
        setTimeout(() => onPress?.(), 220);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.drawerItemIcon}>
        <Ionicons name={icon} size={18} color={NEU.accent} />
      </View>
      <Text style={styles.drawerItemTitle}>{title}</Text>
      {badge ? (
        <View style={styles.drawerBadge}>
          <Text style={styles.drawerBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={NEU.textFaint} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingOrb}>
            <ActivityIndicator size="small" color={NEU.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enrolled':
        return '#22C55E';
      case 'Pending':
        return '#F59E0B';
      case 'Rejected':
        return '#EF4444';
      default:
        return NEU.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={openDrawer}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={22} color={NEU.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>{student?.first_name || 'Student'}</Text>
            <Text style={styles.subGreeting}>
              {student?.grade_level && student.grade_level !== 'N/A'
                ? student.grade_level
                : ''}
              {student?.strand && student.strand !== 'N/A'
                ? ` · ${student.strand}`
                : ''}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <NotificationBell iconColor={NEU.text} />

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/student/profile')}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={20} color={NEU.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info card */}
        {student && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {student.full_name}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>LRN</Text>
              <Text style={styles.infoValue}>{student.lrn}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Section</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {student.section_name}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(student.enrollment_status) },
                  ]}
                />
                <Text style={styles.statusText}>{student.enrollment_status}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Average"
              value={stats.averageGrade !== null ? stats.averageGrade : '—'}
              icon="star-outline"
              onPress={() => router.push('/student/grades')}
            />
            <StatCard
              title="Attendance"
              value={stats.attendanceRate}
              suffix="%"
              icon="calendar-outline"
              onPress={() => router.push('/student/attendance')}
            />
            <StatCard
              title="Subjects"
              value={stats.totalSubjects}
              icon="book-outline"
              onPress={() => router.push('/student/schedule')}
            />
            <StatCard
              title="Present"
              value={stats.daysPresent}
              icon="checkmark-outline"
              onPress={() => router.push('/student/attendance')}
            />
          </View>
        </View>
      </ScrollView>

      {/* ===== Drawer ===== */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={styles.drawerOverlay} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerName} numberOfLines={1}>
              {student?.full_name || 'Student'}
            </Text>
            <Text style={styles.drawerSub} numberOfLines={1}>
              {student?.grade_level && student.grade_level !== 'N/A'
                ? student.grade_level
                : ''}
              {student?.strand && student.strand !== 'N/A'
                ? ` · ${student.strand}`
                : ''}
            </Text>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <DrawerItem
              icon="sparkles-outline"
              title="AI Assistant"
              onPress={() => router.push('/student/chatbot' as any)}
            />
            <DrawerItem
              icon="star-outline"
              title="Grades"
              onPress={() => router.push('/student/grades')}
            />
            <DrawerItem
              icon="calendar-outline"
              title="Attendance"
              onPress={() => router.push('/student/attendance')}
            />
            <DrawerItem
              icon="time-outline"
              title="Schedule"
              onPress={() => router.push('/student/schedule')}
            />
            <DrawerItem
              icon="people-outline"
              title="Section"
              onPress={() => router.push('/student/section')}
            />
            <DrawerItem
              icon="person-outline"
              title="Profile"
              onPress={() => router.push('/student/profile')}
            />
          </ScrollView>

          <TouchableOpacity
            style={styles.drawerLogout}
            onPress={() => {
              closeDrawer();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={NEU.textMuted} />
            <Text style={styles.drawerLogoutText}>Sign out</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NEU.bg },
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOrb: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.lightShadow, shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 6,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
    borderRightWidth: 1, borderBottomWidth: 1,
    borderRightColor: 'rgba(163,177,198,0.4)',
    borderBottomColor: 'rgba(163,177,198,0.4)',
  },
  greeting: {
    fontSize: 16, fontWeight: '700',
    color: NEU.text, letterSpacing: -0.2,
  },
  subGreeting: {
    fontSize: 12, color: NEU.textMuted,
    marginTop: 2, letterSpacing: 0.2,
  },

  infoCard: {
    paddingVertical: 8, paddingHorizontal: 20, marginBottom: 28,
    borderRadius: 20, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7, shadowRadius: 14, elevation: 6,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14,
  },
  infoLabel: { fontSize: 13, color: NEU.textMuted, letterSpacing: 0.3 },
  infoValue: {
    fontSize: 13, fontWeight: '600', color: NEU.text,
    flex: 1, textAlign: 'right', marginLeft: 16,
  },
  divider: { height: 1, backgroundColor: NEU.bgDark, opacity: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600', color: NEU.text },

  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: NEU.textFaint,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 16, paddingHorizontal: 4,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', gap: 16,
  },
  statCard: {
    width: '47%', paddingVertical: 20, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 5,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg, marginBottom: 12,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
    borderRightWidth: 1, borderBottomWidth: 1,
    borderRightColor: NEU.lightShadow, borderBottomColor: NEU.lightShadow,
  },
  statNumber: {
    fontSize: 26, fontWeight: '800',
    color: NEU.text, letterSpacing: -0.5,
  },
  statTitle: {
    fontSize: 12, color: NEU.textMuted,
    letterSpacing: 0.3, marginTop: 4, fontWeight: '500',
  },

  drawerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(46,58,77,0.35)',
  },
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH,
    backgroundColor: NEU.bg, paddingTop: 72, paddingHorizontal: 24,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
    borderRightWidth: 1, borderRightColor: NEU.lightShadow,
  },
  drawerHeader: {
    paddingBottom: 24, borderBottomWidth: 1,
    borderBottomColor: NEU.bgDark, marginBottom: 16,
  },
  drawerName: {
    fontSize: 15, fontWeight: '700',
    color: NEU.text, letterSpacing: -0.2,
  },
  drawerSub: {
    fontSize: 12, color: NEU.textMuted,
    marginTop: 4, letterSpacing: 0.2,
  },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14,
    marginBottom: 8, gap: 14, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  drawerItemIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
    borderRightWidth: 1, borderBottomWidth: 1,
    borderRightColor: NEU.lightShadow, borderBottomColor: NEU.lightShadow,
  },
  drawerItemTitle: {
    fontSize: 14, color: NEU.text, fontWeight: '600',
    letterSpacing: 0.1, flex: 1,
  },
  drawerBadge: {
    backgroundColor: NEU.danger,
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6, marginRight: 4,
  },
  drawerBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  drawerLogout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderTopWidth: 1,
    borderTopColor: NEU.bgDark, gap: 8,
  },
  drawerLogoutText: {
    color: NEU.textMuted, fontSize: 13,
    fontWeight: '600', letterSpacing: 0.2,
  },
});