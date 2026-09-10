import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Parent = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  children_count: number;
  created_at: string;
};

export default function AdminParent() {
  const router = useRouter();
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadParents();
  }, []);

  const loadParents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'parent')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedParents = data.map((item: any) => ({
          id: item.id,
          full_name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
          email: item.email || 'No email',
          phone: item.phone || 'N/A',
          children_count: 0, // Will be updated with student count
          created_at: item.created_at,
        }));
        setParents(formattedParents);
      }
    } catch (error) {
      console.error('Error loading parents:', error);
      Alert.alert('Error', 'Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  const filteredParents = parents.filter((parent) =>
    parent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Parents</Text>
          <TouchableOpacity onPress={() => router.push('./add-account')} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search parents..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView style={styles.list}>
          {filteredParents.map((parent) => (
            <TouchableOpacity
              key={parent.id}
              style={styles.parentCard}
              onPress={() => router.push(`./view-parent?id=${parent.id}`)}
            >
              <View style={styles.parentAvatar}>
                <Text style={styles.parentInitial}>
                  {parent.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.parentInfo}>
                <Text style={styles.parentName}>{parent.full_name}</Text>
                <Text style={styles.parentEmail}>{parent.email}</Text>
                <View style={styles.parentMeta}>
                  <Text style={styles.parentMetaText}>
                    <Ionicons name="people" size={12} color="#666" /> {parent.children_count} children
                  </Text>
                  <Text style={styles.parentMetaText}>
                    <Ionicons name="call" size={12} color="#666" /> {parent.phone}
                  </Text>
                </View>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Parent</Text>
              </View>
            </TouchableOpacity>
          ))}
          {filteredParents.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No parents found</Text>
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
  parentCard: {
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
  parentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  parentInitial: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  parentEmail: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  parentMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 2,
  },
  parentMetaText: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  roleBadge: {
    backgroundColor: '#9C27B0' + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: '#9C27B0',
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