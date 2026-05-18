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
    return { summary: String(parsed.summary || '').trim(), risk_flags: asArray(parsed.risk_flags), recommendations: asArray(parsed.recommendations), };
  } catch {
    return { summary: cleaned, risk_flags: [], recommendations: [], };
  }

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
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader, }, }, });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: userError, } = await userClient.auth.getUser();

  if (userError || !user)
    return jsonResponse({ error: 'Not authenticated.' }, 401);

  const { clinicId, patientId } = await req.json().catch(() => ({ clinicId: null, patientId: null, }));
  if (!clinicId || !patientId)
    return jsonResponse({ error: 'clinicId and patientId are required.' }, 400);

  const { data: profile } = await adminClient.from('profiles').select('id, email, role').eq('id', user.id).maybeSingle();
  if (!profile)
    return jsonResponse({ error: 'Profile not found.' }, 404);

  const { data: doctor, error: doctorError } = await adminClient
    .from('doctors')
    .select('id')
    .eq('clinic_id', clinicId)
    .or(profile.email ? `profile_id.eq.${user.id},email.eq.${profile.email}` : `profile_id.eq.${user.id}`)
    .maybeSingle();

  if (doctorError || !doctor?.id)
    return jsonResponse({ error: 'Only the connected doctor can generate this summary.' }, 403);

  const [{ data: appointments }, { data: records }, { data: files }, { data: patient }] =
    await Promise.all([
      adminClient
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          status,
          patient_first_name,
          patient_last_name,
          insurance_method,
          insurance_details,
          notes,
          ai_triage_summary,
          ai_triage_level,
          clinic_services(title, category)
        `)
        .eq('clinic_id', clinicId)
        .eq('doctor_id', doctor.id)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false })
        .limit(20),

      adminClient
        .from('patient_medical_records')
        .select(`
          id,
          title,
          category,
          symptoms,
          diagnosis,
          treatment_plan,
          prescription,
          recommendations,
          notes,
          blood_pressure,
          heart_rate,
          temperature,
          weight_kg,
          height_cm,
          follow_up_date,
          created_at
        `)
        .eq('clinic_id', clinicId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20),

      adminClient
        .from('patient_files')
        .select(`
          id,
          title,
          description,
          file_type,
          category,
          notes,
          created_at
        `)
        .eq('clinic_id', clinicId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20),

      adminClient
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          birth_date,
          gender,
          blood_type,
          allergies,
          chronic_conditions,
          insurance_provider
        `)
        .eq('id', patientId)
        .maybeSingle(),
    ]);

  const sourceCount = (appointments?.length || 0) + (records?.length || 0) + (files?.length || 0);

  if (sourceCount === 0)
    return jsonResponse({ error: 'No patient history sources found.' }, 404);

  const prompt = `
    You are a clinical documentation assistant for a doctor.

    Create a concise patient history summary from the data below.
    Do NOT diagnose beyond the provided records.
    Do NOT invent facts.
    Mention uncertainty when data is missing.

    Return ONLY valid JSON with this exact shape:
    {
    "summary": "string",
    "risk_flags": ["string"],
    "recommendations": ["string"]
    }

    Data:
    ${JSON.stringify({ patient, appointments, medical_records: records, files }, null, 2)}
  `;

  const geminiUrl = new URL('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent');
  geminiUrl.searchParams.set('key', geminiApiKey);

  const geminiResponse = await fetch(geminiUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!geminiResponse.ok) {
    const text = await geminiResponse.text();

    return jsonResponse(
      { error: 'Gemini request failed.', status: geminiResponse.status, details: text, }, 502 ); }

  const geminiJson = await geminiResponse.json();

  const text = geminiJson?.candidates?.[0]?.content?.parts ?.map((part: { text?: string }) => part.text || '').join('').trim() || '';
  if (!text)
    return jsonResponse({ error: 'Gemini returned an empty response.' }, 502);

  const aiResult = safeJsonParse(text);
  if (!aiResult.summary)
    return jsonResponse({ error: 'Could not parse AI summary.' }, 502);

  const { data: savedSummary, error: saveError } = await adminClient
    .from('patient_ai_summaries')
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      doctor_id: doctor.id,
      summary: aiResult.summary,
      risk_flags: aiResult.risk_flags,
      recommendations: aiResult.recommendations,
      source_count: sourceCount,
      generated_by: user.id,
    })
    .select('*')
    .single();

  if (saveError)
    return jsonResponse({ error: saveError.message }, 400);

  return jsonResponse({ summary: savedSummary });

});