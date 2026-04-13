import { supabase } from './supabase';

export async function getCurrentUserProfile() {
    
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null, error: userError ?? new Error('No authenticated user'), };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return { user, profile: null, error: profileError, };
  }

  return {
    user,
    profile,
    error: null,
  };

}