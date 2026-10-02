import { supabase } from '@/lib/supabase/client';
import {
    ChatMessage,
    fetchStudentContext,
    sendChatMessage,
    StudentContext,
    SUGGESTED_QUESTIONS,
} from '@/services/chatbot';
import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

const NEU = {
  bg: '#E8EDF2',
  bgDark: '#D1D9E6',
  lightShadow: '#FFFFFF',
  darkShadow: '#A3B1C6',
  text: '#2E3A4D',
  textMuted: '#7A8699',
  textFaint: '#A0ACBE',
  accent: '#4C6FFF',
  accentSoft: 'rgba(76,111,255,0.12)',
  userBubble: '#4C6FFF',
  aiBubble: '#FFFFFF',
};

export default function StudentChatbot() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState<StudentContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        Alert.alert('Error', 'Please log in again.');
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('student_id, email')
        .eq('email', email)
        .maybeSingle();

      let studentId = userData?.student_id;

      if (!studentId) {
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        studentId = studentData?.id;
      }

      if (!studentId) {
        Alert.alert('Error', 'Student profile not found.');
        setLoading(false);
        return;
      }

      const ctx = await fetchStudentContext(studentId);
      if (!ctx) {
        Alert.alert('Error', 'Failed to load your information.');
        setLoading(false);
        return;
      }

      setContext(ctx);

      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hi ${ctx.studentName.split(' ')[0]}! 👋 I'm your AI study assistant. I can help you with:\n\n• Your grades and academic performance\n• Attendance records\n• Class schedule\n• Subject information\n• General academic guidance\n\nWhat would you like to know?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error loading context:', error);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || sending || !context) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSending(true);
    setShowSuggestions(false);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await sendChatMessage([...messages, userMessage], context);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => {
    if (!context) return;
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Hi ${context.studentName.split(' ')[0]}! 👋 How can I help you today?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    setShowSuggestions(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingOrb}>
            <ActivityIndicator size="small" color={NEU.accent} />
          </View>
          <Text style={styles.loadingText}>Loading your info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={NEU.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Ionicons name="sparkles" size={16} color={NEU.accent} />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <Text style={styles.headerSubtitle}>Powered by Groq</Text>
            </View>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={NEU.text} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.role === 'user' ? styles.userRow : styles.aiRow,
              ]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={14} color={NEU.accent} />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.role === 'user' ? styles.userText : styles.aiText,
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

          {sending && (
            <View style={[styles.messageRow, styles.aiRow]}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={14} color={NEU.accent} />
              </View>
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <View style={styles.typingIndicator}>
                  <View style={styles.typingDot} />
                  <View style={[styles.typingDot, { opacity: 0.7 }]} />
                  <View style={[styles.typingDot, { opacity: 0.4 }]} />
                </View>
              </View>
            </View>
          )}

          {/* Suggestions */}
          {showSuggestions && messages.length <= 1 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Try asking:</Text>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(q)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={14} color={NEU.accent} />
                  <Text style={styles.suggestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your grades, attendance..."
            placeholderTextColor={NEU.textFaint}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NEU.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOrb: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  loadingText: {
    marginTop: spacing.md, fontSize: typography.sizes.sm,
    color: NEU.textMuted, fontWeight: '600',
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: NEU.bgDark,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm, gap: spacing.sm },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.accentSoft,
  },
  headerTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text },
  headerSubtitle: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 1 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 3,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },

  messagesContainer: { flex: 1 },
  messagesContent: { padding: spacing.md, paddingBottom: spacing.lg },

  messageRow: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },

  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.accentSoft,
    marginRight: spacing.sm,
    marginBottom: 2,
  },

  messageBubble: {
    maxWidth: '80%', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  userBubble: {
    backgroundColor: NEU.userBubble,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: NEU.aiBubble,
    borderBottomLeftRadius: 4,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  messageText: { fontSize: typography.sizes.sm, lineHeight: 20 },
  userText: { color: '#FFFFFF' },
  aiText: { color: NEU.text },

  typingIndicator: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  typingDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: NEU.accent,
  },

  suggestionsContainer: { marginTop: spacing.sm },
  suggestionsTitle: {
    fontSize: typography.sizes.xs, color: NEU.textMuted,
    fontWeight: '600', marginBottom: spacing.sm, marginLeft: 4,
  },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: NEU.bg, borderRadius: 14,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 3,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  suggestionText: { fontSize: typography.sizes.sm, color: NEU.text, fontWeight: '500', flex: 1 },

  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1, borderTopColor: NEU.bgDark,
    backgroundColor: NEU.bg,
  },
  input: {
    flex: 1, maxHeight: 100,
    backgroundColor: NEU.bg,
    borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm, color: NEU.text,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.accent,
    shadowColor: NEU.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  sendButtonDisabled: { backgroundColor: NEU.textFaint, shadowOpacity: 0 },
});