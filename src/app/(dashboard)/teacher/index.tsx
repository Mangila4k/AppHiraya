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

type TeacherInfo = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  department: string;
  employee_id: string;
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

export default function TeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    todayClasses: 0,
    pendingGrades: 0,
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
    loadTeacherData();
  }, []);

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (!userData) {
        setLoading(false);
        return;
      }

      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      const t = teacherData || userData;

      setTeacher({
        id: t.id || userData.id,
        first_name: t.first_name || userData.first_name || '',
        last_name: t.last_name || userData.last_name || '',
        full_name:
          `${t.first_name || userData.first_name || ''} ${t.last_name || userData.last_name || ''}`.trim() ||
          'Teacher',
        email: email,
        department: t.department || 'General',
        employee_id: t.employee_id || 'N/A',
      });

      // Schedules assigned to this teacher
      const { data: scheds } = await supabase
        .from('schedules')
        .select('id, section_id, day')
        .eq('teacher_id', teacherData?.id || userData.id);

      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      setStats({
        totalClasses: scheds?.length || 0,
        totalStudents: 0,
        todayClasses: scheds?.filter((s: any) => s.day === today).length || 0,
        pendingGrades: 0,
      });
    } catch (e) {
      console.error('Teacher dashboard load error:', e);
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

  const DrawerItem = ({ icon, title, onPress }: any) => (
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
            <Text style={styles.greeting}>{teacher?.first_name || 'Teacher'}</Text>
            <Text style={styles.subGreeting}>{teacher?.department || ''}</Text>
          </View>

          <View style={styles.headerRight}>
            <NotificationBell iconColor={NEU.text} />

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/teacher/profile' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={20} color={NEU.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info card */}
        {teacher && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {teacher.full_name}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{teacher.employee_id}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {teacher.department}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {teacher.email}
              </Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Classes"
              value={stats.totalClasses}
              icon="school-outline"
              onPress={() => router.push('/teacher/classes' as any)}
            />
            <StatCard
              title="Today"
              value={stats.todayClasses}
              icon="calendar-outline"
              onPress={() => router.push('/teacher/schedule' as any)}
            />
            <StatCard
              title="Students"
              value={stats.totalStudents}
              icon="people-outline"
              onPress={() => router.push('/teacher/students' as any)}
            />
            <StatCard
              title="Pending"
              value={stats.pendingGrades}
              icon="clipboard-outline"
              onPress={() => router.push('/teacher/grades' as any)}
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
              {teacher?.full_name || 'Teacher'}
            </Text>
            <Text style={styles.drawerSub} numberOfLines={1}>
              {teacher?.department || ''}
            </Text>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <DrawerItem
              icon="school-outline"
              title="My Classes"
              onPress={() => router.push('/teacher/classes' as any)}
            />
            <DrawerItem
              icon="calendar-outline"
              title="Schedule"
              onPress={() => router.push('/teacher/schedule' as any)}
            />
            <DrawerItem
              icon="people-outline"
              title="Students"
              onPress={() => router.push('/teacher/students' as any)}
            />
            <DrawerItem
              icon="clipboard-outline"
              title="Grades"
              onPress={() => router.push('/teacher/grades' as any)}
            />
            <DrawerItem
              icon="person-outline"
              title="Profile"
              onPress={() => router.push('/teacher/profile' as any)}
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