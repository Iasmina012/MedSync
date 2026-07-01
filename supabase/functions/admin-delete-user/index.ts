import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {

  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',

};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, });
}

serve(async (req) => {

  if (req.method === 'OPTIONS')
    return new Response('ok', { status: 200, headers: corsHeaders });

  if (req.method !== 'POST')
    return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey)
      return jsonResponse({ error: 'Missing Supabase environment variables.' }, 500);

    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false }, });
    const { data: { user }, error: userError, } = await userClient.auth.getUser();

    if (userError || !user)
      return jsonResponse({ error: 'Not authenticated.' }, 401);

    const body = await req.json().catch(() => ({}));
    const targetUserId = String(body.userId || '').trim();
    if (!targetUserId)
      return jsonResponse({ error: 'userId is required.' }, 400);

    if (targetUserId === user.id)
      return jsonResponse({ error: 'You cannot delete your own account from Manage Users.' }, 400);

    const { data: requesterProfile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!requesterProfile || !['platform_admin', 'clinic_admin'].includes(requesterProfile.role))
      return jsonResponse({ error: 'Only admins can delete users.' }, 403);

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!targetProfile)
      return jsonResponse({ error: 'User profile not found.' }, 404);

    if (requesterProfile.role === 'clinic_admin') {
      if (targetProfile.role === 'platform_admin')
        return jsonResponse({ error: 'Clinic admins cannot delete platform admins.' }, 403);

      const { data: adminMemberships, error: adminMembershipsError } = await adminClient
        .from('clinic_memberships')
        .select('clinic_id')
        .eq('profile_id', user.id)
        .eq('is_active', true);

      if (adminMembershipsError)
        return jsonResponse({ error: adminMembershipsError.message }, 400);

      const adminClinicIds = (adminMemberships || []).map((item: any) => item.clinic_id);
      if (adminClinicIds.length === 0)
        return jsonResponse({ error: 'You are not assigned to any clinic.' }, 403);

      const { data: sharedMembership } = await adminClient
        .from('clinic_memberships')
        .select('id')
        .eq('profile_id', targetUserId)
        .eq('is_active', true)
        .in('clinic_id', adminClinicIds)
        .maybeSingle();

      const { data: sharedAppointment } = await adminClient
        .from('appointments')
        .select('id')
        .eq('patient_id', targetUserId)
        .in('clinic_id', adminClinicIds)
        .maybeSingle();

      if (!sharedMembership && !sharedAppointment)
        return jsonResponse({ error: 'You can only delete users from your clinics.' }, 403);
    }

    await adminClient
      .from('clinic_memberships')
      .delete()
      .eq('profile_id', targetUserId);

    const { data: doctorRows } = await adminClient
      .from('doctors')
      .select('id')
      .eq('profile_id', targetUserId);

    const doctorIds = (doctorRows || []).map((doctor: any) => doctor.id);
    if (doctorIds.length > 0) {
      await adminClient
        .from('doctor_services')
        .delete()
        .in('doctor_id', doctorIds);

      await adminClient
        .from('appointments')
        .update({ doctor_id: null })
        .in('doctor_id', doctorIds);
    }
    
      await adminClient
        .from('doctors')
        .delete()
        .eq('profile_id', targetUserId);

      await adminClient
        .from('profiles')
        .delete()
        .eq('id', targetUserId);

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

      if (authDeleteError)
        return jsonResponse({ error: authDeleteError.message }, 400);

      return jsonResponse({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown edge function error.';
    return jsonResponse({ error: message }, 500);
  }

});