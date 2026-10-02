import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export default function ContactPage() {
  const contacts = [
    { icon: 'location-outline', title: 'Address', detail: 'Langtad, City of Naga, Cebu' },
    { icon: 'call-outline', title: 'Phone', detail: '(032) 123-4567' },
    { icon: 'mail-outline', title: 'Email', detail: 'info@HES.edu.ph' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Hiraya Enrollment System</Text>
        <Text style={styles.subtitle}>Get in touch with us.</Text>

        {contacts.map((c, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name={c.icon as any} size={20} color={NEU.accent} />
            </View>
            <View style={styles.content}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardDetail}>{c.detail}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => Linking.openURL('https://maps.google.com/?q=Langtad+City+of+Naga+Cebu')}
          activeOpacity={0.8}
        >
          <Ionicons name="map-outline" size={18} color={NEU.accent} />
          <Text style={styles.mapButtonText}>View on Map</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEU.bg,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
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
  content: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: NEU.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardDetail: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: NEU.text,
    marginTop: 2,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEU.bg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    gap: spacing.sm,
    marginTop: spacing.md,
    // large raised pill
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
  mapButtonText: {
    color: NEU.accent,
    fontSize: typography.sizes.md,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});