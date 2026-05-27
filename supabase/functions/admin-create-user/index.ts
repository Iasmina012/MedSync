import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {

  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',

};

type Role = 'patient' | 'doctor' | 'clinic_admin' | 'platform_admin';

const usernameRegex = /^[a-z0-9._]{3,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const phoneRegex = /^[0-9+\s().-]{7,20}$/;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status,  headers: { ...corsHeaders, 'Content-Type': 'application/json' },});
}

function cleanText(value: unknown) {

  const text = String(value || '').trim();
  return text.length ? text : null;

}

function isRole(value: unknown): value is Role {
  return ['patient', 'doctor', 'clinic_admin', 'platform_admin'].includes(String(value));
}

function cleanClinicIds(body: any) {

  if (Array.isArray(body.clinicIds))
    return Array.from(new Set(body.clinicIds.map((id: unknown) => cleanText(id)).filter(Boolean))) as string[];

  const singleClinicId = cleanText(body.clinicId);
  return singleClinicId ? [singleClinicId] : [];

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

    const { data: requesterProfile, error: requesterError } = await adminClient
      .from('profiles')
      .select('id, role, email, active_clinic_id')
      .eq('id', user.id)
      .maybeSingle();

    if (requesterError || !requesterProfile)
      return jsonResponse({ error: requesterError?.message || 'Requester profile not found.' }, 404);

    if (!['platform_admin', 'clinic_admin'].includes(requesterProfile.role))
      return jsonResponse({ error: 'Only admins can create users.' }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role: Role = isRole(body.role) ? body.role : 'patient';
    const firstName = cleanText(body.firstName);
    const lastName = cleanText(body.lastName);
    const username = cleanText(body.username);
    const phone = cleanText(body.phone);
    const address = cleanText(body.address);

    let clinicIds = cleanClinicIds(body);

    if (!firstName)
      return jsonResponse({ error: 'First name is required.' }, 400);

    if (!lastName)
      return jsonResponse({ error: 'Last name is required.' }, 400);

    if (!email)
      return jsonResponse({ error: 'Email is required.' }, 400);

    if (!emailRegex.test(email))
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400);

    if (!passwordRegex.test(password))
      return jsonResponse({ error: 'Password must be at least 8 characters long, include one uppercase letter and one special character.', }, 400);

    if (!username)
      return jsonResponse({ error: 'Username is required.' }, 400);

    const normalizedUsername = String(username).toLowerCase();
    if (!usernameRegex.test(normalizedUsername))
      return jsonResponse({ error: 'Username must be 3-20 characters and can contain lowercase letters, numbers, dots and underscores.', }, 400);

    if (phone && !phoneRegex.test(String(phone)))
      return jsonResponse({ error: 'Please enter a valid phone number.' }, 400);

    if (requesterProfile.role === 'clinic_admin') {
      if (role === 'platform_admin')
        return jsonResponse({ error: 'Clinic admins cannot create platform admins.' }, 403);

      const clinicIdForClinicAdmin = clinicIds[0] || requesterProfile.active_clinic_id;
      if (!clinicIdForClinicAdmin)
        return jsonResponse({ error: 'clinicId is required for clinic admins.' }, 400);

      const { data: membership } = await adminClient
        .from('clinic_memberships')
        .select('id')
        .eq('clinic_id', clinicIdForClinicAdmin)
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!membership)
        return jsonResponse({ error: 'You are not an active admin member of this clinic.' }, 403);

      clinicIds = [clinicIdForClinicAdmin];
    }

    if (requesterProfile.role === 'platform_admin' && ['doctor', 'clinic_admin'].includes(role) && clinicIds.length === 0)
      return jsonResponse({ error: 'Doctors and clinic admins must be assigned to at least one clinic.' }, 400);

    const primaryClinicId = clinicIds[0] || null;

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existingProfile?.id)
      return jsonResponse({ error: 'A profile with this email already exists.' }, 409);

    const { data: existingUsername } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', normalizedUsername)
      .maybeSingle();
    if (existingUsername?.id)
      return jsonResponse({ error: 'A profile with this username already exists.' }, 409);

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          username: normalizedUsername,
          role,
        },
      });

    if (authError || !authData.user?.id)
      return jsonResponse({ error: authError?.message || 'Could not create auth user.' }, 400);

    const newUserId = authData.user.id;

    const profilePayload = {
      id: newUserId,
      first_name: firstName,
      last_name: lastName,
      username: normalizedUsername,
      email,
      role,
      active_clinic_id: primaryClinicId,
      phone,
      address,
      is_active: true,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select( 'id, first_name, last_name, email, role, active_clinic_id, phone, username, address, avatar_url, is_active, deleted_at')
      .single();

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: profileError.message }, 400);
    }

    if (clinicIds.length > 0) {
      const membershipRows = clinicIds.map((clinicId) => ({
        clinic_id: clinicId,
        profile_id: newUserId,
        role,
        is_active: true,
        assigned_by: user.id,
      }));

      const { error: membershipError } = await adminClient
        .from('clinic_memberships')
        .upsert(membershipRows, { onConflict: 'clinic_id,profile_id' });

      if (membershipError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return jsonResponse({ error: membershipError.message }, 400);
      }
    }

    if (role === 'doctor' && clinicIds.length > 0) {
      const doctorRows = clinicIds.map((clinicId) => ({
        clinic_id: clinicId,
        profile_id: newUserId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        is_active: true,
      }));

      const { error: doctorInsertError } = await adminClient
        .from('doctors')
        .upsert(doctorRows, { onConflict: 'clinic_id,profile_id' });

      if (doctorInsertError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return jsonResponse({ error: doctorInsertError.message }, 400);
      }
    }
    return jsonResponse({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown edge function error.';
    return jsonResponse({ error: message }, 500);
  }

});