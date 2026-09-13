import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="grades" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="section" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}