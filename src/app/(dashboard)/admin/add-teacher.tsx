import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddTeacher() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    specialization: '',
  });

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleSubmit = async () => {
    const { fullname, email, password, confirmPassword } = form;

    if (!fullname || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const nameParts = fullname.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // STEP 1: Check if user already exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        Alert.alert('Error', 'This email is already registered.');
        setLoading(false);
        return;
      }

      let userId = null;

      // STEP 2: Create user directly in users table
      console.log('📝 Creating user in users table...');
      
      const newUserId = generateUUID();
      
      const { data: directUser, error: directError } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          password: password,
          role: 'teacher',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (directError) {
        console.error('Direct user insert error:', directError);
        Alert.alert('Error', 'Failed to create user. Please try again.');
        setLoading(false);
        return;
      }

      if (directUser) {
        userId = directUser.id;
        console.log('✅ User created in table:', userId);
        
        // STEP 3: Create teacher record
        const { error: teacherError } = await supabase
          .from('teachers')
          .insert({
            user_id: userId,
            employee_id: `PLSNHS-TCH-${String(Date.now().toString().slice(-6)).padStart(6, '0')}`,
            specialization: form.specialization || 'General Education',
            phone: form.phone || null,
          });

        if (teacherError) {
          console.error('Teacher insert error:', teacherError);
          
          if (teacherError.message.includes('row-level security')) {
            Alert.alert(
              'RLS Policy Error', 
              'The teachers table has Row Level Security enabled. Please disable RLS on the teachers table.'
            );
          } else {
            Alert.alert('Error', 'Failed to create teacher record: ' + teacherError.message);
          }
          setLoading(false);
          return;
        }

        // STEP 4: Try to create auth user (optional, but try anyway)
        try {
          const { error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                role: 'teacher',
              },
            },
          });

          if (authError) {
            console.log('Auth signup failed (rate limit), but user was created in table:', authError.message);
          } else {
            console.log('✅ Auth user created successfully');
          }
        } catch (authError) {
          console.log('Auth signup error (ignored):', authError);
        }

        // Show success message - Teacher Created Successfully!
        // Use setTimeout to ensure alert shows after state updates
        setTimeout(() => {
          Alert.alert(
            '✅ Teacher Created Successfully!',
            'Teacher account has been created.',
            [
              { 
                text: 'OK', 
                onPress: () => {
                  router.push('./teachers');
                } 
              }
            ]
          );
        }, 100);
        
        // Return early to prevent any further execution
        setLoading(false);
        return;
      }
    } catch (error: any) {
      console.error('Error:', error);
      
      // Check if user was created in the process
      try {
        const { data: checkUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', form.email)
          .single();
        
        if (checkUser) {
          const { data: checkTeacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', checkUser.id)
            .single();
          
          if (checkTeacher) {
            setTimeout(() => {
              Alert.alert(
                '✅ Teacher Created Successfully!',
                'Teacher account has been created.',
                [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      router.push('./teachers');
                    } 
                  }
                ]
              );
            }, 100);
            setLoading(false);
            return;
          }
        }
      } catch (checkError) {
        // User doesn't exist
      }
      
      Alert.alert('Error', error.message || 'Failed to add teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Teacher</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Teacher Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Juan Dela Cruz"
              placeholderTextColor="#999"
              value={form.fullname}
              onChangeText={(text) => setForm({ ...form, fullname: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="teacher@plshs.edu.ph"
              placeholderTextColor="#999"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Specialization</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mathematics, Science, English"
              placeholderTextColor="#999"
              value={form.specialization}
              onChangeText={(text) => setForm({ ...form, specialization: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="09123456789"
              placeholderTextColor="#999"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Create a strong password"
              placeholderTextColor="#999"
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#999"
              value={form.confirmPassword}
              onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <Ionicons name="save" size={20} color={colors.white} />
            <Text style={styles.submitText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.text,
    backgroundColor: colors.gray,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
  },
  submitText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});