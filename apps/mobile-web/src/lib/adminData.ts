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

export async function countRows(table: string, filters?: (query: any) => any) {

  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filters) 
    query = filters(query);

  const { count } = await query;
  return count ?? 0;

}

export async function getClinicAdminStats(clinicId?: string) {

  if (!clinicId)
    return { doctors: 0, patients: 0, appointments: 0, clinicAdmins: 0, };

  const today = new Date().toISOString().slice(0, 10);

  const [
    doctorsRes,
    patientsRes,
    appointmentsRes,
    adminsRes,
  ] = await Promise.all([

    supabase
      .from('doctors')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('is_active', true),

    supabase
      .from('appointments')
      .select('patient_id')
      .eq('clinic_id', clinicId),

    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .in('status', ['scheduled', 'rescheduled'])
      .gte('appointment_date', today),

    supabase
      .from('clinic_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('role', 'clinic_admin')
      .eq('is_active', true),

  ]);

  const uniquePatients = new Set(
    (patientsRes.data || []).map((x: any) => x.patient_id)
  );

  return {
    doctors: doctorsRes.count || 0,
    patients: uniquePatients.size,
    appointments: appointmentsRes.count || 0,
    clinicAdmins: adminsRes.count || 0,
  };

}