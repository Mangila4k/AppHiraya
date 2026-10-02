import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ============================================================
// 🔽 YOUR LOGO IS HERE 🔽
// The logo is imported from assets/images/logo.jpg
// (Make sure @assets/* is mapped in tsconfig.json — see note above)
// ============================================================
import SchoolLogo from '@assets/images/logo.jpg';

type UserRole = 'admin' | 'registrar' | 'teacher' | 'student' | 'parent';

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
  danger: '#EF4444',
};

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

      if (!error && data?.user) {
        console.log('✅ Auth login successful for:', data.user.email);

        await AsyncStorage.setItem('userEmail', trimmedEmail);

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
      if (userData.password !== trimmedPassword) {
        console.log('❌ Password mismatch for:', trimmedEmail);
        setErrorMessage('❌ Invalid password. Please try again.');
        setLoading(false);
        return;
      }

      // ============ STEP 4: Login successful via custom table ============
      console.log('✅ Custom login successful for:', trimmedEmail);

      await AsyncStorage.setItem('userEmail', trimmedEmail);

      const role = userData.role || 'student';
      const validRoles: UserRole[] = ['admin', 'registrar', 'teacher', 'student', 'parent'];
      const validRole = validRoles.includes(role as UserRole) ? (role as UserRole) : 'student';

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.loginCard}>
          {/* ===== LOGO + SCHOOL NAME ===== */}
          <View style={styles.logoSection}>
            <View style={styles.schoolLogo}>
              <Image source={SchoolLogo} style={styles.schoolLogoImage} />
            </View>
            <View style={styles.schoolName}>
              <Text style={styles.schoolNameTitle}>HES</Text>
              <Text style={styles.schoolNameSub}>Hiraya Enrollment System</Text>
            </View>
          </View>

          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSub}>Login to your account to continue</Text>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={NEU.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={NEU.textMuted}
                  style={styles.inputIconLeft}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor={NEU.textFaint}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrorMessage('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={NEU.textMuted}
                  style={styles.inputIconLeft}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={NEU.textFaint}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrorMessage('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.togglePassword}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={NEU.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowBetween}>
              <View style={styles.rememberMe}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={12} color={NEU.accent} />
                  )}
                </TouchableOpacity>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </View>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={NEU.accent} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
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
              <Ionicons name="arrow-back" size={14} color={NEU.textMuted} />
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
    backgroundColor: NEU.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },

  // ===== Login card (large raised neumorphic panel) =====
  loginCard: {
    backgroundColor: NEU.bg,
    borderRadius: 28,
    padding: spacing.xl,
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow,
    borderLeftColor: NEU.lightShadow,
  },

  // ===== Logo Section =====
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  schoolLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
    backgroundColor: NEU.bg,
    // inset circle — logo sits carved into the card
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
  schoolLogoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  schoolName: {
    flex: 1,
  },
  schoolNameTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: NEU.text,
    letterSpacing: -0.3,
  },
  schoolNameSub: {
    fontSize: typography.sizes.xs,
    color: NEU.textMuted,
    marginTop: 2,
  },

  // ===== Welcome Text =====
  welcomeTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: NEU.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeSub: {
    fontSize: typography.sizes.sm,
    color: NEU.textMuted,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  // ===== Error =====
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: NEU.bg,
    // inset pill
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
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: NEU.danger,
    fontWeight: '600',
  },

  // ===== Form =====
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: NEU.text,
    paddingLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: NEU.bg,
    // inset field
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 2,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.5)',
    borderLeftColor: 'rgba(163,177,198,0.5)',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: NEU.lightShadow,
    borderRightColor: NEU.lightShadow,
  },
  inputIconLeft: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.sm,
    color: NEU.text,
  },
  togglePassword: {
    padding: spacing.xs,
  },

  // ===== Row with Remember Me & Forgot Password =====
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEU.bg,
    // inset checkbox
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 1,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.5)',
    borderLeftColor: 'rgba(163,177,198,0.5)',
  },
  rememberMeText: {
    fontSize: typography.sizes.sm,
    color: NEU.textMuted,
  },
  forgotPassword: {
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    fontSize: typography.sizes.xs,
    color: NEU.accent,
    fontWeight: '700',
  },

  // ===== Login Button (raised neumorphic) =====
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEU.bg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    gap: spacing.sm,
    marginTop: spacing.xs,
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
  loginButtonText: {
    color: NEU.accent,
    fontSize: typography.sizes.md,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ===== Signup Link =====
  signupLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  signupText: {
    fontSize: typography.sizes.sm,
    color: NEU.textMuted,
  },
  signupLinkText: {
    fontSize: typography.sizes.sm,
    color: NEU.accent,
    fontWeight: '700',
  },

  // ===== Back Home =====
  backHome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  backHomeText: {
    fontSize: typography.sizes.sm,
    color: NEU.textMuted,
    fontWeight: '500',
  },
});