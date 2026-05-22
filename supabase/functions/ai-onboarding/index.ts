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

function asArray(value: unknown): string[] {

  if (!Array.isArray(value)) 
    return [];

  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12);
  
}

function safeJsonParse(text: string) {

  const cleaned = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      form_valid: Boolean(parsed.form_valid),
      urgency_level: String(parsed.urgency_level || 'routine').trim(),
      summary_for_doctor: String(parsed.summary_for_doctor || '').trim(),
      missing_information: asArray(parsed.missing_information),
      clarifying_questions: asArray(parsed.clarifying_questions),
      urgency_flags: asArray(parsed.urgency_flags),
      urgency_flags_structured: Array.isArray(parsed.urgency_flags_structured)
        ? parsed.urgency_flags_structured
        : [],
      completion_score: Number.isFinite(Number(parsed.completion_score))
        ? Math.max(0, Math.min(100, Number(parsed.completion_score)))
        : null,
      requires_manual_review: Boolean(parsed.requires_manual_review),
      triage_recommendation: String(parsed.triage_recommendation || '').trim(),
    };
  } catch {
    return {
      form_valid: false,
      urgency_level: 'routine',
      summary_for_doctor: cleaned,
      missing_information: [],
      clarifying_questions: [],
      urgency_flags: [],
      urgency_flags_structured: [],
      completion_score: null,
      requires_manual_review: true,
      triage_recommendation: '',
    };
  }

}

async function callGeminiJson(geminiApiKey: string, prompt: string) {

  const geminiUrl = new URL('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent');
  geminiUrl.searchParams.set('key', geminiApiKey);

  const geminiResponse = await fetch(geminiUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!geminiResponse.ok) {
    const text = await geminiResponse.text();
    throw new Error(`Gemini request failed: ${geminiResponse.status} ${text}`);
  }

  const geminiJson = await geminiResponse.json();
  return (geminiJson?.candidates?.[0]?.content?.parts ?.map((part: { text?: string }) => part.text || '').join('').trim() || '');

}

serve(async (req) => {

  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST')
    return jsonResponse({ error: 'Method not allowed.' }, 405);

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey)
    return jsonResponse({ error: 'Missing GEMINI_API_KEY secret.' }, 500);

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

  const { appointmentId } = await req.json().catch(() => ({ appointmentId: null }));
  if (!appointmentId)
    return jsonResponse({ error: 'appointmentId is required.' }, 400);

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
      reason,
      notes,
      insurance_method,
      insurance_details,
      ai_triage_patient_note,
      ai_triage_summary,
      ai_triage_level,
      clinic_services(title, category),
      doctors(first_name, last_name, specialty)
    `)
    .eq('id', appointmentId)
    .maybeSingle();

    if (appointmentError || !appointment)
      return jsonResponse({ error: appointmentError?.message || 'Appointment not found.' }, 404);

    const { data: requesterProfile } = await adminClient.from('profiles').select(`id, role, email`).eq('id', user.id).maybeSingle();

  if (!requesterProfile)
    return jsonResponse({ error: 'Profile not found.' }, 404);

  const { data: patientProfile } = await adminClient
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      allergies,
      chronic_conditions,
      insurance_provider`)
    .eq('id', appointment.patient_id)
    .maybeSingle();

  if (!patientProfile)
    return jsonResponse({ error: 'Patient profile not found.' }, 404);

  const isPatientOwner = appointment.patient_id === user.id;
  const { data: doctorProfile } = await adminClient
    .from('doctors')
    .select('id')
    .eq('clinic_id', appointment.clinic_id)
    .or(requesterProfile.email ? `profile_id.eq.${user.id},email.eq.${requesterProfile.email}` : `profile_id.eq.${user.id}`)
    .maybeSingle();

  const isAllowedStaff = Boolean(doctorProfile?.id) || requesterProfile.role === 'clinic_admin' || requesterProfile.role === 'platform_admin';
  if (!isPatientOwner && !isAllowedStaff)
    return jsonResponse({ error: 'Not allowed to review this appointment.' }, 403);

  const prompt = `
    You are an AI patient onboarding and form validation assistant for a healthcare appointment.

    Review the appointment intake information below.
    Act as a mediator between patient and clinician: identify missing information, unclear details, urgency flags, and create a concise doctor-facing summary.
    Do NOT diagnose.
    Do NOT invent facts.
    If there are possible red flags, phrase them as review flags, not diagnoses.

    Rules for extra fields:
    - completion_score must be 0-100 based on how complete and clinically useful the intake is.
    - requires_manual_review should be true if information is missing, unclear, urgent, inconsistent, or if urgency_level is needs_review/urgent.
    - triage_recommendation should be a short operational recommendation, not a diagnosis.
    - urgency_flags_structured should mirror urgency_flags but include severity and reason.

    Return ONLY valid JSON with this exact shape:
    {
      "form_valid": true,
      "urgency_level": "routine | needs_review | urgent",
      "summary_for_doctor": "string",
      "missing_information": ["string"],
      "clarifying_questions": ["string"],
      "urgency_flags": ["string"],
      "urgency_flags_structured": [
        {
          "flag": "string",
          "severity": "routine | needs_review | urgent",
          "reason": "string"
        }
      ],
      "completion_score": 0,
      "requires_manual_review": true,
      "triage_recommendation": "string"
    }

    Appointment and intake data:
    ${JSON.stringify({ appointment, patient_profile: patientProfile }, null, 2)}
  `;

  let aiResult;
  try {
    const text = await callGeminiJson(geminiApiKey, prompt);
    if (!text)
      return jsonResponse({ error: 'Gemini returned an empty response.' }, 502);
    aiResult = safeJsonParse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
    return jsonResponse({ error: message }, 502);
  }

  const { data: savedReview, error: saveError } = await adminClient
    .from('patient_onboarding_reviews')
    .upsert(
      {
        clinic_id: appointment.clinic_id,
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        form_valid: aiResult.form_valid,
        urgency_level: aiResult.urgency_level || 'routine',
        summary_for_doctor: aiResult.summary_for_doctor || null,
        missing_information: aiResult.missing_information,
        clarifying_questions: aiResult.clarifying_questions,
        urgency_flags: aiResult.urgency_flags,
        urgency_flags_structured: aiResult.urgency_flags_structured,
        completion_score: aiResult.completion_score,
        requires_manual_review: aiResult.requires_manual_review,
        triage_recommendation: aiResult.triage_recommendation || null,
        generated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'appointment_id' }
    )
    .select('*')
    .single();

  if (saveError)
    return jsonResponse({ error: saveError.message }, 400);

  return jsonResponse({ review: savedReview });

});
