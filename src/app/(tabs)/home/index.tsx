import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================
// 🔽 YOUR LOGO IS HERE 🔽
// Replace assets/images/logo.jpg with your own image.
// ============================================================
const SCHOOL_LOGO = require('../../../../assets/images/logo.jpg');

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
  accentSoft: 'rgba(76,111,255,0.12)',
  success: '#22C55E',
};

export default function HomePage() {
  const router = useRouter();

  const FeatureCard = ({ icon, title, description }: any) => (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={26} color={NEU.accent} />
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
              <Image source={SCHOOL_LOGO} style={styles.brandLogoImage} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandName} numberOfLines={1}>Hiraya Enrollment System</Text>
              <Text style={styles.brandSub} numberOfLines={1}>National High School</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={16} color={NEU.accent} />
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Welcome to <Text style={styles.heroHighlight}>HES</Text>
          </Text>
          <Text style={styles.heroSub}>
            Your seamless gateway to academic enrollment and management
          </Text>
          <TouchableOpacity
            style={styles.enrollButton}
            onPress={() => router.push('/(tabs)/enrollment')}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={20} color={NEU.accent} />
            <Text style={styles.enrollButtonText}>Enroll Now</Text>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Why Choose Hiraya Enrollment System?
          </Text>
          <View style={styles.featuresGrid}>
            <FeatureCard
              icon="document-text-outline"
              title="Easy Enrollment"
              description="Streamlined online enrollment process for students and parents"
            />
            <FeatureCard
              icon="trending-up-outline"
              title="Real-time Tracking"
              description="Monitor enrollment status and requirements in real-time"
            />
            <FeatureCard
              icon="shield-checkmark-outline"
              title="Secure System"
              description="Your data is protected with industry-standard security"
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About Us</Text>
          <Text style={styles.aboutText}>
            Hiraya Enrollment System is committed to providing
            quality education and a modern enrollment management system. We
            streamline the admission process, making it easier for students,
            parents, and administrators to manage enrollments efficiently.
          </Text>
          <View style={styles.aboutList}>
            <View style={styles.aboutItem}>
              <Ionicons name="checkmark-circle" size={18} color={NEU.success} />
              <Text style={styles.aboutItemText}>Paperless enrollment process</Text>
            </View>
            <View style={styles.aboutItem}>
              <Ionicons name="checkmark-circle" size={18} color={NEU.success} />
              <Text style={styles.aboutItemText}>Automated status notifications</Text>
            </View>
            <View style={styles.aboutItem}>
              <Ionicons name="checkmark-circle" size={18} color={NEU.success} />
              <Text style={styles.aboutItemText}>Integrated document tracking</Text>
            </View>
            <View style={styles.aboutItem}>
              <Ionicons name="checkmark-circle" size={18} color={NEU.success} />
              <Text style={styles.aboutItemText}>24/7 accessibility</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <StatItem number="500+" label="Students Enrolled" />
            <StatItem number="50+" label="Staff Members" />
            <StatItem number="98%" label="Satisfaction Rate" />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 Hiraya Enrollment System. All rights reserved.
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
  },

  // ===== Navbar =====
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: NEU.bg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(209,217,230,0.7)',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: NEU.bg,
    // inset neumorphic — logo sits carved into the navbar
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
  brandLogoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: NEU.text,
    letterSpacing: -0.2,
  },
  brandSub: {
    fontSize: 11,
    color: NEU.textMuted,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: NEU.bg,
    // raised neumorphic button
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow,
    borderLeftColor: NEU.lightShadow,
  },
  loginButtonText: {
    color: NEU.accent,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },

  // ===== Hero =====
  heroSection: {
    backgroundColor: NEU.bg,
    padding: spacing.xl,
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  heroTitle: {
    fontSize: typography.sizes.hero,
    fontWeight: '800',
    color: NEU.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroHighlight: {
    color: NEU.accent,
  },
  heroSub: {
    fontSize: typography.sizes.md,
    color: NEU.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEU.bg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 16,
    marginTop: spacing.lg,
    gap: spacing.sm,
    // large raised pill — hero CTA
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 6,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow,
    borderLeftColor: NEU.lightShadow,
  },
  enrollButtonText: {
    color: NEU.accent,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },

  // ===== Sections =====
  section: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '800',
    color: NEU.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },

    // ===== Features =====
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    rowGap: spacing.md,          // vertical gap between rows only
    // no columnGap — space-between handles horizontal spacing
  },
  featureCard: {
    backgroundColor: NEU.bg,
    borderRadius: 20,
    padding: spacing.lg,
    width: '31.5%',              // slightly wider so 3 fit cleanly
    minHeight: 170,              // consistent card height
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  featureIcon: {
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
  featureTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: NEU.text,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 11,
    color: NEU.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 15,
  },

  // ===== About =====
  aboutSection: {
    padding: spacing.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 24,
    backgroundColor: NEU.bg,
    // large raised panel
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 6,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow,
    borderLeftColor: NEU.lightShadow,
  },
  aboutText: {
    fontSize: typography.sizes.sm,
    color: NEU.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  aboutList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aboutItemText: {
    fontSize: typography.sizes.sm,
    color: NEU.text,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: NEU.bgDark,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: NEU.accent,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: NEU.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  // ===== Footer =====
  footer: {
    padding: spacing.lg,
    backgroundColor: NEU.bg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(209,217,230,0.7)',
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: NEU.textMuted,
    textAlign: 'center',
  },
});