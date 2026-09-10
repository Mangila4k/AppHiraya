import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeaturesPage() {
  const features = [
    { icon: 'people', title: 'Student Management', desc: 'Complete student profile management with easy access to records.' },
    { icon: 'document-text', title: 'Paperless Enrollment', desc: 'Submit requirements online, no more physical documents.' },
    { icon: 'notifications', title: 'Real-time Notifications', desc: 'Get instant updates on your enrollment status.' },
    { icon: 'shield-checkmark', title: 'Data Security', desc: 'Your information is protected with enterprise-grade security.' },
    { icon: 'phone-portrait', title: '24/7 Accessibility', desc: 'Access the system anytime, anywhere from any device.' },
    { icon: 'pie-chart', title: 'Analytics Dashboard', desc: 'Track enrollment trends with comprehensive reports.' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>📋 Features</Text>
        <Text style={styles.subtitle}>Discover what makes PLSNHS the best choice.</Text>
        <View style={styles.grid}>
          {features.map((f, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.iconContainer}>
                <Ionicons name={f.icon as any} size={32} color={colors.primary} />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    width: '48%',
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
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});