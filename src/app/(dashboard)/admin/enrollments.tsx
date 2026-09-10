import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Enrollment = {
  id: string;
  student_name: string;
  grade_level: string;
  strand: string;
  previous_school: string;
  previous_grade: string;
  last_school_year: string;
  status: string;
  created_at: string;
  email: string;
  first_name: string;
  last_name: string;
  student_uuid: string;
};

export default function AdminEnrollments() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('*')
        .order('created_at', { ascending: false });

      if (enrollmentsError) throw enrollmentsError;

      if (enrollmentsData) {
        const studentIds = enrollmentsData
          .map((item: any) => item.student_id)
          .filter((id: string) => id);

        let studentsMap: Record<string, any> = {};
        
        if (studentIds.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('id, first_name, last_name, email')
            .in('id', studentIds);

          if (!studentsError && studentsData) {
            studentsMap = studentsData.reduce((acc: any, student: any) => {
              acc[student.id] = student;
              return acc;
            }, {});
          }
        }

        const formatted = enrollmentsData.map((item: any) => {
          const student = item.student_id ? studentsMap[item.student_id] : null;
          const firstName = student?.first_name || item.first_name || '';
          const lastName = student?.last_name || item.last_name || '';
          
          return {
            id: item.id,
            grade_level: item.grade_level || 'N/A',
            strand: item.strand || 'N/A',
            previous_school: item.previous_school || 'N/A',
            previous_grade: item.previous_grade || 'N/A',
            last_school_year: item.last_school_year || 'N/A',
            status: item.status || 'pending',
            created_at: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A',
            student_name: firstName && lastName ? `${firstName} ${lastName}`.trim() : 'Unknown',
            email: student?.email || item.email || '',
            first_name: firstName,
            last_name: lastName,
            student_uuid: student?.id || '',
          };
        });
        setEnrollments(formatted);
      }
    } catch (error) {
      console.error('Error loading enrollments:', error);
      Alert.alert('Error', 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  // Clean email function
  const cleanEmail = (email: string): string => {
    if (!email) return '';
    return email.replace(/["']/g, '').trim().toLowerCase();
  };

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if user exists in users table
  const checkUserExists = async (email: string) => {
    try {
      const cleanEmailStr = cleanEmail(email);
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', cleanEmailStr)
        .single();
      
      if (data) {
        return { exists: true, userId: data.id };
      }
      return { exists: false, userId: null };
    } catch (error) {
      return { exists: false, userId: null };
    }
  };

  // Create user in users table directly with password
  const createUserInTable = async (email: string, firstName: string, lastName: string, studentUuid: string, password: string) => {
    try {
      const cleanEmailStr = cleanEmail(email);
      const userId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: cleanEmailStr,
          first_name: firstName,
          last_name: lastName,
          password: password,
          role: 'student',
          student_id: studentUuid || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user in table:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in createUserInTable:', error);
      return null;
    }
  };

  const handleApprove = async (enrollment: Enrollment) => {
    // Prevent multiple clicks
    if (processingId === enrollment.id) {
      return;
    }

    setProcessingId(enrollment.id);
    try {
      console.log('📝 Starting approval for:', enrollment.id);
      console.log('📝 Student:', enrollment.student_name);
      console.log('📝 Original Email:', enrollment.email);

      if (!enrollment.email) {
        Alert.alert('Error', 'No email found for this enrollment');
        setProcessingId(null);
        return;
      }

      // Clean email
      const cleanEmailStr = cleanEmail(enrollment.email);
      console.log('📝 Clean email:', cleanEmailStr);

      // Validate email format
      if (!isValidEmail(cleanEmailStr)) {
        Alert.alert('Error', `Invalid email format: "${cleanEmailStr}". Please use a valid email address.`);
        setProcessingId(null);
        return;
      }

      // Fetch latest student data
      let firstName = enrollment.first_name;
      let lastName = enrollment.last_name;
      let studentUuid = enrollment.student_uuid;

      if (!firstName || !lastName || !studentUuid) {
        console.log('📝 Fetching student data...');
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id, first_name, last_name, email')
          .eq('id', enrollment.student_uuid)
          .single();

        if (!studentError && studentData) {
          firstName = studentData.first_name || '';
          lastName = studentData.last_name || '';
          studentUuid = studentData.id;
          console.log('✅ Student data fetched:', firstName, lastName);
        }
      }

      if (!firstName || !lastName) {
        Alert.alert('Error', 'Missing student name information');
        setProcessingId(null);
        return;
      }

      const password = lastName.toLowerCase() + '123';
      console.log('📝 Generated password:', password);

      // STEP 1: Check if user exists in users table
      console.log('📝 Checking if user exists in users table...');
      const { exists: userExists, userId: existingUserId } = await checkUserExists(cleanEmailStr);

      let userId = null;

      if (userExists && existingUserId) {
        console.log('✅ User already exists with ID:', existingUserId);
        userId = existingUserId;
      } else {
        // STEP 2: Try to create user in auth
        console.log('📝 Creating user in Supabase Auth with email:', cleanEmailStr);
        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: cleanEmailStr,
            password: password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                role: 'student',
                enrollment_id: enrollment.id,
              },
            },
          });

          if (authError) {
            console.error('❌ Auth error:', authError);
            
            if (authError.message.includes('rate limit') || 
                authError.message.includes('already registered')) {
              console.log('📝 Rate limit hit, creating user directly in table...');
              
              const newUser = await createUserInTable(cleanEmailStr, firstName, lastName, studentUuid, password);
              if (newUser) {
                userId = newUser.id;
                console.log('✅ User created directly in table:', userId);
              } else {
                const { exists: finalCheck, userId: finalUserId } = await checkUserExists(cleanEmailStr);
                if (finalCheck && finalUserId) {
                  userId = finalUserId;
                  console.log('✅ User found after retry:', userId);
                } else {
                  Alert.alert(
                    'Error',
                    'Could not create user. Please try again or create manually in Supabase dashboard.',
                    [{ text: 'OK' }]
                  );
                  setProcessingId(null);
                  return;
                }
              }
            } else {
              Alert.alert('Error', 'Failed to create user: ' + authError.message);
              setProcessingId(null);
              return;
            }
          } else {
            console.log('✅ Auth user created:', authData.user?.id);
            userId = authData.user?.id;

            if (userId) {
              const newUser = await createUserInTable(cleanEmailStr, firstName, lastName, studentUuid, password);
              if (newUser) {
                console.log('✅ User inserted successfully');
              }
            }
          }
        } catch (createError) {
          console.error('❌ Creation error:', createError);
          Alert.alert('Error', 'Failed to create user. Please try again.');
          setProcessingId(null);
          return;
        }
      }

      // STEP 3: If we have a userId, proceed with approval
      if (userId) {
        // REMOVED: Update student with user_id since column doesn't exist

        // Update enrollment status to approved
        console.log('📝 Updating enrollment status...');
        const { error: enrollError } = await supabase
          .from('enrollments')
          .update({ 
            status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', enrollment.id);

        if (enrollError) {
          console.error('❌ Enrollment update error:', enrollError);
          Alert.alert('Error', 'Failed to update enrollment status: ' + enrollError.message);
          setProcessingId(null);
          return;
        }
        console.log('✅ Enrollment updated successfully');

        Alert.alert(
          '✅ Enrollment Approved!', 
          `Student can now login with:\n\nEmail: ${cleanEmailStr}\nPassword: ${password}`
        );
        
        // Reload the list
        loadEnrollments();
      } else {
        Alert.alert('Error', 'Could not create or find user. Please try again or create user manually.');
      }

    } catch (error: any) {
      console.error('❌ Unexpected error:', error);
      Alert.alert('Error', error.message || 'Failed to approve enrollment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (enrollment: Enrollment) => {
    if (processingId === enrollment.id) {
      return;
    }
    
    setProcessingId(enrollment.id);
    try {
      const { error: enrollError } = await supabase
        .from('enrollments')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment.id);

      if (enrollError) throw enrollError;

      Alert.alert('Success', 'Enrollment rejected.');
      loadEnrollments();
    } catch (error: any) {
      console.error('Reject error:', error);
      Alert.alert('Error', error.message || 'Failed to reject enrollment');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'rejected': return '#F44336';
      default: return '#999';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchesSearch = enrollment.student_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus ? enrollment.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Enrollments</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
            onPress={() => setFilterStatus('')}
          >
            <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipActive]}
            onPress={() => setFilterStatus(filterStatus === 'pending' ? '' : 'pending')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'pending' && styles.filterChipTextActive]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'approved' && styles.filterChipActive]}
            onPress={() => setFilterStatus(filterStatus === 'approved' ? '' : 'approved')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'approved' && styles.filterChipTextActive]}>Approved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'rejected' && styles.filterChipActive]}
            onPress={() => setFilterStatus(filterStatus === 'rejected' ? '' : 'rejected')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'rejected' && styles.filterChipTextActive]}>Rejected</Text>
          </TouchableOpacity>
        </ScrollView>

        <ScrollView style={styles.list}>
          {filteredEnrollments.map((enrollment) => (
            <View key={enrollment.id} style={styles.enrollmentCard}>
              <View style={styles.enrollmentHeader}>
                <Text style={styles.studentName}>{enrollment.student_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(enrollment.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(enrollment.status) }]}>
                    {getStatusDisplay(enrollment.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.enrollmentDetails}>
                <Text style={styles.detailText}>
                  <Ionicons name="school" size={12} color="#666" /> {enrollment.grade_level}
                </Text>
                <Text style={styles.detailText}>
                  <Ionicons name="book" size={12} color="#666" /> {enrollment.strand}
                </Text>
                <Text style={styles.detailText}>
                  <Ionicons name="business" size={12} color="#666" /> {enrollment.previous_school}
                </Text>
                <Text style={styles.detailText}>
                  <Ionicons name="calendar" size={12} color="#666" /> {enrollment.created_at}
                </Text>
              </View>
              {enrollment.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(enrollment)}
                    disabled={processingId === enrollment.id}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>
                      {processingId === enrollment.id ? 'Processing...' : 'Approve'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(enrollment)}
                    disabled={processingId === enrollment.id}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>
                      {processingId === enrollment.id ? 'Processing...' : 'Reject'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {enrollment.status !== 'pending' && (
                <View style={styles.statusMessage}>
                  <Text style={styles.statusMessageText}>
                    {enrollment.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {filteredEnrollments.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="document-text" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No enrollments found</Text>
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
  enrollmentCard: {
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
  enrollmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  studentName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  enrollmentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailText: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  statusMessage: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  statusMessageText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
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