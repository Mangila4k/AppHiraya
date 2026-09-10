import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutPage() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>About PLSNHS</Text>
        <Text style={styles.subtitle}>Learn more about our mission and vision.</Text>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="radio-button-on" size={32} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.cardDesc}>
            To provide accessible, efficient, and quality enrollment management services 
            for students and stakeholders of Placido L. Señior National High School.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="eye" size={32} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Our Vision</Text>
          <Text style={styles.cardDesc}>
            To be the leading enrollment management system in the region, setting the 
            standard for innovation and excellence in education administration.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="heart" size={32} color={colors.primary} />
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
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});