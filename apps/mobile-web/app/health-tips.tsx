import React, { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView,  StyleSheet, Text, View, useWindowDimensions, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useClinicTheme } from '../src/lib/clinicTheme';
import { ClinicHealthTip, MoodType, getHealthTipMatchLabel, scoreHealthTip, scoreHealthTipForMood, } from '../src/lib/healthTips';
import ClinicNavbar from '../src/common/ClinicNavbar';
import InfoSearchBar from '../src/common/InfoSearchBar';
import InfoPreviewCard from '../src/common/InfoPreviewCard';
import InfoModal from '../src/common/InfoModal';
import DropdownMenu from '../src/common/DropdownMenu';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';

type FeedbackReaction = 'helpful' | 'saved' | 'done';

type FeedbackItem = {

  reaction: FeedbackReaction;
  created_at: string;

};

type PatientProfile = {

  id: string;
  role: string | null;
  birth_date: string | null;
  gender: string | null;
  allergies: string | null;
  chronic_conditions: string | null;

};

type TipCard = ClinicHealthTip & {

  matchScore: number;
  matchLabel: string;

};

type TabType = 'for_you' | 'saved' | 'done';

type SortType =
  | 'default'
  | 'best_match'
  | 'title_asc'
  | 'title_desc'
  | 'priority_asc'
  | 'priority_desc'
  | 'saved_first'
  | 'saved_last'
  | 'done_first'
  | 'done_last';

const MOOD_OPTIONS: {

  value: MoodType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;

}[] = [

  { value: 'all', label: 'All', icon: 'apps-outline' },
  { value: 'great', label: 'Great', icon: 'happy-outline' },
  { value: 'okay', label: 'Okay', icon: 'sunny-outline' },
  { value: 'tired', label: 'Tired', icon: 'moon-outline' },
  { value: 'stressed', label: 'Stressed', icon: 'heart-half-outline' },

];

export default function HealthTipsScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  const [loading, setLoading] = useState(true);
  const [savingReaction, setSavingReaction] = useState<string | null>(null);
  const [screenError, setScreenError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<TabType>('for_you');
  const [mood, setMood] = useState<MoodType>('all');
  const [sortBy, setSortBy] = useState<SortType>('default');
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [tips, setTips] = useState<ClinicHealthTip[]>([]);
  const [selectedTip, setSelectedTip] = useState<TipCard | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackItem[]>>({});

  const hasReaction = (
    tipId: string,
    reaction: FeedbackReaction,
    map = feedbackMap
  ) => {
    return (map[tipId] ?? []).some((item) => item.reaction === reaction);
  };

  const getReactionDate = (
    tipId: string,
    reaction: FeedbackReaction,
    map = feedbackMap
  ) => {
    const item = (map[tipId] ?? []).find((entry) => entry.reaction === reaction);
    return item ? new Date(item.created_at).getTime() : null;
  };

  useEffect(() => {

    const load = async () => {
      try {
        setLoading(true);
        setScreenError('');

        if (!clinicId) {
          setScreenError('No clinic is selected right now.');
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace('/login');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            role,
            birth_date,
            gender,
            allergies,
            chronic_conditions
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          setScreenError(`Could not load patient profile. ${profileError.message}`);
          return;
        }

        if (!profileData) {
          setScreenError('Your profile could not be found.');
          return;
        }

        if (profileData.role !== 'patient') {
          router.replace({
            pathname: '/main-patient',
            params: { clinicId, clinicName },
          });
          return;
        }

        setProfile(profileData);

        const { data: tipData, error: tipsError } = await supabase
          .from('clinic_health_tips')
          .select(`
            id,
            clinic_id,
            title,
            summary,
            content,
            category,
            icon_name,
            min_age,
            max_age,
            gender_target,
            condition_tags,
            allergy_tags,
            priority,
            is_active
          `)
          .eq('clinic_id', clinicId)
          .eq('is_active', true)
          .order('priority', { ascending: false });

        if (tipsError) {
          setScreenError(`Could not load clinic health tips. ${tipsError.message}`);
          return;
        }

        setTips(tipData ?? []);

        const { data: feedbackData, error: feedbackError } = await supabase
          .from('patient_health_tip_feedback')
          .select('tip_id, reaction, created_at')
          .eq('profile_id', user.id);

        if (feedbackError) {
          setScreenError(`Could not load tips reactions. ${feedbackError.message}`);
          return;
        }

        const nextMap: Record<string, FeedbackItem[]> = {};

        (feedbackData ?? []).forEach((item) => {
          if (!nextMap[item.tip_id]) nextMap[item.tip_id] = [];

          nextMap[item.tip_id].push({
            reaction: item.reaction as FeedbackReaction,
            created_at: item.created_at,
          });
        });

        setFeedbackMap(nextMap);
      } catch {
        setScreenError('Unexpected error while loading Health Tips.');
      } finally {
        setLoading(false);
      }
    };

    load();

  }, [clinicId, clinicName]);

  const categories = useMemo(() => {

    const values = Array.from(
      new Set(
        tips
          .map((item) => item.category?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));

    return ['All', ...values];

  }, [tips]);

  const scoredTips = useMemo(() => {

    if (!profile) 
      return [];

    return tips.map((tip) => {
      const baseScore = scoreHealthTip(tip, profile);
      const moodScore = scoreHealthTipForMood(tip, mood);
      const matchScore = baseScore + moodScore;

      return {
        ...tip,
        matchScore,
        matchLabel: getHealthTipMatchLabel(matchScore),
      };
    });

  }, [tips, profile, mood]);

  const sortTips = (itemsToSort: TipCard[]) => {

    const items = [...itemsToSort];

    const defaultCompare = (a: TipCard, b: TipCard) => {
      if ((b.priority ?? 0) !== (a.priority ?? 0)) {
        return (b.priority ?? 0) - (a.priority ?? 0);
      }

      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }

      return a.title.localeCompare(b.title);
    };

    switch (sortBy) {

      case 'best_match':
        items.sort((a, b) => {
          if (b.matchScore !== a.matchScore) 
            return b.matchScore - a.matchScore;
          return defaultCompare(a, b);
        });
        break;

      case 'title_asc':
        items.sort((a, b) => a.title.localeCompare(b.title));
        break;

      case 'title_desc':
        items.sort((a, b) => b.title.localeCompare(a.title));
        break;

      case 'priority_asc':
        items.sort((a, b) => {
          if ((a.priority ?? 0) !== (b.priority ?? 0)) {
            return (a.priority ?? 0) - (b.priority ?? 0);
          }

          return a.title.localeCompare(b.title);
        });
        break;

      case 'priority_desc':
        items.sort((a, b) => {
          if ((b.priority ?? 0) !== (a.priority ?? 0)) {
            return (b.priority ?? 0) - (a.priority ?? 0);
          }

          return a.title.localeCompare(b.title);
        });
        break;

      case 'saved_first':
        items.sort((a, b) => {
          const aDate = getReactionDate(a.id, 'saved');
          const bDate = getReactionDate(b.id, 'saved');

          if (aDate !== null && bDate !== null) 
            return aDate - bDate;
          if (aDate !== null) 
            return -1;
          if (bDate !== null) 
            return 1;

          return defaultCompare(a, b);
        });
        break;

      case 'saved_last':
        items.sort((a, b) => {
          const aDate = getReactionDate(a.id, 'saved');
          const bDate = getReactionDate(b.id, 'saved');

          if (aDate !== null && bDate !== null) 
            return bDate - aDate;
          if (aDate !== null) 
            return -1;
          if (bDate !== null) 
            return 1;

          return defaultCompare(a, b);
        });
        break;

      case 'done_first':
        items.sort((a, b) => {
          const aDate = getReactionDate(a.id, 'done');
          const bDate = getReactionDate(b.id, 'done');

          if (aDate !== null && bDate !== null) 
            return aDate - bDate;
          if (aDate !== null) 
            return -1;
          if (bDate !== null) 
            return 1;

          return defaultCompare(a, b);
        });
        break;

      case 'done_last':
        items.sort((a, b) => {
          const aDate = getReactionDate(a.id, 'done');
          const bDate = getReactionDate(b.id, 'done');

          if (aDate !== null && bDate !== null) 
            return bDate - aDate;
          if (aDate !== null) 
            return -1;
          if (bDate !== null) 
            return 1;

          return defaultCompare(a, b);
        });
        break;

      case 'default':
      default:
        items.sort(defaultCompare);
        break;

    }

    return items;

  };

  const filteredTips = (() => {

    let items = [...scoredTips];

    const q = search.trim().toLowerCase();

    if (q) {
      items = items.filter((tip) =>
        `${tip.title} ${tip.summary || ''} ${tip.content} ${tip.category || ''}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (categoryFilter !== 'All') {
      items = items.filter((tip) => tip.category === categoryFilter);
    }

    if (activeTab === 'saved') {
      items = items.filter((tip) => hasReaction(tip.id, 'saved'));
    }

    if (activeTab === 'done') {
      items = items.filter((tip) => hasReaction(tip.id, 'done'));
    }

    return sortTips(items);

  })();

  const todayTip = (() => {
    const availableTips = sortTips(scoredTips);
    return availableTips[0] ?? null;
  })();

  const savedCount = Object.values(feedbackMap).filter((items) => items.some((item) => item.reaction === 'saved')).length;

  const doneCount = Object.values(feedbackMap).filter((items) => items.some((item) => item.reaction === 'done')).length;

  const helpfulCount = Object.values(feedbackMap).filter((items) => items.some((item) => item.reaction === 'helpful')).length;

  const handleReaction = async (tipId: string, reaction: FeedbackReaction) => {

    try {
      setSavingReaction(`${tipId}:${reaction}`);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const reactions = feedbackMap[tipId] ?? [];
      const alreadySelected = reactions.some((item) => item.reaction === reaction);

      if (alreadySelected) {
        const { error } = await supabase
          .from('patient_health_tip_feedback')
          .delete()
          .eq('profile_id', user.id)
          .eq('tip_id', tipId)
          .eq('reaction', reaction);

        if (error) {
          setScreenError(`Could not update reaction. ${error.message}`);
          return;
        }

        setFeedbackMap((prev) => ({
          ...prev,
          [tipId]: (prev[tipId] ?? []).filter((item) => item.reaction !== reaction),
        }));

        return;
      }

      const { data, error } = await supabase
        .from('patient_health_tip_feedback')
        .insert({
          profile_id: user.id,
          tip_id: tipId,
          reaction,
        })
        .select('reaction, created_at')
        .single();

      if (error) {
        setScreenError(`Could not save reaction. ${error.message}`);
        return;
      }

      setFeedbackMap((prev) => ({
        ...prev,
        [tipId]: [
          ...(prev[tipId] ?? []),
          {
            reaction: data.reaction as FeedbackReaction,
            created_at: data.created_at,
          },
        ],
      }));
    } finally {
      setSavingReaction(null);
    }
  
  };

  const renderReactions = (tip: TipCard) => {

    const reactions = feedbackMap[tip.id] ?? [];

    const isHelpful = reactions.some((item) => item.reaction === 'helpful');
    const isSaved = reactions.some((item) => item.reaction === 'saved');
    const isDone = reactions.some((item) => item.reaction === 'done');

    return (
      <View style={styles.reactionRow}>
        <ReactionButton label="Helpful" active={isHelpful} onPress={() => handleReaction(tip.id, 'helpful')} loading={savingReaction === `${tip.id}:helpful`} color={theme.primary}/>
        <ReactionButton label={isSaved ? 'Saved' : 'Save'} active={isSaved} onPress={() => handleReaction(tip.id, 'saved')} loading={savingReaction === `${tip.id}:saved`} color={theme.primary}/>
        <ReactionButton label={isDone ? 'Done' : 'Done'} active={isDone} onPress={() => handleReaction(tip.id, 'done')} loading={savingReaction === `${tip.id}:done`} color={theme.primary}/>
      </View>
    );
  
  };

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicId={clinicId}
        clinicName={clinicName}
        primaryColor={theme.primary}
        roleLabel="Patient"
        showRolePill={false}
        onChangeClinic={() => router.replace('/clinic-selection')}
        showBackButton
        onBackPress={() =>
          router.replace({
            pathname: '/main-patient',
            params: { clinicId, clinicName },
          })
        }
      />

      <View
        style={[
          styles.heroCombined,
          isMobile && styles.heroCombinedMobile,
          {
            backgroundColor: theme.soft,
            borderColor: theme.borderSoft,
          },
        ]}
      >
        <View style={[styles.heroCombinedLeft, isMobile && styles.heroCombinedLeftMobile]}>
          <Text
            style={[
              styles.heroEyebrow,
              isMobile && styles.centerText,
              { color: theme.primary },
            ]}
          >
            Healthcare Tips
          </Text>

          <Text
            style={[
              styles.heroTitle,
              isMobile && styles.centerText,
              { color: theme.secondary },
            ]}
          >
            Placeholder Title
          </Text>

          <Text style={[styles.heroSubtitle, isMobile && styles.centerText]}>
            Placeholder Subtitle
          </Text>

          <View style={[styles.heroPills, isMobile && styles.heroPillsMobile]}>
            <View style={styles.heroPill}>
              <Ionicons name="sparkles-outline" size={16} color={theme.primary}/>
              <Text style={[styles.heroPillText, { color: theme.primary }]}>
                Custom
              </Text>
            </View>

            <View style={styles.heroPill}>
              <Ionicons name="heart-outline" size={16} color={theme.primary}/>
              <Text style={[styles.heroPillText, { color: theme.primary }]}>
                Interactive
              </Text>
            </View>

            <View style={styles.heroPill}>
              <Ionicons name="leaf-outline" size={16} color={theme.primary}/>
              <Text style={[styles.heroPillText, { color: theme.primary }]}>
                Daily Habits
              </Text>
            </View>
          </View>
        </View>

        {!!todayTip && (
          <View
            style={[
              styles.heroCombinedTipCard,
              isMobile && styles.heroCombinedTipCardMobile,
              {
                backgroundColor: '#FFFFFF',
                borderColor: `${theme.primary}22`,
              },
            ]}
          >
            <View style={styles.todayHeaderRow}>
              <View style={styles.dailyHeroTop}>
                <View
                  style={[
                    styles.dailyIconWrap,
                    { backgroundColor: `${theme.primary}14` },
                  ]}
                >
                  <Ionicons
                    name={(todayTip.icon_name as any) || 'leaf-outline'}
                    size={isMobile ? 20 : 22}
                    color={theme.primary}
                  />
                </View>

                <View style={styles.dailyTopText}>
                  <Text style={[styles.dailyBadge, { color: theme.primary }]}>
                    Today&apos;s Tip
                  </Text>
                  <Text style={styles.dailyMatch}>{todayTip.matchLabel}</Text>
                </View>
              </View>

              <Pressable
                style={[styles.todayReadButtonTop, { backgroundColor: theme.primary }]}
                onPress={() => setSelectedTip(todayTip)}
              >
                <Text style={styles.todayReadButtonTopText}>Read full tip</Text>
              </Pressable>
            </View>

            <Text style={styles.dailyTitle}>{todayTip.title}</Text>

            <Text style={styles.dailySummary} numberOfLines={isMobile ? 2 : 2}>
              {todayTip.summary || todayTip.content}
            </Text>

            <View style={styles.dailyActions}>{renderReactions(todayTip)}</View>
          </View>
        )}
      </View>

      {!!screenError && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#DC2626"/>
          <Text style={styles.errorText}>{screenError}</Text>
        </View>
      )}

      {isMobile ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsScrollContent}
        >
          <View style={styles.mobileStatCardWrap}>
            <AnimatedStatsCard
              label="Saved Tips"
              value={savedCount}
              icon="bookmark-outline"
              color={theme.primary}
            />
          </View>

          <View style={styles.mobileStatCardWrap}>
            <AnimatedStatsCard
              label="Completed Tips"
              value={doneCount}
              icon="checkmark-circle-outline"
              color={theme.primary}
            />
          </View>

          <View style={styles.mobileStatCardWrap}>
            <AnimatedStatsCard
              label="Helpful Reactions"
              value={helpfulCount}
              icon="thumbs-up-outline"
              color={theme.primary}
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.statsGrid}>
          <AnimatedStatsCard
            label="Saved Tips"
            value={savedCount}
            icon="bookmark-outline"
            color={theme.primary}
          />
          <AnimatedStatsCard
            label="Completed Tips"
            value={doneCount}
            icon="checkmark-circle-outline"
            color={theme.primary}
          />
          <AnimatedStatsCard
            label="Helpful Reactions"
            value={helpfulCount}
            icon="thumbs-up-outline"
            color={theme.primary}
          />
        </View>
      )}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>How are you feeling today?</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {MOOD_OPTIONS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setMood(item.value)}
              style={[
                styles.chip,
                mood === item.value && {
                  backgroundColor: `${theme.primary}14`,
                  borderColor: theme.borderSoft,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={mood === item.value ? theme.primary : '#64748B'}
              />
              <Text
                style={[
                  styles.chipText,
                  mood === item.value && { color: theme.primary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Browse tips</Text>

        <View style={styles.tabsRow}>
          <TopTab
            label="For You"
            active={activeTab === 'for_you'}
            onPress={() => setActiveTab('for_you')}
            color={theme.primary}
          />
          <TopTab
            label="Saved"
            active={activeTab === 'saved'}
            onPress={() => setActiveTab('saved')}
            color={theme.primary}
          />
          <TopTab
            label="Done"
            active={activeTab === 'done'}
            onPress={() => setActiveTab('done')}
            color={theme.primary}
          />
        </View>

        <View style={[styles.topControls, isMobile && styles.topControlsMobile]}>
          <View style={styles.searchWrap}>
            <InfoSearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search for healthcare tips..."
            />
          </View>

          <View style={[styles.sortWrap, isMobile && styles.sortWrapMobile]}>
            <DropdownMenu
              value={sortBy}
              onChange={(value) => setSortBy(value as SortType)}
              items={[
                { label: 'Default', value: 'default' },
                { label: 'Best match', value: 'best_match' },
                { label: 'Name A-Z', value: 'title_asc' },
                { label: 'Name Z-A', value: 'title_desc' },
                { label: 'Priority ↑', value: 'priority_asc' },
                { label: 'Priority ↓', value: 'priority_desc' },
                { label: 'Saved first', value: 'saved_first' },
                { label: 'Saved last', value: 'saved_last' },
                { label: 'Completed first', value: 'done_first' },
                { label: 'Completed last', value: 'done_last' },
              ]}
            />
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersScrollContent}
      >
        {categories.map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategoryFilter(item)}
            style={[
              styles.chip,
              categoryFilter === item && {
                backgroundColor: `${theme.primary}14`,
                borderColor: theme.borderSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                categoryFilter === item && { color: theme.primary },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredTips.length === 0 && !screenError ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name={search.trim() ? 'search-outline' : 'sparkles-outline'}
                size={24}
                color={theme.primary}
              />

              <Text style={styles.emptyTitle}>
                {search.trim() ? 'No health tips found' : 'No health tips available right now'}
              </Text>

              <Text style={styles.emptyText}>
                {search.trim()
                  ? 'Try another keyword, mood, category or clear your search.'
                  : 'This clinic has not added any tips yet.'}
              </Text>
            </View>
          ) : (
        <View style={styles.grid}>
          {filteredTips.map((tip) => (
            <InfoPreviewCard
              key={tip.id}
              title={tip.title}
              subtitle={`${tip.category} · ${tip.matchLabel}`}
              description={tip.summary || tip.content}
              icon={(tip.icon_name as any) || 'leaf-outline'}
              color={theme.primary}
              badgeText={tip.matchLabel}
              footer={renderReactions(tip)}
              hideSeeMore
              onPress={() => setSelectedTip(tip)}
            />
          ))}
        </View>
      )}

      <InfoModal
        visible={!!selectedTip}
        onClose={() => setSelectedTip(null)}
        title={selectedTip?.title || ''}
        subtitle={selectedTip?.category || 'Health Tip'}
        description={selectedTip?.content || ''}
        color={theme.primary}
        sections={[
          { label: 'Match', value: selectedTip?.matchLabel },
          {
            label: 'Priority score',
            value: selectedTip ? String(selectedTip.priority) : '',
          },
        ]}
      />

    </ScrollView>
  
  );

}

function TopTab({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color: string;
}) {

  return (

    <Pressable
      onPress={onPress}
      style={[
        styles.topTab,
        active && {
          backgroundColor: `${color}12`,
          borderColor: `${color}40`,
        },
      ]}
    >
      <Text style={[styles.topTabText, active && { color }]}>{label}</Text>
    </Pressable>

  );

}

function ReactionButton({
  label,
  active,
  onPress,
  loading,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  loading: boolean;
  color: string;
}) {

  return (

    <Pressable
      onPress={onPress}
      style={[
        styles.reactionButton,
        active && {
          backgroundColor: `${color}12`,
          borderColor: `${color}45`,
        },
      ]}
    >
      <Text style={[styles.reactionButtonText, active && { color }]}>
        {loading ? '...' : label}
      </Text>
    </Pressable>

  );

}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    gap: 18,
  },

  centerText: {
    textAlign: 'center',
  },

  heroCombined: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch',
  },

  heroCombinedMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },

  heroCombinedLeft: {
    flex: 1.2,
    minWidth: 260,
  },

  heroCombinedLeftMobile: {
    minWidth: '100%',
    alignItems: 'center',
  },

  heroCombinedTipCard: {
    flex: 1,
    minWidth: 300,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },

  heroCombinedTipCardMobile: {
    width: '100%',
    minWidth: 0,
    padding: 12,
  },

  heroEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
  },

  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 16,
  },

  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  heroPillsMobile: {
    justifyContent: 'center',
  },

  heroPill: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  heroPillText: {
    fontSize: 13,
    fontWeight: '800',
  },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },

  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },

  todayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  dailyHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },

  dailyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dailyTopText: {
    flex: 1,
    minWidth: 0,
  },

  dailyBadge: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  dailyMatch: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },

  todayReadButtonTop: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },

  todayReadButtonTopText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },

  dailyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 10,
  },

  dailySummary: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    marginTop: 6,
  },

  dailyActions: {
    marginTop: 12,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  statsScroll: {
    flexGrow: 0,
  },

  statsScrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 8,
  },

  mobileStatCardWrap: {
    width: 185,
  },

  sectionBlock: {
    gap: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  topTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  topTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },

  topControls: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },

  topControlsMobile: {
    flexDirection: 'column',
  },

  searchWrap: {
    flex: 1,
  },

  sortWrap: {
    width: 240,
  },

  sortWrapMobile: {
    width: '100%',
  },

  filtersScroll: {
    flexGrow: 0,
    alignSelf: 'flex-start',
  },

  filtersScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
    paddingRight: 8,
  },

  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  chipText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },

  centered: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  reactionScroll: {
    flexGrow: 0,
  },

  reactionScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },

  reactionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },

  reactionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reactionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },

});