import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Account = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminAccounts() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedAccounts = data.map((item: any) => ({
          id: item.id,
          full_name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
          email: item.email || 'No email',
          role: item.role || 'user',
          is_active: item.is_active !== false,
          created_at: item.created_at,
        }));
        setAccounts(formattedAccounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      Alert.alert('Error', 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return '#F44336';
      case 'registrar': return '#2196F3';
      case 'teacher': return '#4CAF50';
      case 'student': return '#FF9800';
      case 'parent': return '#9C27B0';
      default: return '#999';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'shield-checkmark';
      case 'registrar': return 'clipboard';
      case 'teacher': return 'person';
      case 'student': return 'school';
      case 'parent': return 'people';
      default: return 'person';
    }
  };

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch = account.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          account.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole ? account.role.toLowerCase() === filterRole.toLowerCase() : true;
    return matchesSearch && matchesRole;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Accounts</Text>
          <TouchableOpacity onPress={() => router.push('./add-account')} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search accounts..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, !filterRole && styles.filterChipActive]}
            onPress={() => setFilterRole('')}
          >
            <Text style={[styles.filterChipText, !filterRole && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {['Admin', 'Registrar', 'Teacher', 'Student', 'Parent'].map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.filterChip, filterRole === role && styles.filterChipActive]}
              onPress={() => setFilterRole(filterRole === role ? '' : role)}
            >
              <Text style={[styles.filterChipText, filterRole === role && styles.filterChipTextActive]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={styles.list}>
          {filteredAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={styles.accountCard}
              onPress={() => router.push({
                pathname: './view-account',
                params: { id: account.id }
              })}
            >
              <View style={[styles.accountAvatar, { backgroundColor: getRoleColor(account.role) + '20' }]}>
                <Ionicons name={getRoleIcon(account.role)} size={20} color={getRoleColor(account.role)} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.full_name}</Text>
                <Text style={styles.accountEmail}>{account.email}</Text>
                <View style={styles.roleBadge}>
                  <Text style={[styles.roleText, { color: getRoleColor(account.role) }]}>
                    {account.role}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusDot, { backgroundColor: account.is_active ? '#4CAF50' : '#F44336' }]} />
            </TouchableOpacity>
          ))}
          {filteredAccounts.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No accounts found</Text>
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
  filterScroll: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  list: {
    flex: 1,
  },
  accountCard: {
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
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  accountEmail: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  roleBadge: {
    marginTop: 2,
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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