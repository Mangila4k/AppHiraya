import { supabase } from '@/lib/supabase/client';
import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'plsnhs://reset-password',
      });

      if (error) throw error;

      setSent(true);
      Alert.alert(
        'Reset Code Sent',
        'Please check your email for the password reset link.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset code');
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
        <View style={styles.card}>
          {/* Inset icon circle */}
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={34} color={NEU.accent} />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a password reset code.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={NEU.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your registered email address"
                placeholderTextColor={NEU.textFaint}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!sent}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendReset}
            disabled={loading || sent}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={NEU.accent} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color={NEU.accent} />
                <Text style={styles.sendButtonText}>
                  {sent ? 'Reset Code Sent' : 'Send Reset Code'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color={NEU.accent} />
            <Text style={styles.backLinkText}>Back to Login</Text>
          </TouchableOpacity>

          <View style={styles.features}>
            <View style={styles.feature}>
              <Ionicons name="time-outline" size={14} color={NEU.textMuted} />
              <Text style={styles.featureText}>Valid 1 hour</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="shield-checkmark-outline" size={14} color={NEU.textMuted} />
              <Text style={styles.featureText}>Secure</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="mail-outline" size={14} color={NEU.textMuted} />
              <Text style={styles.featureText}>Check inbox</Text>
            </View>
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
  card: {
    backgroundColor: NEU.bg,
    borderRadius: 28,
    padding: spacing.xl,
    alignItems: 'center',
    // large raised neumorphic panel
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    backgroundColor: NEU.bg,
    // inset circle
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 2,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: NEU.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: NEU.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  inputGroup: {
    width: '100%',
    marginBottom: spacing.lg,
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
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.sm,
    color: NEU.text,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEU.bg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    gap: spacing.sm,
    width: '100%',
    // raised neumorphic
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
  sendButtonText: {
    color: NEU.accent,
    fontSize: typography.sizes.md,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  backLinkText: {
    fontSize: typography.sizes.sm,
    color: NEU.accent,
    fontWeight: '700',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: NEU.bgDark,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 10,
    color: NEU.textMuted,
    fontWeight: '500',
  },
});