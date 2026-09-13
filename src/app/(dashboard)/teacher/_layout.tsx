import { Stack } from 'expo-router';

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="face-attendance" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="subjects" />
      <Stack.Screen name="grades" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}