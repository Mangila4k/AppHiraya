import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Teacher = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
};

export default function CreateSection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState({
    grade_level: '',
    section_letter: '',
    strand: '',
    adviser_id: '',
    room: '',
  });

  const gradeLevels = ['7', '8', '9', '10', '11', '12'];
  const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const strands = ['HUMSS', 'GAS', 'STEM', 'ABM', 'TVL-Cookery', 'TVL-ICT', 'TVL-HE'];

  // Show strand only for Grade 11 and 12
  const showStrand = form.grade_level === '11' || form.grade_level === '12';

  // Generate section name based on grade level and letter
  const getSectionName = () => {
    if (!form.grade_level || !form.section_letter) return '';
    return `${form.grade_level} - ${form.section_letter}`;
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          users:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (teachersError) throw teachersError;

      if (teachersData) {
        const formattedTeachers = teachersData.map((item: any) => {
          const user = item.users;
          return {
            id: item.id,
            user_id: item.user_id,
            full_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
            email: user?.email || 'No email',
          };
        });
        setTeachers(formattedTeachers);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  // Check if section already exists for this grade level and letter
  const checkSectionExists = async (gradeLevel: string, letter: string) => {
    try {
      const sectionName = `${gradeLevel} - ${letter}`;
      const { data, error } = await supabase
        .from('sections')
        .select('id, name')
        .eq('name', sectionName)
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    } catch (error) {
      console.error('Error checking section:', error);
      return false;
    }
  };

  // Check if adviser is already assigned to another section
  const checkAdviserAssigned = async (adviserId: string) => {
    if (!adviserId) return false;
    
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name')
        .eq('adviser_id', adviserId)
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    } catch (error) {
      console.error('Error checking adviser:', error);
      return false;
    }
  };

  // Check if room is already occupied
  const checkRoomOccupied = async (room: string) => {
    if (!room) return false;
    
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, room')
        .eq('room', room)
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    } catch (error) {
      console.error('Error checking room:', error);
      return false;
    }
  };

  // Get available section letters for a grade level
  const getAvailableLetters = async (gradeLevel: string) => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('name')
        .ilike('name', `${gradeLevel} - %`);

      if (error) throw error;

      const existingLetters = data?.map((item: any) => {
        const parts = item.name.split(' - ');
        return parts.length > 1 ? parts[1] : '';
      }) || [];

      const available = sectionLetters.filter(letter => !existingLetters.includes(letter));
      return available;
    } catch (error) {
      console.error('Error getting available letters:', error);
      return sectionLetters;
    }
  };

  const [availableLetters, setAvailableLetters] = useState<string[]>(sectionLetters);

  useEffect(() => {
    const updateAvailableLetters = async () => {
      if (form.grade_level) {
        const available = await getAvailableLetters(form.grade_level);
        setAvailableLetters(available);
        // Reset section letter if current selection is not available
        if (form.section_letter && !available.includes(form.section_letter)) {
          setForm(prev => ({ ...prev, section_letter: '' }));
        }
      } else {
        setAvailableLetters(sectionLetters);
      }
    };
    updateAvailableLetters();
  }, [form.grade_level]);

  const handleSubmit = async () => {
    if (!form.grade_level || !form.section_letter) {
      Alert.alert('Error', 'Please select both Grade Level and Section Letter');
      return;
    }

    const sectionName = getSectionName();

    // Validate section doesn't already exist
    const sectionExists = await checkSectionExists(form.grade_level, form.section_letter);
    if (sectionExists) {
      Alert.alert(
        'Section Already Exists', 
        `Section "${sectionName}" already exists. Please choose a different letter.`
      );
      return;
    }

    // Validate adviser is not already assigned to another section
    if (form.adviser_id) {
      const adviserAssigned = await checkAdviserAssigned(form.adviser_id);
      if (adviserAssigned) {
        const adviserName = teachers.find(t => t.id === form.adviser_id)?.full_name || 'Selected adviser';
        Alert.alert(
          'Adviser Already Assigned', 
          `${adviserName} is already assigned to another section. Please select a different adviser.`
        );
        return;
      }
    }

    // Validate room is not already occupied
    if (form.room) {
      const roomOccupied = await checkRoomOccupied(form.room);
      if (roomOccupied) {
        Alert.alert(
          'Room Already Occupied', 
          `Room ${form.room} is already assigned to another section. Please use a different room.`
        );
        return;
      }
    }

    setLoading(true);
    try {
      // Removed is_active column since it doesn't exist
      const { error } = await supabase
        .from('sections')
        .insert({
          name: sectionName,
          grade_level: form.grade_level,
          strand: showStrand ? form.strand || null : null,
          adviser_id: form.adviser_id || null,
          room: form.room || null,
        });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      Alert.alert('✅ Section Created!', `Section "${sectionName}" has been created successfully.`, [
        { text: 'OK', onPress: () => router.push('./sections') }
      ]);
    } catch (error: any) {
      console.error('Error creating section:', error);
      Alert.alert('Error', error.message || 'Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  const QuickAdd = ({ grade, letter, strand }: { grade: string; letter: string; strand?: string }) => (
    <TouchableOpacity
      style={styles.quickButton}
      onPress={() => setForm({ 
        ...form, 
        grade_level: grade, 
        section_letter: letter,
        strand: strand || ''
      })}
    >
      <Text style={styles.quickButtonText}>
        Grade {grade} - {letter} {strand ? `(${strand})` : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Section</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Section Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Grade Level <Text style={styles.required}>*</Text></Text>
            <View style={styles.gradeContainer}>
              {gradeLevels.map((grade) => (
                <TouchableOpacity
                  key={grade}
                  style={[styles.gradeOption, form.grade_level === grade && styles.gradeOptionActive]}
                  onPress={() => {
                    setForm({ ...form, grade_level: grade, section_letter: '', strand: '' });
                  }}
                >
                  <Text style={[styles.gradeText, form.grade_level === grade && styles.gradeTextActive]}>
                    Grade {grade}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {form.grade_level ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Section Letter <Text style={styles.required}>*</Text></Text>
              <Text style={styles.helperText}>
                Available letters: {availableLetters.join(', ')}
                {availableLetters.length === 0 ? ' (All sections taken for this grade level)' : ''}
              </Text>
              <View style={styles.letterContainer}>
                {sectionLetters.map((letter) => {
                  const isAvailable = availableLetters.includes(letter);
                  const isSelected = form.section_letter === letter;
                  return (
                    <TouchableOpacity
                      key={letter}
                      style={[
                        styles.letterOption,
                        isSelected && styles.letterOptionActive,
                        !isAvailable && styles.letterOptionDisabled,
                      ]}
                      onPress={() => {
                        if (isAvailable) {
                          setForm({ ...form, section_letter: letter });
                        }
                      }}
                      disabled={!isAvailable}
                    >
                      <Text
                        style={[
                          styles.letterText,
                          isSelected && styles.letterTextActive,
                          !isAvailable && styles.letterTextDisabled,
                        ]}
                      >
                        {letter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {form.section_letter ? (
                <Text style={styles.sectionNamePreview}>
                  Section Name: <Text style={styles.sectionNameHighlight}>{getSectionName()}</Text>
                </Text>
              ) : null}
            </View>
          ) : null}

          {showStrand ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Strand</Text>
              <View style={styles.strandContainer}>
                {strands.map((strand) => (
                  <TouchableOpacity
                    key={strand}
                    style={[styles.strandOption, form.strand === strand && styles.strandOptionActive]}
                    onPress={() => setForm({ ...form, strand: strand })}
                  >
                    <Text style={[styles.strandText, form.strand === strand && styles.strandTextActive]}>
                      {strand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class Adviser</Text>
            <View style={styles.adviserWrapper}>
              <TouchableOpacity
                style={[styles.adviserOption, !form.adviser_id && styles.adviserOptionActive]}
                onPress={() => setForm({ ...form, adviser_id: '' })}
              >
                <Text style={[styles.adviserText, !form.adviser_id && styles.adviserTextActive]}>
                  No Adviser
                </Text>
              </TouchableOpacity>
              <View style={styles.adviserGrid}>
                {teachers.map((teacher) => (
                  <TouchableOpacity
                    key={teacher.id}
                    style={[styles.adviserOption, form.adviser_id === teacher.id && styles.adviserOptionActive]}
                    onPress={() => setForm({ ...form, adviser_id: teacher.id })}
                  >
                    <Text style={[styles.adviserText, form.adviser_id === teacher.id && styles.adviserTextActive]}>
                      {teacher.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Room</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Room 101"
              placeholderTextColor="#999"
              value={form.room}
              onChangeText={(text) => setForm({ ...form, room: text })}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Section Rules:</Text>
              </Text>
              <Text style={styles.infoText}>• Each section can have 30-35 students</Text>
              <Text style={styles.infoText}>• Sections follow format: Grade - Letter (e.g., 11 - A)</Text>
              <Text style={styles.infoText}>• Each letter can only be used once per grade level</Text>
              <Text style={styles.infoText}>• A teacher can only be adviser of one section</Text>
              <Text style={styles.infoText}>• A room can only be used by one section</Text>
              <Text style={styles.infoText}>• Strand is only required for Grade 11-12</Text>
            </View>
          </View>

          <View style={styles.quickSection}>
            <Text style={styles.quickTitle}>Quick Add Common Sections</Text>
            <View style={styles.quickGrid}>
              <QuickAdd grade="7" letter="A" />
              <QuickAdd grade="7" letter="B" />
              <QuickAdd grade="8" letter="A" />
              <QuickAdd grade="8" letter="B" />
              <QuickAdd grade="11" letter="A" strand="STEM" />
              <QuickAdd grade="11" letter="B" strand="ABM" />
              <QuickAdd grade="12" letter="A" strand="HUMSS" />
              <QuickAdd grade="12" letter="B" strand="GAS" />
            </View>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Section Preview</Text>
            <View style={styles.previewContent}>
              <Ionicons name="people" size={32} color={colors.primary} />
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>
                  {getSectionName() || 'Select Grade and Letter'}
                </Text>
                <Text style={styles.previewDetails}>
                  {form.grade_level ? `Grade ${form.grade_level}` : 'No Grade Selected'}
                  {showStrand && form.strand ? ` • ${form.strand}` : ''}
                  {'\n'}
                  Adviser: {form.adviser_id ? teachers.find(t => t.id === form.adviser_id)?.full_name || 'Selected' : 'No Adviser'}
                  {form.room ? ` • Room: ${form.room}` : ''}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <Ionicons name="save" size={20} color={colors.white} />
            <Text style={styles.submitText}>{loading ? 'Creating...' : 'Create Section'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.text,
    backgroundColor: colors.gray,
  },
  gradeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gradeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
  },
  gradeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gradeText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  gradeTextActive: {
    color: colors.white,
  },
  helperText: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginBottom: spacing.sm,
  },
  letterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  letterOption: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  letterOptionDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
    opacity: 0.5,
  },
  letterText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  letterTextActive: {
    color: colors.white,
  },
  letterTextDisabled: {
    color: '#999',
  },
  sectionNamePreview: {
    fontSize: typography.sizes.sm,
    color: '#666',
    marginTop: spacing.sm,
  },
  sectionNameHighlight: {
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  strandContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  strandOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
  },
  strandOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  strandText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  strandTextActive: {
    color: colors.white,
  },
  adviserWrapper: {
    flexDirection: 'column',
  },
  adviserGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  adviserOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
    marginRight: spacing.sm,
  },
  adviserOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  adviserText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  adviserTextActive: {
    color: colors.white,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  quickSection: {
    marginVertical: spacing.md,
  },
  quickTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: '#666',
    marginBottom: spacing.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  quickButtonText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
  },
  previewCard: {
    backgroundColor: colors.gray,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  previewTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: '#666',
    marginBottom: spacing.sm,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewInfo: {
    marginLeft: spacing.md,
  },
  previewName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  previewDetails: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
  },
  submitText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});