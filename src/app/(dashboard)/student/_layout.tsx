import ChatbotFab from '@/components/ChatbotFab';
import { Stack, useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function StudentLayout() {
  const segments = useSegments();
  const currentScreen = String(segments[segments.length - 1] || '');
  const hideFab = ['chatbot', 'notifications'].includes(currentScreen);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="grades" />
        <Stack.Screen name="attendance" />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="section" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="chatbot" />
        <Stack.Screen name="notifications" />
      </Stack>

      {!hideFab && <ChatbotFab />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});