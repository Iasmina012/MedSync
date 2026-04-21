export type PatientProfileForTips = {

  birth_date?: string | null;
  gender?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;

};

export type ClinicHealthTip = {

  id: string;
  clinic_id: string;
  title: string;
  summary: string | null;
  content: string;
  category: string;
  icon_name: string;
  min_age: number | null;
  max_age: number | null;
  gender_target: string | null;
  condition_tags: string[] | null;
  allergy_tags: string[] | null;
  priority: number;
  is_active: boolean;

};

export type MoodType = 'all' | 'great' | 'okay' | 'tired' | 'stressed';

export function getAgeFromBirthDate(birthDate?: string | null) {

  if (!birthDate) 
    return null;

  const date = new Date(birthDate);

  if (Number.isNaN(date.getTime())) 
    return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age;

}

function normalizeTextList(value?: string | null) {

  if (!value) 
    return [];

  return value
    .toLowerCase()
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

}

function includesAny(source: string[], targets?: string[] | null) {

  if (!targets?.length) 
    return false;

  return targets.some((target) => {

    const normalizedTarget = target.toLowerCase();

    return source.some(
      (item) =>
        item.includes(normalizedTarget) ||
        normalizedTarget.includes(item)
    );

  });

}

export function scoreHealthTip(tip: ClinicHealthTip, profile: PatientProfileForTips) {

  let score = tip.priority || 0;

  const age = getAgeFromBirthDate(profile.birth_date);
  const gender = (profile.gender || '').trim().toLowerCase();
  const conditions = normalizeTextList(profile.chronic_conditions);
  const allergies = normalizeTextList(profile.allergies);

  if (age !== null) {
    const minOk = tip.min_age == null || age >= tip.min_age;
    const maxOk = tip.max_age == null || age <= tip.max_age;

    if (minOk && maxOk) {
      score += 3;
    } else {
      score -= 2;
    }
  }

  if (tip.gender_target) {
    if (gender && gender === tip.gender_target.toLowerCase()) {
      score += 2;
    } else {
      score -= 1;
    }
  }

  if (includesAny(conditions, tip.condition_tags)) {
    score += 5;
  }

  if (includesAny(allergies, tip.allergy_tags)) {
    score += 4;
  }

  return score;

}

export function getHealthTipMatchLabel(score: number) {

  if (score >= 9) 
    return 'Excellent match';
  if (score >= 6) 
    return 'Good match';
  if (score >= 3) 
    return 'Relevant';

  return 'General tip';

}

export function scoreHealthTipForMood(tip: ClinicHealthTip, mood: MoodType) {

  if (mood === 'all') 
    return 0;

  const text = `${tip.title} ${tip.summary || ''} ${tip.content} ${tip.category}`.toLowerCase();

  switch (mood) {

    case 'tired':
      if (text.includes('sleep') || text.includes('rest') || text.includes('hydration') || text.includes('water') || text.includes('energy')) {
        return 4;
      }
      return 0;

    case 'stressed':
      if (text.includes('stress') || text.includes('breath') || text.includes('calm') || text.includes('routine') || text.includes('sleep')) {
        return 4;
      }
      return 0;

    case 'okay':
      if (text.includes('general') || text.includes('lifestyle') || text.includes('healthy') || text.includes('routine')) {
        return 3;
      }
      return 0;

    case 'great':
      if (text.includes('prevention') || text.includes('lifestyle') || text.includes('healthy') || text.includes('wellness')) {
        return 3;
      }
      return 0;

    default:
      return 0;

  }

}