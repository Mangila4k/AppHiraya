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

export default function AboutPage() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>About HES</Text>
        <Text style={styles.subtitle}>Learn more about our mission and vision.</Text>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="radio-button-on-outline" size={26} color={NEU.accent} />
          </View>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.cardDesc}>
            To provide accessible, efficient, and quality enrollment management services
            for students and stakeholders of Hiraya Enrollment System.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="eye-outline" size={26} color={NEU.accent} />
          </View>
          <Text style={styles.cardTitle}>Our Vision</Text>
          <Text style={styles.cardDesc}>
            To be the leading enrollment management system in the region, setting the
            standard for innovation and excellence in education administration.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="heart-outline" size={26} color={NEU.accent} />
          </View>
          <Text style={styles.cardTitle}>Our Values</Text>
          <Text style={styles.cardDesc}>
            Integrity, Innovation, Service Excellence, and Student-Centered Approach
            in everything we do.
          </Text>
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
  card: {
    backgroundColor: NEU.bg,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    // large raised neumorphic panel
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow,
    borderLeftColor: NEU.lightShadow,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: NEU.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: typography.sizes.sm,
    color: NEU.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});