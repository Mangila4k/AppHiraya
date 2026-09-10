import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ContactPage() {
  const contacts = [
    { icon: 'location', title: 'Address', detail: 'Langtad, City of Naga, Cebu' },
    { icon: 'call', title: 'Phone', detail: '(032) 123-4567' },
    { icon: 'mail', title: 'Email', detail: 'info@PLSNHS.edu.ph' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>PLSNHS</Text>

        {contacts.map((c, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name={c.icon as any} size={24} color={colors.primary} />
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
        >
          <Ionicons name="map" size={20} color={colors.white} />
          <Text style={styles.mapButtonText}>View on Map</Text>
        </TouchableOpacity>
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
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  cardDetail: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  mapButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});