import { supabase } from '@/lib/supabase/client';
import { getFaceTokenFromBase64 } from '@/lib/utils/faceFingerprint';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Teacher = {
  id: string;
  user_id: string;
  full_name: string;
  employee_id: string;
  specialization: string;
  hasFace: boolean;
};

export default function AdminRegisterFace() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);

  useEffect(() => { loadTeachers(); }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const { data: teachersData } = await supabase
        .from('teachers')
        .select(`
          id, user_id, employee_id, specialization,
          users:user_id (first_name, last_name)
        `);

      if (!teachersData) { setLoading(false); return; }

      const teacherIds = teachersData.map((t: any) => t.id);
      const { data: faces } = await supabase
        .from('teacher_faces')
        .select('teacher_id')
        .in('teacher_id', teacherIds);

      const faceMap: Record<string, boolean> = {};
      (faces || []).forEach((f: any) => { faceMap[f.teacher_id] = true; });

      setTeachers(teachersData.map((t: any) => {
        const u = t.users;
        return {
          id: t.id,
          user_id: t.user_id,
          full_name: u
            ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
            : 'Unknown',
          employee_id: t.employee_id || 'N/A',
          specialization: t.specialization || 'N/A',
          hasFace: !!faceMap[t.id],
        };
      }));
    } catch (e) {
      console.error('Load teachers error:', e);
      Alert.alert('Error', 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const captureFace = async () => {
    if (!cameraRef.current || !selectedTeacher) {
      Alert.alert('Error', 'Please select a teacher first');
      return;
    }

    setCapturing(true);
    try {
      // 1. Capture photo (URI only — we'll resize)
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.7,
        skipProcessing: false,
        exif: false,
      });

      if (!photo?.uri) throw new Error('Failed to capture image');

      console.log('📷 Original photo:', photo.width, 'x', photo.height, 'uri:', photo.uri);

      // 2. Resize to at least 480px wide (Face++ needs ≥ 48×48, we use 480 for good quality)
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 480 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!resized.base64) throw new Error('Resize failed');

      console.log('📷 Resized base64 length:', resized.base64.length);
      console.log('📷 Resized preview:', resized.base64.substring(0, 50));

      // 3. Send to Face++
      const faceToken = await getFaceTokenFromBase64(resized.base64);

      if (!faceToken) {
        Alert.alert(
          'Registration Failed',
          'Face++ could not detect a clear face. Please ensure:\n• Good lighting\n• Face looking at camera\n• No glasses or hat covering face'
        );
        return;
      }

      // 4. Save token to Supabase
      setSaving(true);
      const { error } = await supabase
        .from('teacher_faces')
        .upsert(
          {
            teacher_id: selectedTeacher.id,
            face_fingerprint: faceToken,
            registered_at: new Date().toISOString(),
          },
          { onConflict: 'teacher_id' }
        );

      if (error) throw error;

      Alert.alert(
        'Success',
        `${selectedTeacher.full_name}'s face has been registered with Face++.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setTeachers(prev =>
                prev.map(t =>
                  t.id === selectedTeacher.id ? { ...t, hasFace: true } : t
                )
              );
              setSelectedTeacher(null);
            },
          },
        ]
      );
    } catch (e: any) {
      console.error('Capture error:', e);
      Alert.alert('Capture Failed', e.message || 'Could not register face');
    } finally {
      setCapturing(false);
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Ionicons name="camera-outline" size={60} color="#ccc" />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading teachers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Register Face</Text>
          <TouchableOpacity onPress={loadTeachers} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setTeacherModalVisible(true)}
        >
          <Ionicons name="person" size={18} color={colors.primary} />
          <Text style={[styles.selectorText, !selectedTeacher && styles.placeholder]}>
            {selectedTeacher ? selectedTeacher.full_name : 'Select Teacher'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>

        {selectedTeacher ? (
          <>
            <View style={styles.statusBanner}>
              <Ionicons
                name={selectedTeacher.hasFace ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={selectedTeacher.hasFace ? '#4CAF50' : '#FF9800'}
              />
              <Text style={styles.statusText}>
                {selectedTeacher.hasFace
                  ? 'Face already registered. Re-scan to update.'
                  : 'Not registered yet. Scan to register face.'}
              </Text>
            </View>

            <View style={styles.cameraContainer}>
              <CameraView ref={cameraRef} style={styles.camera} facing="front" />
              <View style={styles.faceFrame} />
              <View style={styles.faceHint}>
                <Ionicons name="person-circle-outline" size={14} color="#fff" />
                <Text style={styles.faceHintText}>Position face inside the frame</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.captureBtn, (capturing || saving) && { opacity: 0.5 }]}
              onPress={captureFace}
              disabled={capturing || saving}
            >
              {capturing || saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="scan" size={22} color="#fff" />
                  <Text style={styles.captureBtnText}>
                    {selectedTeacher.hasFace ? 'Re-scan Face' : 'Register Face'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="scan-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Please select a teacher first</Text>
          </View>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={teacherModalVisible}
        onRequestClose={() => setTeacherModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Teacher</Text>
              <TouchableOpacity onPress={() => setTeacherModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {teachers.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedTeacher(t);
                    setTeacherModalVisible(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{t.full_name}</Text>
                    <Text style={styles.modalItemSub}>
                      {t.employee_id} • {t.specialization}
                    </Text>
                  </View>
                  {t.hasFace ? (
                    <View style={styles.faceBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      <Text style={styles.faceBadgeText}>Registered</Text>
                    </View>
                  ) : (
                    <View style={[styles.faceBadge, { backgroundColor: '#FF980020' }]}>
                      <Ionicons name="alert-circle" size={14} color="#FF9800" />
                      <Text style={[styles.faceBadgeText, { color: '#FF9800' }]}>Not yet</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  loadingText: { marginTop: spacing.md, color: '#666', fontSize: typography.sizes.md },
  permissionText: { fontSize: typography.sizes.md, color: '#666', marginTop: spacing.md, textAlign: 'center' },
  grantBtn: {
    marginTop: spacing.lg, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 10,
  },
  grantBtnText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  selectorButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: 10, padding: spacing.md,
    marginBottom: spacing.md, elevation: 2,
  },
  selectorText: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  placeholder: { color: '#999' },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: 10,
    padding: spacing.md, marginBottom: spacing.md, elevation: 2,
  },
  statusText: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  cameraContainer: {
    height: 320, borderRadius: 16, overflow: 'hidden',
    marginBottom: spacing.md, backgroundColor: '#000',
  },
  camera: { flex: 1 },
  faceFrame: {
    position: 'absolute', top: '20%', left: '22%',
    width: '56%', height: '60%',
    borderWidth: 2, borderColor: colors.primary,
    borderRadius: 20, borderStyle: 'dashed',
  },
  faceHint: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
  },
  faceHintText: { color: '#fff', fontSize: typography.sizes.xs },
  captureBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: 10,
    gap: spacing.sm, marginBottom: spacing.md,
  },
  captureBtnText: { color: '#fff', fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  emptyContainer: { alignItems: 'center', padding: spacing.xxxl, backgroundColor: colors.white, borderRadius: 16 },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  modalItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalItemTitle: { fontSize: typography.sizes.md, color: colors.text, fontWeight: typography.weights.medium },
  modalItemSub: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  faceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#4CAF5020',
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 10,
  },
  faceBadgeText: { fontSize: typography.sizes.xs, color: '#4CAF50', fontWeight: typography.weights.medium },
});