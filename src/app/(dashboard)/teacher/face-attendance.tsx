import { supabase } from '@/lib/supabase/client';
import { compareFaceTokens, getFaceTokenFromBase64 } from '@/lib/utils/faceFingerprint';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TIME CONSTANTS
// ============================================
const TIME_IN_CUTOFF_HOUR = 8;
const TIME_OUT_START_HOUR = 17;
const TIME_OUT_END_HOUR = 8;

// ============================================
// PHILIPPINE TIME HELPERS (UTC+8)
// ============================================
const PHT_OFFSET_HOURS = 8;

const getPHTDate = (d: Date = new Date()): Date => {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + PHT_OFFSET_HOURS * 3600000);
};

const getPHTDateString = (d: Date = new Date()): string => {
  const pht = getPHTDate(d);
  const y = pht.getFullYear();
  const m = String(pht.getMonth() + 1).padStart(2, '0');
  const day = String(pht.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatPHTTime = (input: Date | string | null): string => {
  if (!input) return '--:--';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '--:--';

  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const pht = new Date(utc + PHT_OFFSET_HOURS * 3600000);

  let h = pht.getHours();
  const m = String(pht.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const formatPHTDate = (input: string | Date): string => {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '--';

  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const pht = new Date(utc + PHT_OFFSET_HOURS * 3600000);

  return pht.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatPHTLongDate = (input: string | Date): string => {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '--';

  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const pht = new Date(utc + PHT_OFFSET_HOURS * 3600000);

  return pht.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// ============================================
// TYPES
// ============================================
type TeacherAttendance = {
  id?: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  in_status: string | null;
  out_status: string | null;
};

export default function FaceAttendance() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [checking, setChecking] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherFaceToken, setTeacherFaceToken] = useState<string | null>(null);
  const [lastSimilarity, setLastSimilarity] = useState<number | null>(null);
  const [action, setAction] = useState<'in' | 'out' | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TeacherAttendance | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<TeacherAttendance[]>([]);

  useEffect(() => { checkRegistration(); }, []);

  const checkRegistration = async () => {
    setChecking(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setChecking(false); return; }

      const { data: userData } = await supabase
        .from('users').select('*').eq('email', email).single();
      if (!userData) { setChecking(false); return; }

      const { data: teacherData } = await supabase
        .from('teachers').select('id').eq('user_id', userData.id).maybeSingle();
      if (!teacherData) { setChecking(false); return; }

      setTeacherId(teacherData.id);

      const { data: faceData } = await supabase
        .from('teacher_faces')
        .select('face_fingerprint')
        .eq('teacher_id', teacherData.id)
        .maybeSingle();

      if (faceData?.face_fingerprint) {
        setTeacherFaceToken(faceData.face_fingerprint);
      }

      const today = getPHTDateString();
      const { data: todayData } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', teacherData.id)
        .eq('date', today)
        .maybeSingle();

      setTodayAttendance(todayData || null);

      const { data: recent } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', teacherData.id)
        .order('date', { ascending: false })
        .limit(7);

      setRecentAttendance(recent || []);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  const verifyFace = async (mode: 'in' | 'out') => {
    if (!cameraRef.current || !teacherFaceToken || !teacherId) return;
    setAction(mode);
    setVerifying(true);
    try {
      // 1. Capture URI-only photo (no base64 here)
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.7,
        skipProcessing: false,
        exif: false,
      });

      if (!photo?.uri) throw new Error('Failed to capture');

      console.log('📷 Original:', photo.width, 'x', photo.height, photo.uri);

      // 2. Resize to 480px wide — required for Face++ (min 48×48)
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
      console.log('📷 Preview:', resized.base64.substring(0, 50));

      // 3. Get face_token from Face++
      const newToken = await getFaceTokenFromBase64(resized.base64);

      if (!newToken) {
        Alert.alert(
          'No Face Detected',
          'Face++ could not detect a face. Please ensure good lighting and look directly at the camera.'
        );
        return;
      }

      // 4. Compare against registered token
      const confidence = await compareFaceTokens(newToken, teacherFaceToken);

      if (confidence === null) {
        Alert.alert('Verification Error', 'Face++ comparison failed. Please try again.');
        return;
      }

      setLastSimilarity(confidence);

      if (confidence < 80) {
        Alert.alert(
          'Face Did Not Match',
          `Confidence: ${confidence.toFixed(1)}% (need 80%+)\n\nThis is not the registered face.`
        );
        return;
      }

      if (mode === 'in') {
        await recordTimeIn();
      } else {
        await recordTimeOut();
      }
    } catch (e: any) {
      Alert.alert('Capture Failed', e.message);
    } finally {
      setVerifying(false);
      setAction(null);
    }
  };

  const recordTimeIn = async () => {
    if (!teacherId) return;

    if (todayAttendance?.time_in) {
      Alert.alert(
        'Already Timed In',
        `You already recorded your Time In at ${formatPHTTime(todayAttendance.time_in)} today.`
      );
      return;
    }

    const now = new Date();
    const pht = getPHTDate(now);
    const today = getPHTDateString(now);

    const hour = pht.getHours();
    const minute = pht.getMinutes();
    const isLate = hour > TIME_IN_CUTOFF_HOUR ||
                   (hour === TIME_IN_CUTOFF_HOUR && minute > 0);
    const status = isLate ? 'Late' : 'Present';

    const { data, error } = await supabase
      .from('teacher_attendance')
      .upsert({
        teacher_id: teacherId,
        date: today,
        time_in: now.toISOString(),
        in_status: status,
      }, { onConflict: 'teacher_id,date' })
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setTodayAttendance(data);
    setVerified(true);

    Alert.alert(
      'Time In Recorded',
      `Status: ${status}\nTime: ${formatPHTTime(now)} (PHT)\nFace++ Confidence: ${lastSimilarity?.toFixed(1)}%\n\n${
        isLate
          ? '⚠️ You are late (after 8:00 AM).'
          : '✅ You are on time!'
      }`,
      [{ text: 'OK' }]
    );
  };

  const recordTimeOut = async () => {
    if (!teacherId || !todayAttendance) return;

    if (todayAttendance.time_out) {
      Alert.alert(
        'Already Timed Out',
        `You already recorded your Time Out at ${formatPHTTime(todayAttendance.time_out)} today.`
      );
      return;
    }

    const now = new Date();
    const pht = getPHTDate(now);
    const hour = pht.getHours();

    const isEveningWindow = hour >= TIME_OUT_START_HOUR;
    const isMorningWindow = hour < TIME_OUT_END_HOUR;
    const isAllowed = isEveningWindow || isMorningWindow;

    if (!isAllowed) {
      Alert.alert(
        'Time Out Not Allowed Now',
        `It is currently ${formatPHTTime(now)} (PHT).\n\nTime Out is only allowed:\n• 5:00 PM – 11:59 PM\n• 12:00 AM – 7:59 AM`,
        [{ text: 'OK' }]
      );
      return;
    }

    const status = isEveningWindow ? 'Completed' : 'Overnight Out';

    const { data, error } = await supabase
      .from('teacher_attendance')
      .update({
        time_out: now.toISOString(),
        out_status: status,
      })
      .eq('teacher_id', teacherId)
      .eq('date', todayAttendance.date)
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setTodayAttendance(data);
    setVerified(true);

    Alert.alert(
      'Time Out Recorded',
      `Status: ${status}\nTime: ${formatPHTTime(now)} (PHT)`,
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Present': return '#4CAF50';
      case 'Late': return '#FF9800';
      case 'Completed': return '#4CAF50';
      case 'Overnight Out': return '#2196F3';
      case 'Early Out': return '#F44336';
      default: return '#999';
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={60} color="#ccc" />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (checking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Checking registration...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!teacherFaceToken) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF9800" />
          <Text style={styles.errorTitle}>Face Not Registered</Text>
          <Text style={styles.errorText}>
            Ask the admin to register your face first.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasTimedIn = !!todayAttendance?.time_in;
  const hasTimedOut = !!todayAttendance?.time_out;
  const isDayComplete = hasTimedIn && hasTimedOut;
  const canTimeIn = !hasTimedIn;
  const canTimeOut = hasTimedIn && !hasTimedOut;

  // ============ DAY COMPLETE SCREEN ============
  if (isDayComplete && !verified) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>My Attendance</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.completeCard}>
            <Ionicons name="checkmark-done-circle" size={70} color="#4CAF50" />
            <Text style={styles.completeTitle}>Attendance Complete!</Text>
            <Text style={styles.completeText}>
              You have already timed in and out today.
            </Text>
          </View>

          {todayAttendance ? (
            <View style={styles.todayCard}>
              <Text style={styles.todayTitle}>Today's Record</Text>
              <Text style={styles.todayDate}>
                {formatPHTLongDate(todayAttendance.date)}
              </Text>

              <View style={styles.todayRow}>
                <View style={styles.todayCol}>
                  <Ionicons name="log-in" size={22} color="#4CAF50" />
                  <Text style={styles.todayLabel}>Time In</Text>
                  <Text style={styles.todayTime}>
                    {formatPHTTime(todayAttendance.time_in)}
                  </Text>
                  {todayAttendance.in_status ? (
                    <View style={[styles.statusPill, {
                      backgroundColor: getStatusColor(todayAttendance.in_status) + '20'
                    }]}>
                      <Text style={[styles.statusPillText, {
                        color: getStatusColor(todayAttendance.in_status)
                      }]}>
                        {todayAttendance.in_status}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.todayDivider} />
                <View style={styles.todayCol}>
                  <Ionicons name="log-out" size={22} color="#F44336" />
                  <Text style={styles.todayLabel}>Time Out</Text>
                  <Text style={styles.todayTime}>
                    {formatPHTTime(todayAttendance.time_out)}
                  </Text>
                  {todayAttendance.out_status ? (
                    <View style={[styles.statusPill, {
                      backgroundColor: getStatusColor(todayAttendance.out_status) + '20'
                    }]}>
                      <Text style={[styles.statusPillText, {
                        color: getStatusColor(todayAttendance.out_status)
                      }]}>
                        {todayAttendance.out_status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.lockedNote}>
                <Ionicons name="lock-closed" size={14} color="#666" />
                <Text style={styles.lockedText}>
                  Attendance for today is locked (Philippine Time)
                </Text>
              </View>
            </View>
          ) : null}

          {recentAttendance.length > 0 ? (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>
                <Ionicons name="time" size={18} color={colors.primary} /> Recent Attendance
              </Text>
              {recentAttendance.map(a => (
                <View key={a.date} style={styles.historyItem}>
                  <View style={styles.historyDateCol}>
                    <Text style={styles.historyDate}>{formatPHTDate(a.date)}</Text>
                  </View>
                  <View style={styles.historyTimesCol}>
                    <Text style={styles.historyTime}>
                      In: {formatPHTTime(a.time_in)}
                    </Text>
                    <Text style={styles.historyTime}>
                      Out: {formatPHTTime(a.time_out)}
                    </Text>
                  </View>
                  <View style={styles.historyStatusCol}>
                    {a.in_status ? (
                      <View style={[styles.statusPill, {
                        backgroundColor: getStatusColor(a.in_status) + '20'
                      }]}>
                        <Text style={[styles.statusPillText, {
                          color: getStatusColor(a.in_status)
                        }]}>
                          {a.in_status}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============ VERIFIED (JUST RECORDED) SCREEN ============
  if (verified) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Attendance</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={70} color="#4CAF50" />
            <Text style={styles.successTitle}>Recorded!</Text>
            <Text style={styles.successText}>
              Face++ Confidence: {lastSimilarity?.toFixed(1)}%
            </Text>
          </View>

          {todayAttendance ? (
            <View style={styles.todayCard}>
              <Text style={styles.todayTitle}>Today's Attendance</Text>
              <View style={styles.todayRow}>
                <View style={styles.todayCol}>
                  <Ionicons name="log-in" size={22} color="#4CAF50" />
                  <Text style={styles.todayLabel}>Time In</Text>
                  <Text style={styles.todayTime}>
                    {formatPHTTime(todayAttendance.time_in)}
                  </Text>
                  {todayAttendance.in_status ? (
                    <View style={[styles.statusPill, {
                      backgroundColor: getStatusColor(todayAttendance.in_status) + '20'
                    }]}>
                      <Text style={[styles.statusPillText, {
                        color: getStatusColor(todayAttendance.in_status)
                      }]}>
                        {todayAttendance.in_status}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.todayDivider} />
                <View style={styles.todayCol}>
                  <Ionicons name="log-out" size={22} color="#F44336" />
                  <Text style={styles.todayLabel}>Time Out</Text>
                  <Text style={styles.todayTime}>
                    {formatPHTTime(todayAttendance.time_out)}
                  </Text>
                  {todayAttendance.out_status ? (
                    <View style={[styles.statusPill, {
                      backgroundColor: getStatusColor(todayAttendance.out_status) + '20'
                    }]}>
                      <Text style={[styles.statusPillText, {
                        color: getStatusColor(todayAttendance.out_status)
                      }]}>
                        {todayAttendance.out_status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setVerified(false);
              checkRegistration();
            }}
          >
            <Ionicons name="scan" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============ MAIN SCREEN ============
  const phtNow = getPHTDate(new Date());

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>My Attendance</Text>
          <TouchableOpacity onPress={checkRegistration} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.statusCardTitle}>
              {phtNow.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })} (PHT)
            </Text>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Ionicons name="log-in" size={22} color="#4CAF50" />
              <Text style={styles.statusLabel}>Time In</Text>
              <Text style={styles.statusValue}>
                {todayAttendance?.time_in ? formatPHTTime(todayAttendance.time_in) : '--:--'}
              </Text>
              {todayAttendance?.in_status ? (
                <View style={[styles.statusPill, {
                  backgroundColor: getStatusColor(todayAttendance.in_status) + '20'
                }]}>
                  <Text style={[styles.statusPillText, {
                    color: getStatusColor(todayAttendance.in_status)
                  }]}>
                    {todayAttendance.in_status}
                  </Text>
                </View>
              ) : (
                <Text style={styles.statusPending}>Pending</Text>
              )}
            </View>

            <View style={styles.statusItem}>
              <Ionicons name="log-out" size={22} color="#F44336" />
              <Text style={styles.statusLabel}>Time Out</Text>
              <Text style={styles.statusValue}>
                {todayAttendance?.time_out ? formatPHTTime(todayAttendance.time_out) : '--:--'}
              </Text>
              {todayAttendance?.out_status ? (
                <View style={[styles.statusPill, {
                  backgroundColor: getStatusColor(todayAttendance.out_status) + '20'
                }]}>
                  <Text style={[styles.statusPillText, {
                    color: getStatusColor(todayAttendance.out_status)
                  }]}>
                    {todayAttendance.out_status}
                  </Text>
                </View>
              ) : (
                <Text style={styles.statusPending}>Pending</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={styles.rulesTitle}>Attendance Rules (PHT)</Text>
          </View>
          <View style={styles.ruleRow}>
            <View style={[styles.ruleDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.ruleText}>
              <Text style={styles.ruleBold}>Time In before 8:00 AM</Text> → Present
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <View style={[styles.ruleDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.ruleText}>
              <Text style={styles.ruleBold}>Time In after 8:00 AM</Text> → Late
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <View style={[styles.ruleDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.ruleText}>
              <Text style={styles.ruleBold}>Time Out 5:00 PM – 11:59 PM</Text> → Completed
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <View style={[styles.ruleDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.ruleText}>
              <Text style={styles.ruleBold}>Time Out 12:00 AM – 7:59 AM</Text> → Overnight Out
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <View style={[styles.ruleDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.ruleText}>
              <Text style={styles.ruleBold}>Time Out 8:00 AM – 4:59 PM</Text> → Not allowed
            </Text>
          </View>
        </View>

        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <View style={styles.faceFrame} />
          <View style={styles.faceHint}>
            <Ionicons name="person-circle-outline" size={14} color="#fff" />
            <Text style={styles.faceHintText}>Position your face inside the frame</Text>
          </View>
        </View>

        {lastSimilarity !== null ? (
          <Text style={styles.similarityText}>
            Last confidence: {lastSimilarity.toFixed(1)}%
          </Text>
        ) : null}

        {hasTimedIn && hasTimedOut ? (
          <View style={styles.lockedBanner}>
            <Ionicons name="lock-closed" size={20} color="#4CAF50" />
            <Text style={styles.lockedBannerText}>
              Day complete — attendance locked for today
            </Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: canTimeIn ? '#4CAF50' : '#ccc' },
              ]}
              onPress={() => verifyFace('in')}
              disabled={!canTimeIn || verifying}
            >
              {verifying && action === 'in' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={canTimeIn ? 'log-in' : 'lock-closed'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.actionBtnText}>
                    {canTimeIn ? 'Time In' : 'Timed In'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: canTimeOut ? '#F44336' : '#ccc' },
              ]}
              onPress={() => verifyFace('out')}
              disabled={!canTimeOut || verifying}
            >
              {verifying && action === 'out' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={canTimeOut ? 'log-out' : 'lock-closed'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.actionBtnText}>
                    {canTimeOut ? 'Time Out' : hasTimedOut ? 'Timed Out' : 'Locked'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {recentAttendance.length > 0 ? (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>
              <Ionicons name="time" size={18} color={colors.primary} /> Recent Attendance
            </Text>
            {recentAttendance.map(a => (
              <View key={a.date} style={styles.historyItem}>
                <View style={styles.historyDateCol}>
                  <Text style={styles.historyDate}>{formatPHTDate(a.date)}</Text>
                </View>
                <View style={styles.historyTimesCol}>
                  <Text style={styles.historyTime}>
                    In: {formatPHTTime(a.time_in)}
                  </Text>
                  <Text style={styles.historyTime}>
                    Out: {formatPHTTime(a.time_out)}
                  </Text>
                </View>
                <View style={styles.historyStatusCol}>
                  {a.in_status ? (
                    <View style={[styles.statusPill, {
                      backgroundColor: getStatusColor(a.in_status) + '20'
                    }]}>
                      <Text style={[styles.statusPillText, {
                        color: getStatusColor(a.in_status)
                      }]}>
                        {a.in_status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  loadingText: { marginTop: spacing.md, color: '#666', fontSize: typography.sizes.md },
  permissionText: { fontSize: typography.sizes.md, color: '#666', marginTop: spacing.md, textAlign: 'center' },
  errorTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.md },
  errorText: { fontSize: typography.sizes.sm, color: '#666', textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  grantBtn: {
    marginTop: spacing.lg, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 10,
  },
  grantBtnText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  backBtn: {
    marginTop: spacing.lg, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 10,
  },
  backBtnText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },

  completeCard: {
    backgroundColor: colors.white, borderRadius: 16,
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md,
    elevation: 2,
  },
  completeTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: '#4CAF50',
    marginTop: spacing.md,
  },
  completeText: {
    fontSize: typography.sizes.sm,
    color: '#666',
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  statusCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: spacing.md,
    marginBottom: spacing.md, elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statusCardTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text },
  statusGrid: { flexDirection: 'row' },
  statusItem: { flex: 1, alignItems: 'center', gap: 4 },
  statusLabel: { fontSize: typography.sizes.xs, color: '#666' },
  statusValue: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text },
  statusPending: { fontSize: typography.sizes.xs, color: '#999', fontStyle: 'italic' },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  statusPillText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },

  rulesCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.md, elevation: 2,
  },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  rulesTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  ruleDot: { width: 8, height: 8, borderRadius: 4 },
  ruleText: { flex: 1, fontSize: typography.sizes.xs, color: '#666' },
  ruleBold: { fontWeight: typography.weights.semibold, color: colors.text },

  cameraContainer: {
    height: 300, borderRadius: 16, overflow: 'hidden',
    marginBottom: spacing.sm, backgroundColor: '#000',
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
  similarityText: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    color: '#666',
    marginBottom: spacing.sm,
  },

  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: spacing.md, borderRadius: 10, gap: spacing.sm,
  },
  actionBtnText: { color: '#fff', fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },

  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#4CAF5020',
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#4CAF5040',
  },
  lockedBannerText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: '#4CAF50',
  },
  lockedNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  lockedText: { fontSize: typography.sizes.xs, color: '#666' },

  successCard: {
    backgroundColor: colors.white, borderRadius: 16,
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md,
    elevation: 2,
  },
  successTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.md },
  successText: { fontSize: typography.sizes.sm, color: '#666', marginTop: spacing.xs },

  todayCard: {
    backgroundColor: colors.white, borderRadius: 16,
    padding: spacing.lg, marginBottom: spacing.md, elevation: 2,
  },
  todayTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  todayDate: { fontSize: typography.sizes.xs, color: '#666', textAlign: 'center', marginBottom: spacing.md },
  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayCol: { flex: 1, alignItems: 'center', gap: 4 },
  todayDivider: { width: 1, height: 80, backgroundColor: colors.border },
  todayLabel: { fontSize: typography.sizes.xs, color: '#666' },
  todayTime: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: 10,
    gap: spacing.sm, marginBottom: spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  secondaryBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, padding: spacing.md, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  secondaryBtnText: { color: colors.text, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },

  historySection: { marginTop: spacing.md, marginBottom: spacing.lg },
  historyTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.sm },
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 10,
    padding: spacing.md, marginBottom: spacing.xs, elevation: 1,
  },
  historyDateCol: { flex: 1.2 },
  historyDate: { fontSize: typography.sizes.sm, color: colors.text, fontWeight: typography.weights.medium },
  historyTimesCol: { flex: 1.3 },
  historyTime: { fontSize: typography.sizes.xs, color: '#666' },
  historyStatusCol: { flex: 1, alignItems: 'flex-end' },
});