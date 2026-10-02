import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ===== Neumorphic palette =====
const NEU = {
  bg: '#E8EDF2',
  bgDark: '#D1D9E6',
  lightShadow: '#FFFFFF',
  darkShadow: '#A3B1C6',
  text: '#2E3A4D',
  textMuted: '#7A8699',
  textFaint: '#A0ACBE',
  accent: '#4C6FFF',
};

export default function FeaturesPage() {
  const features = [
    { icon: 'people-outline', title: 'Student Management', desc: 'Complete student profile management with easy access to records.' },
    { icon: 'document-text-outline', title: 'Paperless Enrollment', desc: 'Submit requirements online, no more physical documents.' },
    { icon: 'notifications-outline', title: 'Real-time Notifications', desc: 'Get instant updates on your enrollment status.' },
    { icon: 'shield-checkmark-outline', title: 'Data Security', desc: 'Your information is protected with enterprise-grade security.' },
    { icon: 'phone-portrait-outline', title: '24/7 Accessibility', desc: 'Access the system anytime, anywhere from any device.' },
    { icon: 'pie-chart-outline', title: 'Analytics Dashboard', desc: 'Track enrollment trends with comprehensive reports.' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Features</Text>
        <Text style={styles.subtitle}>Discover what makes HES the best choice.</Text>
        <View style={styles.grid}>
          {features.map((f, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.iconContainer}>
                <Ionicons name={f.icon as any} size={26} color={NEU.accent} />
              </View>
              <Text style={styles.cardTitle}>{f.title}</Text>
              <Text style={styles.cardDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NEU.bg,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: NEU.text,
    marginTop: spacing.md,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: NEU.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  card: {
    backgroundColor: NEU.bg,
    borderRadius: 20,
    padding: spacing.lg,
    width: '48%',
    alignItems: 'center',
    // raised neumorphic
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 5,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow,
    borderLeftColor: NEU.lightShadow,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: NEU.bg,
    // inset circle
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: NEU.text,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 11,
    color: NEU.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
});