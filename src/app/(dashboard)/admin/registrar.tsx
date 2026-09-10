import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Registrar = {
  id: string;
  full_name: string;
  email: string;
  employee_id: string;
  phone: string;
  created_at: string;
};

export default function AdminRegistrar() {
  const router = useRouter();
  const [registrars, setRegistrars] = useState<Registrar[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRegistrars();
  }, []);

  const loadRegistrars = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'registrar')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedRegistrars = data.map((item: any) => ({
          id: item.id,
          full_name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
          email: item.email || 'No email',
          employee_id: item.employee_id || 'N/A',
          phone: item.phone || 'N/A',
          created_at: item.created_at,
        }));
        setRegistrars(formattedRegistrars);
      }
    } catch (error) {
      console.error('Error loading registrars:', error);
      Alert.alert('Error', 'Failed to load registrars');
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistrars = registrars.filter((registrar) =>
    registrar.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    registrar.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Registrars</Text>
          <TouchableOpacity onPress={() => router.push('./add-account')} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search registrars..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView style={styles.list}>
          {filteredRegistrars.map((registrar) => (
            <TouchableOpacity
              key={registrar.id}
              style={styles.registrarCard}
              onPress={() => router.push(`./view-registrar?id=${registrar.id}`)}
            >
              <View style={styles.registrarAvatar}>
                <Text style={styles.registrarInitial}>
                  {registrar.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.registrarInfo}>
                <Text style={styles.registrarName}>{registrar.full_name}</Text>
                <Text style={styles.registrarEmail}>{registrar.email}</Text>
                <View style={styles.registrarMeta}>
                  <Text style={styles.registrarMetaText}>
                    <Ionicons name="id-card" size={12} color="#666" /> {registrar.employee_id}
                  </Text>
                  <Text style={styles.registrarMetaText}>
                    <Ionicons name="call" size={12} color="#666" /> {registrar.phone}
                  </Text>
                </View>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Registrar</Text>
              </View>
            </TouchableOpacity>
          ))}
          {filteredRegistrars.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No registrars found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  list: {
    flex: 1,
  },
  registrarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  registrarAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  registrarInitial: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  registrarInfo: {
    flex: 1,
  },
  registrarName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  registrarEmail: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  registrarMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 2,
  },
  registrarMetaText: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  roleBadge: {
    backgroundColor: '#FF9800' + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: '#FF9800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: '#999',
    marginTop: spacing.md,
  },
});