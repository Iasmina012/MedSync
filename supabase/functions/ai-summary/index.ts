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
      summary: String(parsed.summary || '').trim(),
      modality: String(parsed.modality || 'unclear').trim(),
      body_region: String(parsed.body_region || 'unclear').trim(),
      image_quality: String(parsed.image_quality || 'unclear').trim(),
      confidence: String(parsed.confidence || 'low').trim(),
      findings: asArray(parsed.findings),
      risk_flags: asArray(parsed.risk_flags),
      recommendations: asArray(parsed.recommendations),
      limitations: asArray(parsed.limitations),
      chart_insights: asArray(parsed.chart_insights),
    };
  } catch {
    return {
      summary: cleaned,
      modality: 'unclear',
      body_region: 'unclear',
      image_quality: 'unclear',
      confidence: 'low',
      findings: [],
      risk_flags: [],
      recommendations: [],
      limitations: [],
      chart_insights: [],
    };
  }

}

function getMimeType(fileType?: string | null) {

  const value = String(fileType || '').toLowerCase();

  if (value.includes('pdf')) 
    return 'application/pdf';
  if (value.includes('png')) 
    return 'image/png';
  if (value.includes('jpg') || value.includes('jpeg')) 
    return 'image/jpeg';
  if (value.includes('webp')) 
    return 'image/webp';
  if (value.includes('text') || value.includes('txt')) 
    return 'text/plain';

  return 'application/pdf';

}

function arrayBufferToBase64(buffer: ArrayBuffer) {

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1)
    binary += String.fromCharCode(bytes[i]);

  return btoa(binary);

}

async function callGeminiJson(geminiApiKey: string, parts: unknown[]) {

  const geminiUrl = new URL('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent');

  geminiUrl.searchParams.set('key', geminiApiKey);

  const geminiResponse = await fetch(geminiUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
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

  return (
    geminiJson?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim() || ''
  );
}

async function processPatientFile({
  adminClient,
  geminiApiKey,
  file,
}: {
  adminClient: any;
  geminiApiKey: string;
  file: any;
}) {
  if (file.ai_summary) return file;

  if (!file.file_url) {
    await adminClient
      .from('patient_files')
      .update({
        processing_status: 'failed',
        notes: file.notes || 'AI processing failed: missing file URL.',
      })
      .eq('id', file.id);

    return { ...file, processing_status: 'failed' };
  }

  try {
    await adminClient
      .from('patient_files')
      .update({ processing_status: 'processing' })
      .eq('id', file.id);

    const fileResponse = await fetch(file.file_url);

    if (!fileResponse.ok) {
      throw new Error(`Could not download file. Status ${fileResponse.status}`);
    }

    const buffer = await fileResponse.arrayBuffer();

    if (buffer.byteLength > 8 * 1024 * 1024) {
      throw new Error('File is too large for inline AI processing.');
    }

    const mimeType = getMimeType(file.file_type);
    const base64Data = arrayBufferToBase64(buffer);

    const documentPrompt = `
You are a clinical document processing assistant.

Summarize this uploaded patient file for a doctor.
Do NOT diagnose beyond the document.
Do NOT invent values.
If this is a bloodwork/lab report, extract important values, abnormal markers, dates, and units when visible.
If information is unclear, say that it is unclear.

Return ONLY valid JSON:
{
  "summary": "string",
  "risk_flags": ["string"],
  "recommendations": ["string"]
}

File metadata:
${JSON.stringify(
  {
    title: file.title,
    description: file.description,
    file_type: file.file_type,
    category: file.category,
    notes: file.notes,
    created_at: file.created_at,
  },
  null,
  2
)}
`;

    const text = await callGeminiJson(geminiApiKey, [
      { text: documentPrompt },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const result = safeJsonParse(text);

    if (!result.summary) {
      throw new Error('Gemini returned no document summary.');
    }

    const { data: updatedFile } = await adminClient
      .from('patient_files')
      .update({
        ai_summary: result.summary,
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', file.id)
      .select(`
        id,
        title,
        description,
        file_url,
        file_type,
        category,
        notes,
        ai_summary,
        processing_status,
        processed_at,
        ai_image_summary,
        ai_image_findings,
        ai_image_flags,
        image_processing_status,
        image_processed_at,
        created_at
      `)
      .single();

    return updatedFile || { ...file, ai_summary: result.summary, processing_status: 'completed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown processing error.';

    await adminClient
      .from('patient_files')
      .update({
        processing_status: 'failed',
        processed_at: new Date().toISOString(),
        notes: file.notes || `AI processing failed: ${message}`,
      })
      .eq('id', file.id);

    return {
      ...file,
      processing_status: 'failed',
      ai_summary: file.ai_summary || null,
    };
  }
}

async function processPatientImage({
  adminClient,
  geminiApiKey,
  file,
}: {
  adminClient: any;
  geminiApiKey: string;
  file: any;
}) {
  if (!file.file_url) {
    await adminClient
      .from('patient_files')
      .update({
        image_processing_status: 'failed',
        notes: file.notes || 'AI image analysis failed: missing file URL.',
      })
      .eq('id', file.id);

    return { ...file, image_processing_status: 'failed' };
  }

  const mimeType = getMimeType(file.file_type);

  if (!mimeType.startsWith('image/')) {
    throw new Error('AI image analysis is available only for image files: PNG, JPG, JPEG or WEBP.');
  }

  try {
    await adminClient
      .from('patient_files')
      .update({ image_processing_status: 'processing' })
      .eq('id', file.id);

    const fileResponse = await fetch(file.file_url);

    if (!fileResponse.ok) {
      throw new Error(`Could not download image. Status ${fileResponse.status}`);
    }

    const buffer = await fileResponse.arrayBuffer();

    if (buffer.byteLength > 8 * 1024 * 1024) {
      throw new Error('Image is too large for inline AI analysis.');
    }

    const base64Data = arrayBufferToBase64(buffer);

    const imagePrompt = `
You are an AI medical image interpretation assistant for clinician support.

Analyze this uploaded patient image.

Safety rules:
- Do NOT give a final diagnosis.
- Do NOT claim certainty.
- Describe visible findings only.
- If the image quality is poor or the body region/modality is unclear, say that.
- Mention that a qualified clinician/radiologist must review the image.
- Keep output concise and clinically useful.

Return ONLY valid JSON:
{
  "summary": "string",
  "modality": "x-ray | ct | mri | ultrasound | dermatology_photo | clinical_photo | document_photo | unclear | other",
  "body_region": "string or unclear",
  "image_quality": "good | limited | poor | unclear",
  "confidence": "high | medium | low",
  "findings": ["string"],
  "risk_flags": ["string"],
  "recommendations": ["string"],
  "limitations": ["string"]
}

File metadata:
${JSON.stringify(
  {
    title: file.title,
    description: file.description,
    file_type: file.file_type,
    category: file.category,
    notes: file.notes,
    created_at: file.created_at,
  },
  null,
  2
)}
`;

    const text = await callGeminiJson(geminiApiKey, [
      { text: imagePrompt },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const result = safeJsonParse(text);
    const now = new Date().toISOString();

    if (!result.summary) {
      throw new Error('Gemini returned no image analysis summary.');
    }

    const { data: updatedFile, error: updateError } = await adminClient
      .from('patient_files')
      .update({
        ai_image_summary: result.summary,
        ai_image_modality: result.modality,
        ai_image_body_region: result.body_region,
        ai_image_quality: result.image_quality,
        ai_image_confidence: result.confidence,
        ai_image_findings: result.findings?.length ? result.findings : result.recommendations,
        ai_image_flags: result.risk_flags,
        ai_image_limitations: result.limitations,
        ai_image_audit: {
          model: 'gemini-flash-latest',
          mode: 'image_analysis',
          generated_by: file.generated_by || null,
          generated_at: now,
          file_id: file.id,
          file_type: file.file_type,
          disclaimer: 'AI-assisted image review only. Not a diagnosis. Must be reviewed by a qualified clinician or radiologist.',
        },
        image_processing_status: 'completed',
        image_processed_at: now,
      })
      .eq('id', file.id)
      .select(`
        id,
        clinic_id,
        patient_id,
        doctor_id,
        appointment_id,
        medical_record_id,
        title,
        description,
        file_url,
        file_type,
        category,
        notes,
        ai_summary,
        processing_status,
        processed_at,
        ai_image_summary,
        ai_image_findings,
        ai_image_flags,
        image_processing_status,
        image_processed_at,
        created_at,
        ai_image_modality,
        ai_image_body_region,
        ai_image_quality,
        ai_image_confidence,
        ai_image_limitations,
        ai_image_audit
      `)
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedFile || {
      ...file,
      ai_image_summary: result.summary,
      ai_image_findings: result.recommendations,
      ai_image_flags: result.risk_flags,
      image_processing_status: 'completed',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown image analysis error.';

    await adminClient
      .from('patient_files')
      .update({
        image_processing_status: 'failed',
        image_processed_at: new Date().toISOString(),
        notes: file.notes || `AI image analysis failed: ${message}`,
      })
      .eq('id', file.id);

    return {
      ...file,
      image_processing_status: 'failed',
      ai_image_summary: file.ai_image_summary || null,
    };
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
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: userError, } = await userClient.auth.getUser();

  if (userError || !user)
    return jsonResponse({ error: 'Not authenticated.' }, 401);

  const { clinicId, patientId, mode, fileId } = await req.json().catch(() => ({ clinicId: null, patientId: null, mode: 'clinical_summary', fileId: null, }));
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
          file_url,
          file_type,
          category,
          notes,
          ai_summary,
          processing_status,
          processed_at,
          ai_image_summary,
          ai_image_findings,
          ai_image_flags,
          image_processing_status,
          image_processed_at,
          created_at,
          ai_image_modality,
          ai_image_body_region,
          ai_image_quality,
          ai_image_confidence,
          ai_image_limitations,
          ai_image_audit
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

  if (mode === 'file_summary') {
    if (!fileId)
      return jsonResponse({ error: 'fileId is required for file_summary mode.' }, 400);

    const targetFile = (files || []).find((file) => file.id === fileId);
    if (!targetFile)
      return jsonResponse({ error: 'File not found for this patient.' }, 404);

    const processedFile = await processPatientFile({ adminClient, geminiApiKey, file: {...targetFile, ai_summary: null,}, });
    return jsonResponse({ file: processedFile });
  }

  if (mode === 'image_analysis') {
    if (!fileId)
      return jsonResponse({ error: 'fileId is required for image_analysis mode.' }, 400);

    const targetFile = (files || []).find((file) => file.id === fileId);
    if (!targetFile)
      return jsonResponse({ error: 'File not found for this patient.' }, 404);

    try {
      const processedImage = await processPatientImage({
        adminClient,
        geminiApiKey,
        file: { ...targetFile, generated_by: user.id },
      });

      return jsonResponse({ file: processedImage });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown image analysis error.';
      return jsonResponse({ error: message }, 400);
    }
  }

  if (mode === 'chart_insights') {
    const chartPrompt = `
      You are a clinical trend analysis assistant.

      Analyze ONLY the structured medical record measurements below.

      Focus on:
      - blood_pressure over time
      - heart_rate over time
      - temperature over time
      - weight_kg over time
      - height_cm only as context

      Rules:
      - Do NOT diagnose.
      - Do NOT invent values.
      - Mention insufficient data when fewer than 2 values exist for a metric.
      - Keep insights concise and useful for a doctor.
      - AI output must be reviewed by a clinician.

      Return ONLY valid JSON:
      {
        "summary": "string",
        "risk_flags": ["string"],
        "recommendations": ["string"],
        "chart_insights": ["string"]
      }

      Data:
      ${JSON.stringify(
        {
          patient,
          medical_records: records,
        },
        null,
        2
      )}
    `;

      let aiResult;

      try {
        const text = await callGeminiJson(geminiApiKey, [{ text: chartPrompt }]);

        if (!text)
          return jsonResponse({ error: 'Gemini returned an empty chart insight response.' }, 502);
        aiResult = safeJsonParse(text);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
        return jsonResponse({ error: message }, 502);
      }

      if (!aiResult.summary)
        return jsonResponse({ error: 'Could not parse AI chart insights.' }, 502);

      const { data: savedSummary, error: saveError } = await adminClient
        .from('patient_ai_summaries')
        .insert({
          clinic_id: clinicId,
          patient_id: patientId,
          doctor_id: doctor.id,
          summary: aiResult.summary,
          risk_flags: aiResult.risk_flags,
          recommendations: aiResult.recommendations,
          chart_insights: aiResult.chart_insights,
          source_count: records?.length || 0,
          generated_by: user.id,
        })
        .select('*')
        .single();

      if (saveError)
        return jsonResponse({ error: saveError.message }, 400);

      return jsonResponse({ summary: savedSummary });
  }

  const sourceCount = (appointments?.length || 0) + (records?.length || 0) + (files?.length || 0);
  if (sourceCount === 0)
    return jsonResponse({ error: 'No patient history sources found.' }, 404);

  const processedFiles = files || [];

  const prompt = `
    You are a clinical documentation assistant for a doctor.

    Create a concise patient history summary from the data below.
    Use appointments, medical records, and AI-processed uploaded document summaries when available.
    Do NOT diagnose beyond the provided records.
    Do NOT invent facts.
    Mention uncertainty when data is missing.
    Mention that AI-generated document summaries require clinician review.

    Also analyze available measurement trends from medical records:
    - heart_rate over time
    - temperature over time
    - weight_kg over time
    - blood_pressure over time
    Mention only trends supported by data. If there is not enough data, say that.
    Include 1-2 short sentences inside the main summary about available measurement trends from medical records.
    Do NOT put clinical-summary trends in chart_insights.
    For clinical summary, chart_insights must always be an empty array [].

    Return ONLY valid JSON with this exact shape:
    {
      "summary": "string",
      "risk_flags": ["string"],
      "recommendations": ["string"],
      "chart_insights": []
    }

    Data:
    ${JSON.stringify(
      {
        patient,
        appointments,
        medical_records: records,
        files: processedFiles.map((file) => ({
          id: file.id,
          title: file.title,
          description: file.description,
          file_type: file.file_type,
          category: file.category,
          notes: file.notes,
          ai_summary: file.ai_summary,
          processing_status: file.processing_status,
          processed_at: file.processed_at,
          ai_image_summary: file.ai_image_summary,
          ai_image_findings: file.ai_image_findings,
          ai_image_flags: file.ai_image_flags,
          image_processing_status: file.image_processing_status,
          image_processed_at: file.image_processed_at,
          created_at: file.created_at,
        })),
      },
      null,
      2
    )}
  `;

  let aiResult;
  try {
    const text = await callGeminiJson(geminiApiKey, [{ text: prompt }]);
    if (!text)
      return jsonResponse({ error: 'Gemini returned an empty response.' }, 502);
    aiResult = safeJsonParse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
    return jsonResponse({ error: message }, 502);
  }

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
      chart_insights: [],
      source_count: sourceCount,
      generated_by: user.id,
    })
    .select('*')
    .single();

  if (saveError)
    return jsonResponse({ error: saveError.message }, 400);

  return jsonResponse({ summary: savedSummary, processed_files: processedFiles, });

});