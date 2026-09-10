import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type UserRole = 'admin' | 'registrar' | 'teacher' | 'student' | 'parent';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      console.log('🔐 Attempting login for:', trimmedEmail);

      // ============ STEP 1: Try Supabase Auth ============
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      // If Supabase Auth works, use it
      if (!error && data?.user) {
        console.log('✅ Auth login successful for:', data.user.email);
        
        // Save user email to AsyncStorage
        await AsyncStorage.setItem('userEmail', trimmedEmail);
        console.log('✅ User email saved to storage');
        
        const role = data.user.user_metadata?.role || 'student';
        const validRoles: UserRole[] = ['admin', 'registrar', 'teacher', 'student', 'parent'];
        const validRole = validRoles.includes(role as UserRole) ? (role as UserRole) : 'student';
        router.replace(`/(dashboard)/${validRole}` as Href);
        setLoading(false);
        return;
      }

      // ============ STEP 2: If Auth fails, check custom users table ============
      console.log('⚠️ Auth failed, checking custom users table...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', trimmedEmail)
        .single();

      if (userError || !userData) {
        console.log('❌ User not found in custom table either');
        setErrorMessage('❌ No account found with this email. Please enroll first.');
        setLoading(false);
        return;
      }

      // ============ STEP 3: Check password in custom table ============
      console.log('✅ User found in custom table:', userData.email);
      
      // Check if password matches
      if (userData.password !== trimmedPassword) {
        console.log('❌ Password mismatch for:', trimmedEmail);
        setErrorMessage('❌ Invalid password. Please try again.');
        setLoading(false);
        return;
      }

      // ============ STEP 4: Login successful via custom table ============
      console.log('✅ Custom login successful for:', trimmedEmail);
      
      // Save user email to AsyncStorage
      await AsyncStorage.setItem('userEmail', trimmedEmail);
      console.log('✅ User email saved to storage');
      
      // Get role from custom table
      const role = userData.role || 'student';
      const validRoles: UserRole[] = ['admin', 'registrar', 'teacher', 'student', 'parent'];
      const validRole = validRoles.includes(role as UserRole) ? (role as UserRole) : 'student';
      
      // Redirect to the appropriate dashboard
      router.replace(`/(dashboard)/${validRole}` as Href);
      
    } catch (error: any) {
      console.error('❌ Unexpected error:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.loginCard}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.schoolLogo}>
              <Text style={styles.schoolLogoText}>PLS</Text>
            </View>
            <View style={styles.schoolName}>
              <Text style={styles.schoolNameTitle}>Placido L. Señor</Text>
              <Text style={styles.schoolNameSub}>National High School</Text>
            </View>
          </View>

          <Text style={styles.welcomeTitle}>
            Welcome <Text style={styles.highlight}>Back</Text>
          </Text>
          <Text style={styles.welcomeSub}>Login to your account to continue</Text>

          {/* Error Message Display */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrorMessage(''); // Clear error when user types
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                <Ionicons name="mail" size={20} color="#999" style={styles.inputIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrorMessage(''); // Clear error when user types
                  }}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.togglePassword}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Ionicons name="key" size={14} color={colors.primary} />
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.rememberMe}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setRememberMe(!rememberMe)}
              >
                {rememberMe && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in" size={20} color="#fff" />
                  <Text style={styles.loginButtonText}>LOGIN</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.signupLink}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/enrollment')}>
                <Text style={styles.signupLinkText}>Enroll Now</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backHome}
              onPress={() => router.push('/(tabs)/home')}
            >
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text style={styles.backHomeText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loginCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  schoolLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  schoolLogoText: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  schoolName: {
    flex: 1,
  },
  schoolNameTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  schoolNameSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  welcomeTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  highlight: {
    color: colors.primary,
  },
  welcomeSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: '#991B1B',
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  required: {
    color: colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.gray,
  },
  input: {
    flex: 1,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  inputIcon: {
    paddingHorizontal: spacing.md,
  },
  togglePassword: {
    paddingHorizontal: spacing.md,
  },
  forgotPassword: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
  },
  forgotPasswordText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberMeText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  signupLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  signupText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  signupLinkText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  backHome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  backHomeText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
});