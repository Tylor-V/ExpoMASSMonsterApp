import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { LIFT_CATEGORIES, LIFT_CATEGORY_ORDER } from '../constants/liftCategories';
import { LIFT_RATINGS, RatingMap } from '../constants/liftRatings';
import { ANIM_INSTANT } from '../animations';

type SplitDay = {
  title: string;
  lifts: string[];
  notes: string;
};

type WorkoutPlan = {
  name: string;
  startDate: string; // YYYY-MM-DD
  notes?: string;
  days: SplitDay[];
};

interface Props {
  initialSplit?: WorkoutPlan | null;
  onSave: (plan: WorkoutPlan) => void;
}

const SplitBuilder = ({ initialSplit, onSave }: Props) => {
  const insets = useSafeAreaInsets();
  const [builderStep, setBuilderStep] = useState<'split' | 'days' | 'lifts'>(
    initialSplit ? 'days' : 'split'
  );
  const [builder, setBuilder] = useState<{
    title: string;
    numDays: number;
    notes: string;
    days: SplitDay[];
    dayIndex: number;
  }>(() => {
    if (initialSplit) {
      return {
        title: initialSplit.name,
        numDays: initialSplit.days.length,
        notes: initialSplit.notes || '',
        days: initialSplit.days.map(d => ({
          ...d,
          title: d.title.replace(/\s*day$/i, '').trim(),
        })),
        dayIndex: -1,
      };
    }
    return { title: '', numDays: 0, notes: '', days: [], dayIndex: -1 };
  });
  const [missingSplitTitle, setMissingSplitTitle] = useState(false);
  const [invalidNumDays, setInvalidNumDays] = useState(false);
  const [missingDayTitles, setMissingDayTitles] = useState<number[]>([]);
  const splitShakeAnim = useRef(new Animated.Value(0)).current;
  const daysShakeAnim = useRef(new Animated.Value(0)).current;

  const [liftChoices, setLiftChoices] = useState<string[]>([]);
  const categories = useMemo(() => LIFT_CATEGORY_ORDER, []);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [pressedCategory, setPressedCategory] = useState<string | null>(null);
  const [catScrollX, setCatScrollX] = useState(0);
  const [catLayoutWidth, setCatLayoutWidth] = useState(0);
  const [catContentWidth, setCatContentWidth] = useState(0);

  const leftArrowOpacity = useMemo(() => {
    if (catContentWidth <= catLayoutWidth) return 0;
    const progress = Math.min(catScrollX / 40, 1);
    return 0.8 * progress;
  }, [catScrollX, catContentWidth, catLayoutWidth]);

  const rightArrowOpacity = useMemo(() => {
    if (catContentWidth <= catLayoutWidth) return 0;
    const remaining = catContentWidth - catLayoutWidth - catScrollX;
    const progress = Math.min(remaining / 40, 1);
    return 0.8 * progress;
  }, [catScrollX, catContentWidth, catLayoutWidth]);

  const triggerShake = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: -8, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 8, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -6, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 6, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -3, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: ANIM_INSTANT, useNativeDriver: true }),
    ]).start();
  };

  const continueSplitInfo = () => {
    if (!builder.title.trim()) {
      setMissingSplitTitle(true);
      triggerShake(splitShakeAnim);
      return;
    }
    if (builder.numDays < 3 || builder.numDays > 10) {
      setInvalidNumDays(true);
      triggerShake(splitShakeAnim);
      return;
    }
    const daysArr: SplitDay[] = [];
    for (let i = 0; i < builder.numDays; i++) {
      daysArr.push({ title: '', lifts: [], notes: '' });
    }
    setBuilder({ ...builder, days: daysArr, dayIndex: -1 });
    setMissingDayTitles([]);
    setBuilderStep('days');
  };

  const saveCustomPlan = () => {
    const missing: number[] = [];
    builder.days.forEach((d, i) => {
      if (!d.title.trim()) missing.push(i);
    });
    if (missing.length) {
      setMissingDayTitles(missing);
      triggerShake(daysShakeAnim);
      return;
    }
    const newPlan: WorkoutPlan = {
      name: builder.title,
      startDate: new Date().toISOString().slice(0, 10),
      notes: builder.notes,
      days: builder.days.map(d => {
        const baseTitle = d.title.trim().replace(/\s*day$/i, '').trim();
        return { ...d, title: `${baseTitle} Day` };
      }),
    };
    onSave(newPlan);
  };

  const openLiftBuilder = (idx: number) => {
    setLiftChoices(builder.days[idx].lifts);
    setSelectedCategory(categories[0]);
    setBuilder({ ...builder, dayIndex: idx });
    setBuilderStep('lifts');
  };

  const saveLifts = () => {
    if (builder.dayIndex < 0) return;
    const days = [...builder.days];
    days[builder.dayIndex] = { ...days[builder.dayIndex], lifts: liftChoices };
    setBuilder({ ...builder, days, dayIndex: -1 });
    setBuilderStep('days');
  };

  const toggleLift = (name: string) => {
    setLiftChoices(prev =>
      prev.includes(name)
        ? prev.filter(l => l !== name)
        : prev.length < 7
        ? [...prev, name]
        : prev,
    );
  };

  const selectCategory = (cat: string) => {
    setSelectedCategory(cat);
    setPressedCategory(cat);
    setTimeout(() => setPressedCategory(null), 100);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {builderStep !== 'split' && (
        <View style={styles.stepRow}>
          {['split', 'days', 'lifts'].map(step => (
            <View key={step} style={[styles.stepCircle, builderStep === step && styles.stepCircleActive]} />
          ))}
        </View>
      )}
      {builderStep === 'split' && (
        <View>
          <Text style={styles.label}>Split Name *</Text>
          <TextInput
            style={[styles.input, missingSplitTitle && styles.inputError]}
            placeholder="Split Name"
            placeholderTextColor="#888"
            value={builder.title}
            onChangeText={t => {
              setBuilder({ ...builder, title: t });
              if (t.trim().length > 0) setMissingSplitTitle(false);
            }}
            maxLength={30}
            keyboardType="default"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Text style={styles.label}>Days in Cycle *</Text>
          <TextInput
            style={[styles.input, invalidNumDays && styles.inputError]}
            placeholder="Days in cycle (3-10)"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={builder.numDays ? String(builder.numDays) : ''}
            onChangeText={t => {
              setBuilder({ ...builder, numDays: parseInt(t || '0', 10) });
              setInvalidNumDays(false);
            }}
          />
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Notes (optional)"
            placeholderTextColor="#888"
            value={builder.notes}
            onChangeText={t => setBuilder({ ...builder, notes: t })}
            maxLength={40}
            keyboardType="default"
            autoCapitalize="sentences"
            autoCorrect={false}
          />
          <Animated.View style={{ transform: [{ translateX: splitShakeAnim }] }}>
            <TouchableOpacity onPress={continueSplitInfo} style={styles.primaryBtn}>
              <Text style={styles.primaryTxt}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
      {builderStep === 'days' && (
        <View>
          {builder.days.map((d, idx) => (
            <View key={idx} style={styles.dayBox}>
              <Text style={styles.label}>{`Day ${idx + 1} Title *`}</Text>
              <View style={styles.dayTitleContainer}>
                <TextInput
                  style={[styles.input, styles.dayTitleInput, missingDayTitles.includes(idx) && styles.inputError]}
                  placeholder={`Day ${idx + 1} Title`}
                  placeholderTextColor="#888"
                  value={d.title}
                  onChangeText={t => {
                    const days = [...builder.days];
                    days[idx] = { ...days[idx], title: t };
                    setBuilder({ ...builder, days });
                    if (t.trim().length > 0) {
                      setMissingDayTitles(md => md.filter(i => i !== idx));
                    }
                  }}
                  keyboardType="default"
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={24}
                />
                <Text style={styles.dayTitleSuffix}>-Day</Text>
              </View>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Notes (optional)"
                placeholderTextColor="#888"
                value={d.notes}
                onChangeText={t => {
                  const days = [...builder.days];
                  days[idx] = { ...days[idx], notes: t };
                  setBuilder({ ...builder, days });
                }}
                maxLength={40}
                keyboardType="default"
                autoCapitalize="sentences"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.pickerBtn} onPress={() => openLiftBuilder(idx)}>
                <Text style={styles.pickerTxt}>Add Lifts</Text>
              </TouchableOpacity>
              {d.lifts.map((l, i) => (
                <Text key={i} style={styles.liftNote}>{l}</Text>
              ))}
              {idx < builder.days.length - 1 && <View style={styles.dayDivider} />}
            </View>
          ))}
          <Animated.View style={{ transform: [{ translateX: daysShakeAnim }] }}>
            <TouchableOpacity onPress={saveCustomPlan} style={styles.primaryBtn}>
              <Text style={styles.primaryTxt}>Save Plan</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
      {builderStep === 'lifts' && (
        <View>
          <View style={styles.categoryScrollContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={e => setCatScrollX(e.nativeEvent.contentOffset.x)}
              scrollEventThrottle={16}
              onLayout={e => setCatLayoutWidth(e.nativeEvent.layout.width)}
              onContentSizeChange={w => setCatContentWidth(w)}
              contentContainerStyle={styles.categoryRow}
            >
              {categories.map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => selectCategory(cat)}
                  style={({ pressed }) => [
                    styles.categoryBtn,
                    selectedCategory === cat && styles.categoryBtnActive,
                    (pressed || pressedCategory === cat) && styles.categoryBtnPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBtnText,
                      selectedCategory === cat && styles.categoryBtnTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Animated.View pointerEvents="none" style={[styles.catArrow, styles.catArrowLeft, { opacity: leftArrowOpacity }]}>
              <Icon name="chevron-back" size={20} color="#999" />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.catArrow, styles.catArrowRight, { opacity: rightArrowOpacity }]}>
              <Icon name="chevron-forward" size={20} color="#999" />
            </Animated.View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={styles.categoryHeader}>{selectedCategory}</Text>
            {LIFT_CATEGORIES[selectedCategory].map(name => {
              const rating: RatingMap = LIFT_RATINGS[selectedCategory][name];
              const selected = liftChoices.includes(name);
              const disabled = !selected && liftChoices.length >= 7;
              return (
                <Pressable
                  key={name}
                  onPress={() => toggleLift(name)}
                  style={[styles.liftCard, selected && styles.liftCardSelected, disabled && styles.liftCardDisabled]}
                  disabled={disabled}
                >
                  <Text style={styles.liftName}>{name}</Text>
                  {Object.keys(rating).map(h => (
                    <View key={h} style={styles.starRow}>
                      <Text style={styles.starLabel}>{h}</Text>
                      {[0,1,2,3,4].map(i => (
                        <Icon
                          key={i}
                          name={i < rating[h] ? 'star' : 'star-outline'}
                          size={14}
                          color={i < rating[h] ? colors.gold : '#ECECEC'}
                          style={{ marginHorizontal: 1 }}
                        />
                      ))}
                    </View>
                  ))}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              onPress={saveLifts}
              style={[styles.primaryBtn, styles.modalBtn]}
            >
              <Text style={styles.primaryTxt}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBuilderStep('days')}
              style={[styles.primaryBtn, styles.outlineBtn, styles.modalBtn, styles.modalBtnSpacing]}
            >
              <Text style={styles.outlineTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    backgroundColor: colors.white,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginHorizontal: 8,
  },
  stepCircleActive: {
    backgroundColor: colors.gold,
    borderWidth: 0,
  },
  label: {
    color: colors.textDark,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: fonts.semiBold,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderColor: '#ccc',
    borderWidth: 1,
    color: colors.textDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  inputError: {
    borderColor: colors.error,
  },
  primaryBtn: {
    backgroundColor: colors.purple,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryTxt: { color: colors.white, fontWeight: 'bold' },
  outlineBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  outlineTxt: { color: colors.textDark, fontWeight: 'bold' },
  dayBox: { marginBottom: 12 },
  dayTitleContainer: { position: 'relative' },
  dayTitleInput: { paddingRight: 40 },
  dayTitleSuffix: {
    position: 'absolute',
    right: 16,
    top: 8,
    color: '#888',
    pointerEvents: 'none',
  },
  pickerBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pickerTxt: { color: colors.black, fontWeight: 'bold' },
  liftNote: { color: colors.textDark, marginLeft: 8, marginTop: 2 },
  dayDivider: { height: 2, backgroundColor: colors.gold, marginVertical: 14 },
  categoryScrollContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  categoryRow: { flexDirection: 'row', paddingHorizontal: 10 },
  categoryBtn: { paddingVertical: 6, paddingHorizontal: 12, marginHorizontal: 6, borderRadius: 16 },
  categoryBtnActive: {},
  categoryBtnPressed: { backgroundColor: '#eee', transform: [{ scale: 0.95 }] },
  categoryBtnText: { fontSize: 15, fontWeight: 'bold', color: '#888' },
  categoryBtnTextActive: { color: colors.accent },
  catArrow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    width: 24,
  },
  catArrowLeft: { left: 0 },
  catArrowRight: { right: 0, alignItems: 'flex-end' },
  categoryHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 12,
  },
  liftCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    marginVertical: 8,
  },
  liftCardSelected: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  liftCardDisabled: {
    opacity: 0.4,
  },
  liftName: { fontSize: 16, fontWeight: 'bold', color: colors.textDark },
  starRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  starLabel: { fontSize: 12, color: '#888', marginRight: 4 },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalBtn: { flex: 1 },
  modalBtnSpacing: { marginLeft: 10 },
});

export default SplitBuilder;