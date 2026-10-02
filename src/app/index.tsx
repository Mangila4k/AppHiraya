import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { Href, Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

type UserRole = 'admin' | 'registrar' | 'teacher' | 'student' | 'parent';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B2A4A' }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(tabs)/home" />;
  }

  const role = user.user_metadata?.role || 'student';
  const validRoles: UserRole[] = ['admin', 'registrar', 'teacher', 'student', 'parent'];
  const validRole = validRoles.includes(role as UserRole) ? (role as UserRole) : 'student';
  
  return <Redirect href={`/(dashboard)/${validRole}` as Href} />;
}