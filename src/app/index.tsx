import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B2A4A' }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  // If no user, go to login
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Get user role from metadata
  const role = user?.user_metadata?.role || 'student';
  
  // Redirect to the appropriate dashboard
  return <Redirect href={`/(tabs)/${role}`} />;
}