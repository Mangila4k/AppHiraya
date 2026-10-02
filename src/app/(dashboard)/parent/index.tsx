import NotificationBell from '@/components/NotificationBell';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
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

type Child = {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  strand: string;
  section_id: string | null;
  section_name: string;
};

type ChildSummary = {
  child: Child;
  gradeAverage: number | null;
  attendanceRate: number | null;
  todayClasses: number;
  nextClass: { subject: string; time: string; room: string } | null;
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
  success: '#22C55E',
  warning: '#F59E0B',
};

export default function ParentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name || 'Parent';

  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<ChildSummary[]>([]);

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
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!userData) {
        setLoading(false);
        return;
      }

      const { data: kids } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, grade_level, strand, section_id,
          sections:section_id (name)
        `)
        .eq('parent_id', userData.id);

      if (!kids || kids.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      const childList: Child[] = kids.map((k: any) => {
        const sectionRel = Array.isArray(k.sections) ? k.sections[0] : k.sections;
        return {
          id: k.id,
          first_name: k.first_name || '',
          last_name: k.last_name || '',
          full_name: `${k.first_name || ''} ${k.last_name || ''}`.trim() || 'Unknown',
          grade_level: k.grade_level || 'N/A',
          strand: k.strand || 'N/A',
          section_id: k.section_id || null,
          section_name: sectionRel?.name || 'No Section',
        };
      });

      const summaryList: ChildSummary[] = await Promise.all(
        childList.map(async child => {
          const { data: gradesData } = await supabase
            .from('grades')
            .select('grade')
            .eq('student_id', child.id);

          const gradeAverage =
            gradesData && gradesData.length > 0
              ? Math.round(
                  (gradesData.reduce((s: number, g: any) => s + (g.grade || 0), 0) /
                    gradesData.length) *
                    100
                ) / 100
              : null;

          const { data: attData } = await supabase
            .from('attendance')
            .select('status')
            .eq('student_id', child.id);

          let attendanceRate: number | null = null;
          if (attData && attData.length > 0) {
            const present = attData.filter(
              (a: any) => String(a.status).toLowerCase() === 'present'
            ).length;
            const late = attData.filter(
              (a: any) => String(a.status).toLowerCase() === 'late'
            ).length;
            attendanceRate = Math.round(((present + late) / attData.length) * 100);
          }

          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          let todayClasses = 0;
          let nextClass: ChildSummary['nextClass'] = null;

          if (child.section_id) {
            const { data: scheds } = await supabase
              .from('schedules')
              .select('start_time, room, subject_id')
              .eq('section_id', child.section_id)
              .eq('day', today)
              .order('start_time');

            if (scheds && scheds.length > 0) {
              todayClasses = scheds.length;

              const subjectIds = [
                ...new Set(scheds.map((s: any) => s.subject_id).filter(Boolean)),
              ];
              const subjectMap: Record<string, any> = {};
              if (subjectIds.length > 0) {
                const { data: subs } = await supabase
                  .from('subjects')
                  .select('id, name')
                  .in('id', subjectIds);
                (subs || []).forEach((s: any) => {
                  subjectMap[s.id] = s;
                });
              }

              const now = new Date();
              const nowMin = now.getHours() * 60 + now.getMinutes();
              const upcoming =
                scheds.find((s: any) => {
                  if (!s.start_time) return false;
                  const [h, m] = s.start_time.split(':').map(Number);
                  return h * 60 + m >= nowMin;
                }) || scheds[0];

              nextClass = {
                subject: subjectMap[upcoming.subject_id]?.name || 'Class',
                time: formatTime(upcoming.start_time),
                room: upcoming.room || 'TBA',
              };
            }
          }

          return { child, gradeAverage, attendanceRate, todayClasses, nextClass };
        })
      );

      setSummaries(summaryList);
    } catch (e) {
      console.error('Parent dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const gradeColor = (g: number | null) => {
    if (g === null) return NEU.textMuted;
    if (g >= 90) return NEU.success;
    if (g >= 85) return '#8BC34A';
    if (g >= 75) return NEU.warning;
    return NEU.danger;
  };

  const rateColor = (r: number | null) => {
    if (r === null) return NEU.textMuted;
    if (r >= 95) return NEU.success;
    if (r >= 85) return '#8BC34A';
    if (r >= 75) return NEU.warning;
    return NEU.danger;
  };

  // ===== Stat Card =====
  const StatCard = ({ title, value, icon, onPress, suffix, color }: any) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={18} color={color || NEU.accent} />
      </View>
      <Text style={[styles.statNumber, color ? { color } : null]}>
        {value}
        {suffix || ''}
      </Text>
      <Text style={styles.statTitle} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  // ===== Drawer Item =====
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
            <Text style={styles.greeting}>{firstName}</Text>
            <Text style={styles.subGreeting}>
              {summaries.length} {summaries.length === 1 ? 'Child' : 'Children'} Linked
            </Text>
          </View>

          <View style={styles.headerRight}>
            <NotificationBell iconColor={NEU.text} />

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(dashboard)/parent/profile')}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={20} color={NEU.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== Children Cards ===== */}
        {summaries.length === 0 ? (
          <View style={styles.infoCard}>
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Ionicons name="people-outline" size={48} color={NEU.textMuted} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: NEU.text,
                  marginTop: 12,
                }}
              >
                No children linked yet
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: NEU.textMuted,
                  textAlign: 'center',
                  marginTop: 6,
                  paddingHorizontal: 20,
                }}
              >
                Please contact the registrar to link your children.
              </Text>
            </View>
          </View>
        ) : (
          summaries.map(s => (
            <View key={s.child.id} style={styles.infoCard}>
              {/* Child header */}
              <View style={styles.childHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {s.child.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName} numberOfLines={1}>
                    {s.child.full_name}
                  </Text>
                  <Text style={styles.childMeta} numberOfLines={1}>
                    {s.child.grade_level !== 'N/A' ? s.child.grade_level : ''}
                    {s.child.strand !== 'N/A' ? ` · ${s.child.strand}` : ''}
                    {s.child.section_name ? ` · ${s.child.section_name}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Average</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: gradeColor(s.gradeAverage) },
                  ]}
                >
                  {s.gradeAverage !== null ? s.gradeAverage : '—'}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Attendance</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: rateColor(s.attendanceRate) },
                  ]}
                >
                  {s.attendanceRate !== null ? `${s.attendanceRate}%` : '—'}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Today's Classes</Text>
                <Text style={styles.infoValue}>{s.todayClasses}</Text>
              </View>
              <View style={styles.divider} />

              {s.nextClass && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Next Class</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {s.nextClass.subject}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Time · Room</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {s.nextClass.time} · {s.nextClass.room}
                    </Text>
                  </View>
                </>
              )}
            </View>
          ))
        )}

        {/* ===== Overview Section ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Children"
              value={summaries.length}
              icon="people-outline"
              onPress={() => router.push('/(dashboard)/parent/grades')}
            />
            <StatCard
              title="Grades"
              value={
                summaries.length > 0 && summaries[0].gradeAverage !== null
                  ? summaries[0].gradeAverage
                  : '—'
              }
              icon="star-outline"
              onPress={() => router.push('/(dashboard)/parent/grades')}
            />
            <StatCard
              title="Attendance"
              value={
                summaries.length > 0 && summaries[0].attendanceRate !== null
                  ? `${summaries[0].attendanceRate}%`
                  : '—'
              }
              icon="calendar-outline"
              onPress={() => router.push('/(dashboard)/parent/attendance')}
            />
            <StatCard
              title="Today"
              value={summaries.reduce((acc, s) => acc + s.todayClasses, 0)}
              icon="time-outline"
              onPress={() => router.push('/(dashboard)/parent/schedule')}
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
              {firstName}
            </Text>
            <Text style={styles.drawerSub} numberOfLines={1}>
              {summaries.length} {summaries.length === 1 ? 'Child' : 'Children'} Linked
            </Text>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <DrawerItem
              icon="home-outline"
              title="Dashboard"
              onPress={() => router.push('/(dashboard)/parent')}
            />
            <DrawerItem
              icon="star-outline"
              title="Grades"
              onPress={() => router.push('/(dashboard)/parent/grades')}
            />
            <DrawerItem
              icon="calendar-outline"
              title="Attendance"
              onPress={() => router.push('/(dashboard)/parent/attendance')}
            />
            <DrawerItem
              icon="time-outline"
              title="Schedule"
              onPress={() => router.push('/(dashboard)/parent/schedule')}
            />
            <DrawerItem
              icon="person-outline"
              title="Profile"
              onPress={() => router.push('/(dashboard)/parent/profile')}
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

  // ===== Header =====
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

  // ===== Info Card (each child) =====
  infoCard: {
    paddingVertical: 16, paddingHorizontal: 20, marginBottom: 20,
    borderRadius: 20, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7, shadowRadius: 14, elevation: 6,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: NEU.bg,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 3,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  avatarText: {
    fontSize: 20, fontWeight: '800', color: NEU.accent,
  },
  childName: {
    fontSize: 15, fontWeight: '700', color: NEU.text,
    letterSpacing: -0.2,
  },
  childMeta: {
    fontSize: 12, color: NEU.textMuted,
    marginTop: 2, letterSpacing: 0.2,
  },

  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  infoLabel: { fontSize: 13, color: NEU.textMuted, letterSpacing: 0.3 },
  infoValue: {
    fontSize: 13, fontWeight: '700', color: NEU.text,
    flex: 1, textAlign: 'right', marginLeft: 16,
  },
  divider: { height: 1, backgroundColor: NEU.bgDark, opacity: 0.5 },

  // ===== Section =====
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

  // ===== Drawer =====
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