import { supabase } from './supabase';

export async function getUserClinicCount(profileId: string) {

  const { count } = await supabase
    .from('clinic_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_active', true);

  return count ?? 0;

}

export async function requireRole(allowedRoles: string[]) {

  const { data: { user }, } = await supabase.auth.getUser();

  if (!user) 
    return { user: null, profile: null, error: 'login' };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) 
    return { user, profile: null, error: 'profile' };

  if (!allowedRoles.includes(profile.role))
    return { user, profile, error: 'role' };

  return { user, profile, error: null };

}