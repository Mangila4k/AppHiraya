import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomePage() {
  const router = useRouter();

  const FeatureCard = ({ icon, title, description }: any) => (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );

  const StatItem = ({ number, label }: any) => (
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header / Navbar */}
        <View style={styles.navbar}>
          <View style={styles.brand}>
            <View style={styles.brandLogo}>
              <Text style={styles.brandLogoText}>P</Text>
            </View>
            <Text style={styles.brandName}>PLSNHS</Text>
          </View>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Welcome to PLSNHS</Text>
          <Text style={styles.heroSub}>
            Your seamless gateway to academic enrollment and management
          </Text>
          <TouchableOpacity 
            style={styles.enrollButton}
            onPress={() => router.push('/(tabs)/enrollment')}
          >
            <Ionicons name="create" size={20} color="#fff" />
            <Text style={styles.enrollButtonText}>Enroll Now</Text>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Why Choose Placido L. Señior National Highschool
          </Text>
          <View style={styles.featuresGrid}>
            <FeatureCard
              icon="document-text"
              title="Easy Enrollment"
              description="Streamlined online enrollment process for students and parents"
            />
            <FeatureCard
              icon="trending-up"
              title="Real-time Tracking"
              description="Monitor enrollment status and requirements in real-time"
            />
            <FeatureCard
              icon="shield-checkmark"
              title="Secure System"
              description="Your data is protected with industry-standard security"
            />
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, styles.aboutSection]}>
          <View style={styles.aboutContent}>
            <Text style={styles.sectionTitle}>About PLSNHS</Text>
            <Text style={styles.aboutText}>
              PLSNHS is a modern enrollment management system designed specifically for 
              Placido L. Señior National High School. We streamline the admission process, 
              making it easier for students, parents, and administrators to manage enrollments 
              efficiently.
            </Text>
            <View style={styles.aboutList}>
              <View style={styles.aboutItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.aboutItemText}>Paperless enrollment process</Text>
              </View>
              <View style={styles.aboutItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.aboutItemText}>Automated status notifications</Text>
              </View>
              <View style={styles.aboutItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.aboutItemText}>Integrated document tracking</Text>
              </View>
              <View style={styles.aboutItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.aboutItemText}>24/7 accessibility</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsContainer}>
            <StatItem number="500+" label="Students Enrolled" />
            <StatItem number="50+" label="Staff Members" />
            <StatItem number="98%" label="Satisfaction Rate" />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 PLSNHS. All rights reserved. | Placido L. Señior National High School
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
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  brandLogoText: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  brandName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  loginButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loginButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  heroSection: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  heroTitle: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
    color: colors.white,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: typography.sizes.md,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.9,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 10,
    marginTop: spacing.lg,
  },
  enrollButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  section: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    width: '31%',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  aboutSection: {
    backgroundColor: colors.gray,
  },
  aboutContent: {
    flex: 1,
  },
  aboutText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  aboutList: {
    gap: spacing.sm,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aboutItemText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.8,
  },
});