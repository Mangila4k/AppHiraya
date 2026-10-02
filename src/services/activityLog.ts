import { supabase } from '@/lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActivityType =
  | 'login'
  | 'logout'
  | 'profile_updated'
  | 'password_changed'
  | 'parent_linked'
  | 'parent_unlinked'
  | 'chatbot_used'
  | 'announcement';

export type Role = 'student' | 'parent' | 'teacher' | 'admin' | 'registrar';

/** Get the current logged-in user's id + role from AsyncStorage. */
export async function getCurrentUser(): Promise<{ id: string; role: Role; email: string } | null> {
  try {
    const email = await AsyncStorage.getItem('userEmail');
    if (!email) return null;

    const { data } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();

    if (!data?.id) return null;
    return { id: data.id, role: (data.role as Role) || 'student', email };
  } catch {
    return null;
  }
}

/** Log an activity for the CURRENT user. */
export async function logMyActivity(
  type: ActivityType,
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    await supabase.from('notifications').insert({
      user_id: user.id,
      type,
      title,
      body,
      data: { ...data, role: user.role },
      read: false,
    });
  } catch (err) {
    console.error('logMyActivity error:', err);
  }
}

/** Fire the login activity for the current user. */
export async function logLogin() {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'login',
      title: '👋 Welcome back!',
      body: `You signed in on ${new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}.`,
      data: { screen: `/${user.role}`, role: user.role },
      read: true, // don't inflate badge
    });
  } catch (err) {
    console.error('logLogin error:', err);
  }
}

/** Fire the logout activity (call BEFORE clearing AsyncStorage). */
export async function logLogout() {
  await logMyActivity('logout', '👋 Signed out', 'You signed out of your account.', {});
}