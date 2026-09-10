import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="students" />
      <Stack.Screen name="teachers" />
      <Stack.Screen name="sections" />
      <Stack.Screen name="subjects" />
      <Stack.Screen name="enrollments" />
      <Stack.Screen name="accounts" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="parent" />
      <Stack.Screen name="registrar" />
      <Stack.Screen name="add-account" />
      <Stack.Screen name="add-subject" />
      <Stack.Screen name="add-teacher" />
      <Stack.Screen name="create-schedule" />
      <Stack.Screen name="create-section" />
      <Stack.Screen name="edit-account" />
      <Stack.Screen name="edit-student" />
      <Stack.Screen name="edit-teacher" />
      <Stack.Screen name="view-account" />
      <Stack.Screen name="view-enrollment" />
      <Stack.Screen name="view-section" />
      <Stack.Screen name="view-student" />
      <Stack.Screen name="view-teacher" />
      <Stack.Screen name="view-parent" />
      <Stack.Screen name="view-registrar" />
    </Stack>
  );
}