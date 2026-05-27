import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {

  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',

};

type NotificationType = 'created' | 'rescheduled' | 'cancelled' | 'checked_in' | 'missed';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, });
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function formatAppointmentDate(appointment: any) {
  return `${appointment.appointment_date || ''} ${String(appointment.start_time || '').slice(0, 5)}`.trim();
}

function buildDeepLink(appointment: any) {
  return `/manage-appointments?clinicId=${appointment.clinic_id}&appointmentId=${appointment.id}`;
}

function buildText(type: NotificationType, appointment: any) {

  const patientName = `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim() || 'Patient';
  const when = formatAppointmentDate(appointment);

  switch (type) {
    case 'created':
      return {
        title: 'New appointment booked',
        message: `${patientName} booked an appointment for ${when}.`,
      };

    case 'rescheduled':
      return {
        title: 'Appointment rescheduled',
        message: `${patientName}'s appointment was rescheduled to ${when}.`,
      };

    case 'cancelled':
      return {
        title: 'Appointment cancelled',
        message: `${patientName}'s appointment for ${when} was cancelled.`,
      };

    case 'checked_in':
      return {
        title: 'Patient checked in',
        message: `${patientName} has been marked as present.`,
      };

    case 'missed':
      return {
        title: 'Patient marked as missed',
        message: `${patientName} has been marked as not present.`,
      };
  }

}

async function filterRecipientsBySettings(adminClient: any, recipientIds: string[]) {

  if (recipientIds.length === 0) 
    return [];

  const { data } = await adminClient
    .from('user_settings')
    .select('profile_id, appointment_notifications')
    .in('profile_id', recipientIds);

  const settingsMap = new Map<string, any>();

  for (const item of data || [])
    settingsMap.set(item.profile_id, item);

  return recipientIds.filter((recipientId) => {
    const settings = settingsMap.get(recipientId);
    return settings?.appointment_notifications ?? true;
  });

}

serve(async (req) => {

  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST')
    return jsonResponse({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey)
    return jsonResponse({ error: 'Missing Supabase environment variables.' }, 500);

  const authHeader = req.headers.get('Authorization') || '';
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: userError, } = await userClient.auth.getUser();

  if (userError || !user)
    return jsonResponse({ error: 'Not authenticated.' }, 401);

  const { appointmentId, type } = await req.json().catch(() => ({ appointmentId: null, type: null, }));

  const allowedTypes: NotificationType[] = ['created', 'rescheduled', 'cancelled', 'checked_in', 'missed',];

  if (!appointmentId || !type)
    return jsonResponse({ error: 'appointmentId and type are required.' }, 400);

  if (!allowedTypes.includes(type))
    return jsonResponse({ error: 'Invalid notification type.' }, 400);

  const { data: appointment, error: appointmentError } = await adminClient
    .from('appointments')
    .select(`
      id,
      clinic_id,
      patient_id,
      doctor_id,
      appointment_date,
      start_time,
      patient_first_name,
      patient_last_name,
      status
    `)
    .eq('id', appointmentId)
    .maybeSingle();

  if (appointmentError || !appointment)
    return jsonResponse({ error: appointmentError?.message || 'Appointment not found.' }, 404);

  const { data: requesterProfile } = await adminClient
    .from('profiles')
    .select('id, role, email')
    .eq('id', user.id)
    .maybeSingle();
  if (!requesterProfile)
    return jsonResponse({ error: 'Profile not found.' }, 404);

  const { data: requesterDoctor } = await adminClient
    .from('doctors')
    .select('id')
    .eq('clinic_id', appointment.clinic_id)
    .or(requesterProfile.email ? `profile_id.eq.${user.id},email.eq.${requesterProfile.email}` : `profile_id.eq.${user.id}`)
    .maybeSingle();

  const isPatientOwner = appointment.patient_id === user.id;
  const isDoctorOwner = appointment.doctor_id === requesterDoctor?.id;
  const isClinicAdmin = requesterProfile.role === 'clinic_admin';
  const isPlatformAdmin = requesterProfile.role === 'platform_admin';
  if (!isPatientOwner && !isDoctorOwner && !isClinicAdmin && !isPlatformAdmin)
    return jsonResponse({ error: 'Not allowed to create notifications for this appointment.' }, 403);

  const { data: doctorData } = await adminClient
    .from('doctors')
    .select('profile_id')
    .eq('id', appointment.doctor_id)
    .maybeSingle();

  const doctorProfileId = doctorData?.profile_id || null;

  const { data: clinicAdmins } = await adminClient
    .from('clinic_memberships')
    .select('profile_id')
    .eq('clinic_id', appointment.clinic_id)
    .eq('role', 'clinic_admin')
    .eq('is_active', true);

  const adminIds = (clinicAdmins || []).map((item: any) => item.profile_id).filter(Boolean);

  const recipientIds = 
    type === 'created' || type === 'rescheduled' || type === 'cancelled'
      ? unique([appointment.patient_id, doctorProfileId, ...adminIds]) : type === 'checked_in' || type === 'missed'
        ? unique([doctorProfileId, ...adminIds]) : [];

  //const recipients = recipientIds.filter((id) => id !== user.id);
  //const recipients = recipientIds;
  const recipients = await filterRecipientsBySettings(adminClient, recipientIds);

  if (recipients.length === 0) {
    return jsonResponse({
      created: 0,
      notifications: [],
      debug: {
        reason: 'No recipients after excluding actor.',
        actor: user.id,
        recipientIds,
        doctorProfileId,
        adminIds,
      },
    });
  }

  const text = buildText(type, appointment);
  const deepLink = buildDeepLink(appointment);

  const rows = recipients.map((recipientId) => ({
    appointment_id: appointment.id,
    recipient_id: recipientId,
    type,
    title: text.title,
    message: text.message,
    deep_link: deepLink,
  }));

  const { data: createdRows, error: insertError } = await adminClient
    .from('appointment_notifications')
    .insert(rows)
    .select('*');

  if (insertError)
    return jsonResponse({ error: insertError.message, rows }, 400);

  return jsonResponse({
    created: createdRows?.length || 0,
    notifications: createdRows || [],
  });

});