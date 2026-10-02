import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="grades" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}