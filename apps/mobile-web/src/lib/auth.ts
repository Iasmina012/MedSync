import { supabase } from './supabase';

export async function getCurrentUserProfile() {
    
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      error: userError ?? new Error('No authenticated user'),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return {
      user,
      profile: null,
      error: profileError,
    };
  }

  return {
    user,
    profile,
    error: null,
  };

}

export function getRoleHomeRoute(role?: string | null) {

  if (role === 'doctor') return '/main-doctor';
  if (role === 'clinic_admin') return '/main-clinic-admin';
  if (role === 'platform_admin') return '/main-platform-admin';
  return '/main-patient';
  
}