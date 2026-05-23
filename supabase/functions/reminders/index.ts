import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {

  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",

};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", }, });
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function getDoctorProfileId(appointment: any) {
  return Array.isArray(appointment.doctors) ? appointment.doctors[0]?.profile_id : appointment.doctors?.profile_id;
}

function buildDeepLink(appointment: any) {
  return `/manage-appointments?clinicId=${appointment.clinic_id}&appointmentId=${appointment.id}`;
}

serve(async (req) => {

  if (req.method === "OPTIONS") 
    return new Response("ok", { headers: corsHeaders, });

  if (req.method !== "POST" && req.method !== "GET")
    return jsonResponse({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey)
    return jsonResponse({ error: "Missing Supabase environment variables." }, 500);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const from = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);

  const { data: appointments, error } = await adminClient
    .from("appointments")
    .select(
      `
      id,
      clinic_id,
      patient_id,
      doctor_id,
      appointment_date,
      start_time,
      patient_first_name,
      patient_last_name,
      status,
      doctors (
        profile_id
      )
    `
    )
    .in("status", ["scheduled", "rescheduled"])
    .gte("appointment_date", fromDate)
    .lte("appointment_date", toDate);

  if (error)
    return jsonResponse({ error: error.message }, 400);

  const rows: any[] = [];
  for (const appointment of appointments || []) {
    const start = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    if (Number.isNaN(start.getTime())) 
      continue;
    if (start < from || start > to) 
      continue;

    const doctorProfileId = getDoctorProfileId(appointment);
    const recipients = unique([appointment.patient_id, doctorProfileId]);

    const time = String(appointment.start_time || "").slice(0, 5);

    for (const recipientId of recipients) {
      rows.push({
        appointment_id: appointment.id,
        recipient_id: recipientId,
        type: "reminder_24h",
        title: "Appointment reminder",
        message: `Appointment reminder for tomorrow at ${time}.`,
        deep_link: buildDeepLink(appointment),
        reminder_key: appointment.appointment_date,
      });
    }
  }

  if (rows.length === 0)
    return jsonResponse({ created: 0, checked: appointments?.length || 0 });

  const { data: createdRows, error: insertError } = await adminClient
    .from("appointment_notifications")
    .upsert(rows, { onConflict: "appointment_id,recipient_id,type,reminder_key", ignoreDuplicates: true, })
    .select("*");

  if (insertError)
    return jsonResponse({ error: insertError.message }, 400);

  return jsonResponse({
    checked: appointments?.length || 0,
    attempted: rows.length,
    created: createdRows?.length || 0,
    notifications: createdRows || [],
  });

});