import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

const NEU = {
  accent: '#4C6FFF',
};

export default function ChatbotFab() {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push('/student/chatbot')}
      activeOpacity={0.85}
    >
      <View style={styles.inner}>
        <Ionicons name="sparkles" size={22} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NEU.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NEU.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  inner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});