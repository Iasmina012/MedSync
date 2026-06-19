// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
// deno-lint-ignore-file no-explicit-any no-import-prefix no-unversioned-import no-empty no-unused-vars
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("Hello from Functions!")

const corsHeaders = {

  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",

};

type Role = "guest" | "patient" | "doctor" | "clinic_admin" | "platform_admin";
type TriageLevel = "routine" | "urgent" | "emergency";

type SymptomCategory =
  | "chest_pain"
  | "rash"
  | "headache"
  | "digestive"
  | "respiratory"
  | "musculoskeletal"
  | "urinary"
  | "eye"
  | "mental_health"
  | "dental"
  | "general";

type ChatAction = {

  label: string;
  route?: string;
  message?: string;
  params?: Record<string, string>;

};

type BookingDraft = {

  active?: boolean;
  mode?: "create" | "cancel" | "reschedule" | "check_in";
  step?:
    | "service"
    | "doctor"
    | "location"
    | "date"
    | "time"
    | "insurance"
    | "insurance_details"
    | "notes"
    | "onboarding_offer"
    | "onboarding_main"
    | "onboarding_symptoms"
    | "onboarding_medications"
    | "onboarding_chronic"
    | "confirm"
    | "select_appointment"
    | "confirm_cancel"
    | "confirm_check_in";

  appointmentId?: string;
  serviceId?: string;
  serviceTitle?: string;
  serviceDuration?: number;
  doctorId?: string;
  doctorName?: string;
  locationId?: string;
  locationName?: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  insuranceMethod?: string;
  insuranceDetails?: string | null;
  reason?: string | null;
  notes?: string | null;
  recommendedFromTriage?: boolean;
  triageId?: string | null;
  aiTriagePatientNote?: string | null;
  aiTriageDoctorSummary?: string | null;
  aiTriageLevel?: TriageLevel | null;
  onboardingAccepted?: boolean;
  onboardingMainConcern?: string | null;
  onboardingSymptoms?: string | null;
  onboardingMedications?: string | null;
  onboardingChronicConditions?: string | null;

};

type TriageDraft = {

  active?: boolean;
  step?: "symptom" | "duration" | "severity" | "adaptive" | "red_flags";
  symptom?: string;
  symptomCategory?: SymptomCategory;
  duration?: string;
  severity?: number;
  adaptiveIndex?: number;
  adaptiveAnswers?: Record<string, string>;
  redFlags?: string[];
  level?: TriageLevel;
  recommendedService?: string | null;
  possibleCauses?: string[];
  warningSigns?: string[];
  patientNote?: string;
  doctorSummary?: string;
  sessionStartedAt?: string;
  messageCount?: number;

};

type Slot = {

  doctorId: string;
  doctorName: string;
  locationId: string;
  locationName: string;
  date: string;
  startTime: string;
  endTime: string;

};

type AppContext = {

  supabase: any;
  message: string;
  clinicId?: string;
  clinicName?: string;
  role: Role;
  user: any | null;

};

const TRIAGE_DISCLAIMER = "This AI triage is informational and does not replace medical evaluation.";

function withTriageDisclaimer(text: string) {
  return `${text}\n\n${TRIAGE_DISCLAIMER}`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" }, });
}

function normalize(text = "") {
  return String(text).toLowerCase().trim();
}

function normalizeLoose(text = "") {

  return normalize(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}

function tokenize(text = "") {

  const stopWords = new Set([
    "the", "and", "for", "with", "from", "this", "that", "want", "book", "appointment", "consult", "consultation",
    "please", "need", "would", "like", "care", "service", "services", "doctor", "clinic", "medsync",
    "i", "me", "my", "a", "an", "to", "of", "in", "on", "at", "is", "are",
  ]);

  return normalizeLoose(text)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stopWords.has(word));

}

function isRole(value: string): value is Role {
  return ["guest", "patient", "doctor", "clinic_admin", "platform_admin"].includes(value);
}

function requiresClinicContext(role: Role) {
  return ["patient", "doctor", "clinic_admin"].includes(role);
}

function needsClinicForRoleWorkflow(role: Role) {
  return role === "doctor" || role === "clinic_admin";
}

function roleWorkflowNeedsClinic(message: string, role: Role) {

  if (!needsClinicForRoleWorkflow(role)) 
    return false;

  return (
    wantsMedicalRecordHelp(message) ||
    wantsPatientHistoryHelp(message) ||
    wantsMessagesHelp(message) ||
    asksHowToManageAppointments(message) ||
    asksHowToCheckIn(message) ||
    wantsCancelAppointment(message) ||
    wantsRescheduleAppointment(message) ||
    wantsCheckInAppointment(message) ||
    wantsUsersHelp(message) ||
    wantsClinicContentHelp(message) ||
    wantsClinicSettingsHelp(message)
  );

}

function selectClinicReply(role: Role) {

  return {
    handled: true,
    reply:
      role === "doctor"
        ? "Please select a clinic first. Medical records, appointments, patient history and messages are clinic-specific, so I need to know which clinic you want to work in."
        : "Please select a clinic first. Users, appointments, clinic content and clinic settings are clinic-specific, so I need to know which clinic you want to manage.",
    actions: [{ label: "Select clinic", route: "/clinic-selection" }],
  };

}

function timeToMinutes(time: string) {

  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;

}

function minutesToTime(total: number) {

  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

function getWeekday(date: string) {
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(`${date}T00:00:00`).getDay()];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateFromMessage(message: string) {

  const lower = normalize(message);
  const isoMatch = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);

  if (isoMatch) 
    return isoMatch[1];

  const today = new Date();

  if (lower.includes("today")) 
    return today.toISOString().slice(0, 10);

  if (lower.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const wantedIndex = weekdays.findIndex((day) => lower.includes(day));

  if (wantedIndex >= 0) {
    const currentIndex = today.getDay();
    let diff = wantedIndex - currentIndex;

    if (diff <= 0) 
      diff += 7;

    const result = new Date(today);
    result.setDate(today.getDate() + diff);
    return result.toISOString().slice(0, 10);
  }

  return null;

}

function parseTimeFromMessage(message: string) {

  const match = message.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (!match) 
    return null;
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}:00`;

}

function isPastDate(date: string) {

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = new Date(`${date}T00:00:00`);
  selected.setHours(0, 0, 0, 0);

  return selected < today;

}

function confirms(message: string) {

  const lower = normalize(message);
  return (["yes", "confirm", "confirmed", "ok", "sure"].includes(lower) || lower.includes("confirm") || lower.includes("book it") || lower.includes("create it"));

}

function cancels(message: string) {

  const lower = normalize(message);
  return lower === "no" || lower === "cancel" || lower.includes("cancel booking") || lower.includes("stop");

}

function wantsToExitActiveFlow(message: string) {

  const lower = normalize(message);
  return (lower.includes("exit flow") || lower.includes("stop flow") || lower.includes("leave booking") || lower.includes("stop booking") || lower.includes("cancel booking") || lower.includes("nevermind") || lower.includes("never mind") || lower.includes("forget it") || lower.includes("talk about something else") || lower.includes("different question") || lower.includes("stop triage") ||
lower.includes("cancel triage") ||
lower.includes("exit triage") ||
lower.includes("quit triage") );

}

function wantsAvailabilityInfo(message: string) {

  const lower = normalizeLoose(message);
  return (lower.includes("availability") || lower.includes("available") || lower.includes("schedule") || lower.includes("working hours") || lower.includes("opening hours") || lower.includes("hours"));

}

function isLikelyNonBookingQuestion(message: string, draft?: BookingDraft | null) {

  const lower = normalizeLoose(message);

  if (!draft?.active || draft.mode !== "create") 
    return false;
  if (cancels(message) || wantsToExitActiveFlow(message) || confirms(message)) 
    return false;
  if (parseDateFromMessage(message) || parseTimeFromMessage(message)) 
    return false;
  if (lower.includes("first available") || lower.includes("soonest") || lower.includes("earliest")) 
    return false;
  if (lower.includes("public insurance") || lower.includes("private insurance") || lower.includes("self pay")) 
    return false;
  if (lower === "no notes" || lower === "none") 
    return false;

  const questionLike = lower.includes("?") ||lower.startsWith("what ") || lower.startsWith("why ") ||  lower.startsWith("how ") || lower.startsWith("where ") || lower.startsWith("who ") || lower.startsWith("when ");
  const otherTopic = lower.includes("health tip") || lower.includes("technology") || lower.includes("technologies") || lower.includes("doctor info") || lower.includes("clinic info") || lower.includes("profile") || lower.includes("settings") || lower.includes("privacy") || lower.includes("policy") || lower.includes("messages") || lower.includes("health tips") || wantsAvailabilityInfo(message);

  if (draft.step === "doctor" && (lower.includes("doctor") || lower.includes("dr "))) 
    return false;
  if (draft.step === "location" && (lower.includes("location") || lower.includes("clinic") || lower.includes("choose"))) 
    return false;

  return questionLike || otherTopic;

}

function parseInsuranceMethod(message: string) {

  const lower = normalize(message);

  if (lower.includes("private")) 
    return "private_insurance";
  if (lower.includes("self") || lower.includes("cash") || lower.includes("pay")) 
    return "self_pay";
  if (lower.includes("other") || lower.includes("another")) 
    return "other";

  return "public_insurance";

}

function formatInsuranceMethod(method?: string) {

  if (method === "private_insurance") 
    return "Private insurance";
  if (method === "self_pay") 
    return "Self pay";
  if (method === "other") 
    return "Other";
  return "Public insurance";

}

function wantsContinueBooking(message: string) {

  const lower = normalizeLoose(message);
  return (lower === "continue booking" || lower === "resume booking" || lower.includes("continue booking") || lower.includes("resume booking"));

}

function formatBookingConfirmation(draft: BookingDraft) {

  const notes = draft.notes && draft.notes.trim() ? draft.notes : draft.reason && draft.reason !== "Booked from MedSync Assistant" ? draft.reason : "No notes";
  return [
    "Please review and confirm the appointment details:",
    "",
    `Location: ${draft.locationName || "Not selected"}`,
    `Doctor: ${draft.doctorName || "Not selected"}`,
    `Service: ${draft.serviceTitle || "Not selected"}`,
    `Date: ${draft.appointmentDate || "Not selected"}`,
    `Time: ${draft.startTime && draft.endTime ? `${draft.startTime.slice(0, 5)}-${draft.endTime.slice(0, 5)}` : "Not selected"}`,
    `Insurance/payment: ${draft.insuranceMethod === "other" && draft.insuranceDetails ? `Other - ${draft.insuranceDetails}` : formatInsuranceMethod(draft.insuranceMethod)}`,
    `Notes: ${notes}`,
    `AI triage attached: ${draft.triageId ? "Yes" : "No"}`,
    "",
    "Do you want me to create this appointment?",
  ].join("\n");

}

function continueBookingReply(draft: BookingDraft) {

  if (!draft.serviceId) {
    return {
      reply: "Let's continue with your booking. Which service would you like to book?",
      actions: [],
      bookingDraft: { ...draft, step: "service" },
    };
  }

  if (!draft.doctorId) {
    return {
      reply: `Let's continue with your booking for ${draft.serviceTitle}. Which doctor would you prefer, or should I search for the first available option?`,
      actions: [{ label: "First available", message: "First available" }],
      bookingDraft: { ...draft, step: "doctor" },
    };
  }

  if (!draft.locationId) {
    return {
      reply: "Let's continue with your booking. Which location do you prefer?",
      actions: [],
      bookingDraft: { ...draft, step: "location" },
    };
  }

  if (!draft.appointmentDate) {
    return {
      reply: "Let's continue with your booking. What date would you prefer? You can write today, tomorrow, Friday, or 2026-05-22.",
      actions: [
        { label: "Today", message: "Today" },
        { label: "Tomorrow", message: "Tomorrow" },
        { label: "Friday", message: "Friday" },
      ],
      bookingDraft: { ...draft, step: "date" },
    };
  }

  if (!draft.startTime) {
    return {
      reply: `Let's continue with your booking. Please choose an available time for ${draft.appointmentDate}.`,
      actions: [],
      bookingDraft: { ...draft, step: "time" },
    };
  }

  if (!draft.insuranceMethod) {
    return {
      reply: "Let's continue with your booking. How would you like to handle insurance or payment?",
      actions: [
        { label: "Public insurance", message: "Public insurance" },
        { label: "Private insurance", message: "Private insurance" },
        { label: "Self pay", message: "Self pay" },
        { label: "Other", message: "Other" },
      ],
      bookingDraft: { ...draft, step: "insurance" },
    };
  }

  if (draft.insuranceMethod === "other" && !draft.insuranceDetails) {
    return {
      reply: "Let's continue with your booking. Please write the insurance or payment details.",
      actions: [],
      bookingDraft: { ...draft, step: "insurance_details" },
    };
  }

  if (draft.step !== "confirm" && !draft.reason) {
    return {
      reply: "Let's continue with your booking. Please add a short reason for the visit or any notes for the doctor. You can also type 'No notes'.",
      actions: [{ label: "No notes", message: "No notes" }],
      bookingDraft: { ...draft, step: "notes" },
    };
  }

  return {
    reply: formatBookingConfirmation({ ...draft, step: "confirm" }),
    actions: [
      { label: "Confirm booking", message: "Confirm" },
      { label: "Cancel booking", message: "Cancel booking" },
    ],
    bookingDraft: { ...draft, step: "confirm" },
  };
}

function wantsCancelAppointment(message: string) {

  const lower = normalize(message);
  return lower.includes("cancel") && lower.includes("appointment");

}

function wantsRescheduleAppointment(message: string) {

  const lower = normalize(message);
  return ((lower.includes("reschedule") || lower.includes("change") || lower.includes("move") || lower.includes("modify")) && lower.includes("appointment"));

}

function wantsBooking(message: string) {

  const lower = normalize(message);
  if (wantsCancelAppointment(message) || wantsRescheduleAppointment(message)) return false;

  return (lower.includes("book") || lower.includes("make an appointment") || lower.includes("new appointment") || lower.includes("schedule an appointment") || lower.includes("consultation") || lower.includes("consult"));

}

function wantsCheckInAppointment(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("check in") || lower.includes("check-in") || lower.includes("mark present");

}

function asksHowToManageAppointments(message: string) {

  const lower = normalizeLoose(message);

  return (
    (lower.includes("how") || lower.includes("where") || lower.includes("what")) &&
    lower.includes("appointment") &&
    (
      lower.includes("cancel") ||
      lower.includes("reschedule") ||
      lower.includes("check in") ||
      lower.includes("check-in") ||
      lower.includes("status")
    )
  );

}

function asksHowToCheckIn(message: string) {

  const lower = normalizeLoose(message);
  return ((lower.includes("how") || lower.includes("where") || lower.includes("what")) && (lower.includes("check in") || lower.includes("check-in") || lower.includes("mark present")));

}

function wantsStartCancellationFromChat(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("start cancellation") || lower.includes("cancel from chat");

}

function wantsStartRescheduleFromChat(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("start reschedule") || lower.includes("reschedule from chat");

}

function wantsStartCheckInFromChat(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("start check in") || lower.includes("check in from chat") || lower.includes("proceed with check in");

}

function wantsMedicalRecordHelp(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("medical record") || lower.includes("create record") || lower.includes("patient chart");

}

function wantsUsersHelp(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("user") || lower.includes("users") || lower.includes("doctor account") || lower.includes("patient account");

}

function wantsClinicContentHelp(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("clinic content") || lower.includes("services") || lower.includes("technologies") || lower.includes("health tips");

}

function wantsClinicSettingsHelp(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("clinic settings") || lower.includes("logo") || lower.includes("branding") || lower.includes("clinic profile");

}

function wantsAnalyticsHelp(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("analytics") || lower.includes("stats") || lower.includes("overview") || lower.includes("platform health");

}

function wantsPatientHistoryHelp(message: string) {
  const lower = normalizeLoose(message);
  return lower.includes("patient history") || lower.includes("my patients") || lower.includes("history");

}

function wantsMessagesHelp(message: string) {

  const lower = normalizeLoose(message);
  return lower.includes("message") || lower.includes("chat") || lower.includes("conversation");

}

function detectSymptomCategory(message: string): SymptomCategory {

  const lower = normalize(message);

  if (lower.includes("chest pain") || lower.includes("chest pressure") || lower.includes("heart") || lower.includes("palpitation")) 
    return "chest_pain";

  if (lower.includes("rash") || lower.includes("itching") || lower.includes("hives") || lower.includes("skin") || lower.includes("allergy")) 
    return "rash";

  if (lower.includes("headache") || lower.includes("migraine") || lower.includes("head pain"))
    return "headache";

  if ( lower.includes("stomach") || lower.includes("nausea") || lower.includes("vomit") || lower.includes("diarrhea") || lower.includes("abdominal")) 
    return "digestive";

  if ( lower.includes("cough") || lower.includes("fever") || lower.includes("breathing") || lower.includes("sore throat")) 
    return "respiratory";

  if (lower.includes("back pain") || lower.includes("joint") || lower.includes("knee") || lower.includes("shoulder") || lower.includes("muscle") || lower.includes("bone")) 
    return "musculoskeletal";

  if (lower.includes("urine") || lower.includes("urinary") || lower.includes("burning when peeing") || lower.includes("kidney") || lower.includes("bladder")) 
    return "urinary";

  if (lower.includes("eye") || lower.includes("vision") || lower.includes("blurry") || lower.includes("red eye")) 
    return "eye";

  if (lower.includes("anxiety") || lower.includes("panic") || lower.includes("depression") || lower.includes("stress") || lower.includes("mental")) 
    return "mental_health";

  if (lower.includes("tooth") || lower.includes("teeth") || lower.includes("dental") || lower.includes("gum")) 
    return "dental";

  return "general";

}

function getRecommendedServiceQuery(message: string) {

  const category = detectSymptomCategory(message);
  const lower = normalize(message);

  if (category === "rash") 
    return "Dermatology";
  if (category === "chest_pain") 
    return "Cardiology";
  if (category === "headache") 
    return "Neurology";
  if (category === "digestive") 
    return "General Medicine";
  if (category === "respiratory") 
    return "General Medicine";

  if (lower.includes("diet") || lower.includes("nutrition") || lower.includes("weight")) 
    return "Nutrition";
  if (lower.includes("thyroid") || lower.includes("diabetes") || lower.includes("hormone")) 
    return "Endocrinology";
  if (lower.includes("child") || lower.includes("baby") || lower.includes("pediatric")) 
    return "Pediatric";

  return null;

}

function categoryKeywordsForService(category: SymptomCategory) {

  const categoryKeywords: Record<SymptomCategory, string[]> = {
    chest_pain: ["cardiology", "cardio", "heart", "internal medicine", "general medicine"],
    rash: ["dermatology", "skin", "allergy", "allergology"],
    headache: ["neurology", "neuro", "headache", "migraine", "internal medicine", "general medicine"],
    digestive: ["gastro", "gastroenterology", "digestive", "internal medicine", "general medicine"],
    respiratory: ["pulmonology", "respiratory", "lung", "internal medicine", "general medicine"],
    musculoskeletal: ["orthopedics", "orthopedic", "rheumatology", "physical therapy", "sports medicine"],
    urinary: ["urology", "nephrology", "urinary", "kidney"],
    eye: ["ophthalmology", "optometry", "eye", "vision"],
    mental_health: ["psychology", "psychiatry", "mental health", "therapy"],
    dental: ["dentistry", "dental", "stomatology"],
    general: ["general medicine", "general", "consultation", "consult", "check-up", "internal medicine"],
  };

  return categoryKeywords[category] || categoryKeywords.general;

}

function scoreClinicService(service: any, message: string, preferredService?: string | null, category?: SymptomCategory) {

  const title = normalizeLoose(service.title || "");
  const serviceCategory = normalizeLoose(service.category || "");
  const description = normalizeLoose(service.description || "");
  const combined = `${title} ${serviceCategory} ${description}`;
  const query = normalizeLoose(message);
  const preferred = normalizeLoose(preferredService || "");
  const symptomCategory = category || detectSymptomCategory(message);
  const keywords = [...categoryKeywordsForService(symptomCategory), preferred].filter(Boolean).map(normalizeLoose);
  const queryTokens = tokenize(message);

  let score = 0;

  if (preferred) {
    if (title === preferred) 
      score += 100;
    if (title.includes(preferred) || preferred.includes(title)) 
      score += 60;
    if (serviceCategory.includes(preferred)) 
      score += 35;
    if (description.includes(preferred)) 
      score += 20;
  }

  for (const keyword of keywords) {
    if (!keyword) 
      continue;
    if (title === keyword) 
      score += 80;
    else if (title.includes(keyword) || keyword.includes(title)) 
      score += 45;
    if (serviceCategory.includes(keyword)) 
      score += 30;
    if (description.includes(keyword)) 
      score += 15;
  }

  if (query && title && query.includes(title)) 
    score += 70;
  if (query && serviceCategory && query.includes(serviceCategory)) 
    score += 35;

  for (const token of queryTokens) {
    if (title.includes(token)) 
      score += 12;
    if (serviceCategory.includes(token)) 
      score += 8;
    if (description.includes(token)) 
      score += 4;
  }

  const generalTerms = ["general", "consult", "medicine", "internal", "check-up"];
  if (score === 0 && generalTerms.some((term) => combined.includes(term))) 
    score += 5;

  return score;

}

function detectRedFlagsFromText(message: string) {

  const lower = normalize(message);
  const redFlags = ["chest pain", "difficulty breathing", "can't breathe", "cannot breathe", "shortness of breath", "fainting", "severe bleeding", "stroke", "seizure", "confusion", "unconscious", "sudden severe pain", "worst headache", "vision loss", "severe allergic reaction", "anaphylaxis", "blue lips", "cold sweat"]; 

  return redFlags.filter((flag) => lower.includes(flag));

}

function getTriageLevel(message: string) {

  const lower = normalize(message);
  const symptomWords = ["symptom", "pain", "fever", "headache", "nausea", "vomit", "cough", "dizzy", "bleeding", "breathing", "chest", "stomach", "rash", "allergy", "triage", "sick", "ill"];
  const urgentWords = ["high fever", "severe pain", "persistent vomiting", "dehydration", "infection", "worsening", "strong pain", "intense pain"];
  const isTriage = symptomWords.some((word) => lower.includes(word));

  if (!isTriage) 
    return { isTriage: false, level: "unknown" };
  if (detectRedFlagsFromText(message).length > 0) 
    return { isTriage: true, level: "emergency" };
  if (urgentWords.some((word) => lower.includes(word))) 
    return { isTriage: true, level: "urgent" };

  return { isTriage: true, level: "routine" };

}

function wantsTriage(message: string) {
  return getTriageLevel(message).isTriage || normalize(message).includes("triage");
}

function containsRealSymptomDetails(message: string) {

  const lower = normalizeLoose(message);
  const symptomKeywords = ["pain", "fever", "cough", "rash", "vomit", "nausea", "headache", "dizzy", "breathing", "chest", "stomach", "allergy", "diarrhea", "migraine", "infection"];

  if (symptomKeywords.some((k) => lower.includes(k)))
    return true;

  const genericOnly = ["i have symptoms", "need triage", "triage help", "i need triage", "help me", "not feeling well", "i feel sick", "medical help"];
  return !genericOnly.some((x) => lower === x || lower.includes(x));

}

function extractSeverity(message: string) {

  const match = message.match(/\b([1-9]|10)\b/);
  return match ? Number(match[1]) : null;

}

function getAdaptiveQuestions(category: SymptomCategory) {

  const questions: Record<SymptomCategory, { key: string; question: string; actions: ChatAction[] }[]> = {
    chest_pain: [
      {
        key: "breathing",
        question: "Do you also have shortness of breath or difficulty breathing?",
        actions: [
          { label: "No breathing issue", message: "No breathing issue" },
          { label: "Shortness of breath", message: "Shortness of breath" },
          { label: "Cannot breathe well", message: "Cannot breathe well" },
        ],
      },
      {
        key: "radiation",
        question: "Does the pain spread to your arm, jaw, back, neck, or shoulder?",
        actions: [
          { label: "No spreading pain", message: "No spreading pain" },
          { label: "Left arm or jaw", message: "Pain spreads to left arm or jaw" },
          { label: "Back or shoulder", message: "Pain spreads to back or shoulder" },
        ],
      },
      {
        key: "sweating_nausea",
        question: "Do you have sweating, nausea, dizziness, or fainting with the chest pain?",
        actions: [
          { label: "No", message: "No" },
          { label: "Sweating or nausea", message: "Sweating or nausea" },
          { label: "Dizziness or fainting", message: "Dizziness or fainting" },
        ],
      },
    ],
    rash: [
      {
        key: "allergy",
        question: "Did the rash appear after a new medicine, food, skincare product, or possible allergen?",
        actions: [
          { label: "No known trigger", message: "No known trigger" },
          { label: "New medicine", message: "New medicine" },
          { label: "Food or skincare", message: "Food or skincare" },
        ],
      },
      {
        key: "spread",
        question: "Is the rash spreading quickly or affecting the face, lips, eyes, or mouth?",
        actions: [
          { label: "Not spreading", message: "Not spreading" },
          { label: "Spreading quickly", message: "Spreading quickly" },
          { label: "Face/lips/eyes", message: "Face lips eyes affected" },
        ],
      },
      {
        key: "fever",
        question: "Do you also have fever, swelling, severe pain, or trouble breathing?",
        actions: [
          { label: "No", message: "No" },
          { label: "Fever or swelling", message: "Fever or swelling" },
          { label: "Trouble breathing", message: "Trouble breathing" },
        ],
      },
    ],
    headache: [
      {
        key: "onset",
        question: "Did the headache start suddenly and intensely, like the worst headache you have had?",
        actions: [
          { label: "Gradual onset", message: "Gradual onset" },
          { label: "Sudden severe onset", message: "Sudden severe onset" },
          { label: "Worst headache", message: "Worst headache" },
        ],
      },
      {
        key: "neuro",
        question: "Do you have confusion, weakness, numbness, trouble speaking, fainting, or seizure?",
        actions: [
          { label: "No neurological symptoms", message: "No neurological symptoms" },
          { label: "Weakness/numbness", message: "Weakness or numbness" },
          { label: "Confusion/speech issues", message: "Confusion or speech issues" },
        ],
      },
      {
        key: "vision",
        question: "Do you have vision changes, stiff neck, fever, or vomiting?",
        actions: [
          { label: "No", message: "No" },
          { label: "Vision changes", message: "Vision changes" },
          { label: "Fever/stiff neck/vomiting", message: "Fever stiff neck vomiting" },
        ],
      },
    ],
    digestive: [
      {
        key: "hydration",
        question: "Are you able to keep fluids down, or are you showing signs of dehydration?",
        actions: [
          { label: "Keeping fluids down", message: "Keeping fluids down" },
          { label: "Cannot keep fluids", message: "Cannot keep fluids down" },
          { label: "Dehydration signs", message: "Dehydration signs" },
        ],
      },
      {
        key: "pain_location",
        question: "Is the abdominal pain severe, localized to one area, or getting worse?",
        actions: [
          { label: "Mild/general", message: "Mild general pain" },
          { label: "Severe pain", message: "Severe pain" },
          { label: "Getting worse", message: "Getting worse" },
        ],
      },
      {
        key: "blood_fever",
        question: "Do you have blood in vomit/stool, high fever, or persistent vomiting?",
        actions: [
          { label: "No", message: "No" },
          { label: "High fever", message: "High fever" },
          { label: "Blood or persistent vomiting", message: "Blood or persistent vomiting" },
        ],
      },
    ],
    respiratory: [
      {
        key: "breathing",
        question: "Do you have shortness of breath, wheezing, blue lips, or chest tightness?",
        actions: [
          { label: "No breathing issue", message: "No breathing issue" },
          { label: "Shortness of breath", message: "Shortness of breath" },
          { label: "Blue lips/chest tightness", message: "Blue lips or chest tightness" },
        ],
      },
      {
        key: "fever_duration",
        question: "Do you have high fever, worsening symptoms, or symptoms lasting more than 3 days?",
        actions: [
          { label: "No", message: "No" },
          { label: "High fever", message: "High fever" },
          { label: "Worsening/over 3 days", message: "Worsening over 3 days" },
        ],
      },
      {
        key: "risk",
        question: "Do you have asthma, heart/lung disease, pregnancy, or immune system problems?",
        actions: [
          { label: "No risk factors", message: "No risk factors" },
          { label: "Asthma/lung disease", message: "Asthma or lung disease" },
          { label: "Immune/pregnancy/heart", message: "Immune pregnancy heart condition" },
        ],
      },
    ],
    musculoskeletal: [
      {
        key: "injury",
        question: "Did this start after an injury, fall, exercise, or sudden movement?",
        actions: [
          { label: "No injury", message: "No injury" },
          { label: "After injury", message: "After injury" },
          { label: "After exercise", message: "After exercise" },
        ],
      },
    ],

    urinary: [
      {
        key: "urinary_symptoms",
        question: "Do you have burning, frequent urination, fever, back pain, or blood in urine?",
        actions: [
          { label: "Burning/frequent", message: "Burning and frequent urination" },
          { label: "Fever/back pain", message: "Fever or back pain" },
          { label: "Blood in urine", message: "Blood in urine" },
        ],
      },
    ],

    eye: [
      {
        key: "vision",
        question: "Do you have vision loss, severe eye pain, redness, discharge, or light sensitivity?",
        actions: [
          { label: "Redness/discharge", message: "Redness or discharge" },
          { label: "Eye pain", message: "Eye pain" },
          { label: "Vision loss", message: "Vision loss" },
        ],
      },
    ],

    mental_health: [
      {
        key: "safety",
        question: "Are you feeling unsafe, having panic symptoms, or thoughts of harming yourself?",
        actions: [
          { label: "No safety risk", message: "No safety risk" },
          { label: "Panic symptoms", message: "Panic symptoms" },
          { label: "Feeling unsafe", message: "Feeling unsafe" },
        ],
      },
    ],

    dental: [
      {
        key: "dental_pain",
        question: "Do you have tooth pain, swelling, fever, bleeding, or trouble opening your mouth?",
        actions: [
          { label: "Tooth pain", message: "Tooth pain" },
          { label: "Swelling/fever", message: "Swelling or fever" },
          { label: "Bleeding", message: "Bleeding" },
        ],
      },
    ],

    general: [
      {
        key: "progression",
        question: "Are your symptoms improving, stable, or getting worse?",
        actions: [
          { label: "Improving", message: "Improving" },
          { label: "Stable", message: "Stable" },
          { label: "Getting worse", message: "Getting worse" },
        ],
      },
      {
        key: "fever",
        question: "Do you have fever, severe pain, fainting, breathing problems, or confusion?",
        actions: [
          { label: "No", message: "No" },
          { label: "Fever/severe pain", message: "Fever or severe pain" },
          { label: "Fainting/breathing/confusion", message: "Fainting breathing problems confusion" },
        ],
      },
    ],
  };

  return questions[category];

}

function getPossibleCauses(draft: TriageDraft) {

  const category = draft.symptomCategory || "general";
  const causes: Record<SymptomCategory, string[]> = {
    chest_pain: ["heart-related condition", "muscle strain", "acid reflux", "lung-related condition"],
    rash: ["allergic reaction", "dermatitis", "skin infection", "irritation"],
    headache: ["migraine", "tension headache", "dehydration", "blood pressure changes"],
    digestive: ["digestive infection", "food intolerance", "gastritis", "viral gastroenteritis"],
    respiratory: ["viral respiratory infection", "flu-like illness", "bronchitis", "allergy-related irritation"],
    musculoskeletal: ["muscle strain", "joint inflammation", "sprain", "orthopedic condition"],
    urinary: ["urinary tract infection", "kidney irritation", "bladder inflammation"],
    eye: ["eye irritation", "infection", "vision-related condition"],
    mental_health: ["anxiety-related symptoms", "stress reaction", "mood-related condition"],
    dental: ["tooth infection", "gum inflammation", "dental cavity"],
    general: ["several medical conditions that need clinical evaluation"],
  };

  return causes[category];

}

function getWarningSigns(category: SymptomCategory) {

  const shared = ["rapidly worsening symptoms", "fainting", "confusion", "severe weakness"];
  const byCategory: Record<SymptomCategory, string[]> = {
    chest_pain: ["difficulty breathing", "pain spreading to arm or jaw", "cold sweat", "fainting"],
    rash: ["trouble breathing", "swelling of lips or face", "rapid spreading", "fever with severe rash"],
    headache: ["sudden worst headache", "vision loss", "weakness or numbness", "confusion", "seizure"],
    digestive: ["blood in vomit or stool", "severe abdominal pain", "dehydration", "persistent vomiting"],
    respiratory: ["difficulty breathing", "blue lips", "chest tightness", "high fever that persists"],
    musculoskeletal: ["severe swelling", "inability to move limb", "numbness", "pain after major injury"],
    urinary: ["fever with back pain", "blood in urine", "severe kidney pain", "confusion"],
    eye: ["vision loss", "severe eye pain", "eye injury", "sudden vision changes"],
    mental_health: ["thoughts of self-harm", "feeling unsafe", "severe panic", "confusion"],
    dental: ["facial swelling", "fever", "trouble swallowing", "severe uncontrolled pain"],
    general: shared,
  };

  return [...new Set([...(byCategory[category] || []), ...shared])];

}

function detectRedFlagsFromDraft(draft: TriageDraft) {

  const combined = [draft.symptom || "", ...Object.values(draft.adaptiveAnswers || {}), ].join(" ");
  const detected = detectRedFlagsFromText(combined);
  const lower = normalize(combined);
  const extraFlags: string[] = [];

  if (draft.symptomCategory === "chest_pain") {
    if (lower.includes("shortness of breath")) 
      extraFlags.push("shortness of breath with chest pain");
    if (lower.includes("left arm") || lower.includes("jaw")) 
      extraFlags.push("pain spreading to arm or jaw");
    if (lower.includes("cold sweat") || lower.includes("sweating")) 
      extraFlags.push("sweating with chest pain");
    if (lower.includes("fainting")) extraFlags.push("fainting");
  }

  if (draft.symptomCategory === "rash") {
    if (lower.includes("trouble breathing")) 
      extraFlags.push("trouble breathing with rash");
    if (lower.includes("face") || lower.includes("lips") || lower.includes("eyes")) 
      extraFlags.push("face/lips/eyes affected");
    if (lower.includes("spreading quickly")) 
      extraFlags.push("rapidly spreading rash");
  }

  if (draft.symptomCategory === "headache") {
    if (lower.includes("sudden severe") || lower.includes("worst headache")) 
      extraFlags.push("sudden severe headache");
    if (lower.includes("vision changes")) 
      extraFlags.push("vision changes");
    if (lower.includes("confusion") || lower.includes("speech")) 
      extraFlags.push("neurological symptoms");
    if (lower.includes("weakness") || lower.includes("numbness")) 
      extraFlags.push("weakness or numbness");
  }

  return [...new Set([...detected, ...extraFlags])];

}

function calculateTriageLevel(draft: TriageDraft): TriageLevel {

  const redFlags = detectRedFlagsFromDraft(draft);
  if (redFlags.length > 0) 
    return "emergency";
  if ((draft.severity || 0) >= 8) 
    return "urgent";

  const answers = normalize(Object.values(draft.adaptiveAnswers || {}).join(" "));
  if (answers.includes("getting worse") || answers.includes("high fever") || answers.includes("persistent") ||  answers.includes("spreading quickly") ||  answers.includes("cannot keep fluids") || answers.includes("severe pain"))
    return "urgent";

  if ((draft.severity || 0) >= 6) 
    return "urgent";

  return "routine";

}

function calculateConfidence(draft: TriageDraft): number {

  let score = 40;
  if (draft.severity !== undefined) score += 15;
  if (Object.keys(draft.adaptiveAnswers || {}).length >= 3) score += 20;
  if ((draft.redFlags || []).length > 0) score += 15;
  if (draft.symptomCategory && draft.symptomCategory !== "general") score += 10;
  return Math.min(score, 100);

}

function buildTriagePatientNote(draft: TriageDraft) {

  return [
    "AI triage was completed before this appointment.",
    `Triage level: ${draft.level || "unknown"}.`,
    `Main symptom reported: ${draft.symptom || "Unknown"}.`,
    `Recommended area: ${draft.recommendedService || "General consultation"}.`,
    "This is not a diagnosis. Your doctor will review your symptoms during the appointment.",
  ].join("\n");

}

function buildTriageDoctorSummary(draft: TriageDraft) {

  const adaptiveLines = Object.entries(draft.adaptiveAnswers || {}).map(([key, value]) => `- ${key}: ${value}`);
  return [
    "AI TRIAGE SUMMARY",
    `Main symptoms: ${draft.symptom || "Unknown"}`,
    `Symptom category: ${draft.symptomCategory || "general"}`,
    `Duration: ${draft.duration || "Unknown"}`,
    `Severity: ${draft.severity || "Unknown"}/10`,
    "Adaptive answers:",
    adaptiveLines.length ? adaptiveLines.join("\n") : "- None recorded",
    `Red flags: ${draft.redFlags?.length ? draft.redFlags.join(", ") : "None reported"}`,
    `Triage level: ${draft.level || "unknown"}`,
    `Possible causes discussed: ${draft.possibleCauses?.length ? draft.possibleCauses.join(", ") : "Not identified"}`,
    `Recommended service: ${draft.recommendedService || "General consultation"}`,
    "Doctor-only note: This is an AI-generated triage summary for clinical context only. It is not a diagnosis.",
  ].join("\n");

}

async function getCurrentUser(supabase: any, req: Request) {

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) 
    return null;

  const { data: { user }, } = await supabase.auth.getUser(token);

  return user ?? null;

}

async function getProfile(supabase: any, userId: string) {

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, active_clinic_id")
    .eq("id", userId)
    .maybeSingle();

  return data ?? null;

}

async function saveAuditLog(supabase: any, payload: Record<string, unknown>) {

  try {
    await supabase.from("ai_audit_logs").insert(payload);
  } catch (_) {}

}

async function saveTriage(supabase: any, payload: Record<string, unknown>) {

  const { data, error } = await supabase
    .from("ai_triage_sessions")
    .insert(payload)
    .select("id")
    .single();

  if (error) 
    return null;

  return data?.id ?? null;

}

async function findRealClinicServiceForTriage(supabase: any, clinicId: string | undefined, draft: TriageDraft) {

  if (!clinicId) 
    return null;

  const { data: services } = await supabase
    .from("clinic_services")
    .select("id, title, category, description, duration_minutes")
    .eq("clinic_id", clinicId)
    .eq("is_active", true);

  const list = services ?? [];
  if (!list.length) 
    return null;

  const scored = list
    .map((service: any) => ({
      service,
      score: scoreClinicService(
        service,
        `${draft.symptom || ""} ${draft.recommendedService || ""}`,
        draft.recommendedService || undefined,
        draft.symptomCategory || "general"
      ),
    }))
    .sort((a: any, b: any) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].service : null;

}

async function getLatestAttachableTriage(supabase: any, userId: string, clinicId: string, serviceTitle?: string) {

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("ai_triage_sessions")
      .select("id, triage_level, recommended_service, patient_note, doctor_summary, created_at")
      .eq("user_id", userId)
      .eq("clinic_id", clinicId)
      .neq("triage_level", "emergency")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5);

    const rows = data ?? [];
    if (!rows.length) 
      return null;

    const service = normalizeLoose(serviceTitle || "");
    return (rows.find((row: any) => service && normalizeLoose(row.recommended_service || "").includes(service)) || rows[0]);
  } catch (_) {
    return null;
  }

}

async function findService(supabase: any, clinicId: string, message: string) {

  const { data: services } = await supabase
    .from("clinic_services")
    .select("id, title, category, description, duration_minutes")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("title", { ascending: true });

  const list = services ?? [];
  const recommended = getRecommendedServiceQuery(message);

  const scored = list
    .map((service: any) => ({
      service,
      score: scoreClinicService(service, message, recommended, detectSymptomCategory(message)),
    }))
    .sort((a: any, b: any) => b.score - a.score);

  const best = scored[0];
  const service = best && best.score >= 12 ? best.service : null;

  return {service, services: list, recommendedServiceTitle: recommended, recommendationScore: best?.score ?? 0, };

}

async function findDoctorsForService(supabase: any, clinicId: string, serviceId: string) {

  const { data: doctorServices } = await supabase
    .from("doctor_services")
    .select("doctor_id")
    .eq("service_id", serviceId);

  const doctorIds = [...new Set((doctorServices ?? []).map((item: any) => item.doctor_id))];
  if (doctorIds.length === 0) 
    return [];

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, first_name, last_name, specialty, is_active")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .in("id", doctorIds)
    .order("last_name", { ascending: true });

  return doctors ?? [];

}

function findDoctorFromMessage(doctors: any[], message: string) {

  const lower = normalize(message);
  return (doctors.find((d) => lower.includes(normalize(`${d.first_name} ${d.last_name}`))) || doctors.find((d) => lower.includes(normalize(d.last_name))) || null);

}

async function getAvailableSlots({
  supabase,
  clinicId,
  serviceId,
  durationMinutes,
  date,
  doctorId,
  locationId,
}: {
  supabase: any;
  clinicId: string;
  serviceId: string;
  durationMinutes: number;
  date: string;
  doctorId?: string;
  locationId?: string;
}) {

  const doctors = await findDoctorsForService(supabase, clinicId, serviceId);
  const filteredDoctors = doctorId ? doctors.filter((d: any) => d.id === doctorId) : doctors;
  if (filteredDoctors.length === 0) 
    return [];

  const doctorIds = filteredDoctors.map((d: any) => d.id);
  let doctorLocationsQuery = supabase
    .from("doctor_locations")
    .select("doctor_id, location_id")
    .in("doctor_id", doctorIds);
  if (locationId) 
    doctorLocationsQuery = doctorLocationsQuery.eq("location_id", locationId);

  const { data: doctorLocations } = await doctorLocationsQuery;
  const locationIds = [...new Set((doctorLocations ?? []).map((item: any) => item.location_id))];
  if (locationIds.length === 0) 
    return [];

  const { data: locations } = await supabase
    .from("clinic_locations")
    .select("id, name, city")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .in("id", locationIds);
  const weekday = getWeekday(date);
  let availabilityQuery = supabase
    .from("doctor_availability")
    .select("doctor_id, location_id, weekday, start_time, end_time, slot_minutes, is_active")
    .in("doctor_id", doctorIds)
    .eq("weekday", weekday)
    .eq("is_active", true);
  if (locationId) 
    availabilityQuery = availabilityQuery.eq("location_id", locationId);

  const { data: availability } = await availabilityQuery;
  const { data: appointments } = await supabase
    .from("appointments")
    .select("doctor_id, location_id, appointment_date, start_time, end_time, status")
    .in("doctor_id", doctorIds)
    .eq("appointment_date", date)
    .in("status", ["scheduled", "rescheduled", "checked_in"]);
  const slots: Slot[] = [];

  for (const row of availability ?? []) {
    const doctor = filteredDoctors.find((d: any) => d.id === row.doctor_id);
    const location = locations?.find((l: any) => l.id === row.location_id);
    if (!doctor || !location) 
      continue;

    const start = timeToMinutes(row.start_time);
    const end = timeToMinutes(row.end_time);
    const step = row.slot_minutes || 30;

    for (let current = start; current + durationMinutes <= end; current += step) {
      const startTime = minutesToTime(current);
      const endTime = minutesToTime(current + durationMinutes);

      const hasConflict = (appointments ?? []).some((appt: any) => { return (appt.doctor_id === doctor.id && appt.location_id === location.id && overlaps(startTime, endTime, appt.start_time, appt.end_time)); });

      if (!hasConflict) {
        slots.push({
          doctorId: doctor.id,
          doctorName: `Dr. ${doctor.first_name} ${doctor.last_name}`,
          locationId: location.id,
          locationName: `${location.name}${location.city ? `, ${location.city}` : ""}`,
          date,
          startTime,
          endTime,
        });
      }
    }
  }

  return slots.slice(0, 5);

}

async function getFirstAvailableSlot(args: {supabase: any; clinicId: string; serviceId: string; durationMinutes: number; doctorId?: string; locationId?: string;}) {

  const today = new Date();

  for (let i = 0; i < 14; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const slots = await getAvailableSlots({...args, date: date.toISOString().slice(0, 10), });

    if (slots.length > 0) 
      return slots[0];
  }

  return null;

}

async function listUserAppointments(supabase: any, user: any, role: Role, clinicId?: string) {

  let query = supabase
    .from("appointments")
    .select("id, appointment_date, start_time, end_time, status, patient_id, doctor_id, location_id, service_id, patient_first_name, patient_last_name, notes, ai_triage_patient_note, ai_triage_summary, ai_triage_level, triage_session_id, doctors(first_name,last_name), clinic_services(title), clinic_locations(name,city)")
    .in("status", ["scheduled", "rescheduled", "checked_in"])
    .gte("appointment_date", todayISO())
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(5);

  if (clinicId) 
    query = query.eq("clinic_id", clinicId);
  if (role === "patient") 
    query = query.eq("patient_id", user.id);
  if (role === "doctor") {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (doctor?.id) 
      query = query.eq("doctor_id", doctor.id);
  }

  const { data } = await query;
  return data ?? [];

}

function appointmentLabel(appt: any) {

  const service = Array.isArray(appt.clinic_services) ? appt.clinic_services[0] : appt.clinic_services;
  const doctor = Array.isArray(appt.doctors) ? appt.doctors[0] : appt.doctors;

  return `${service?.title || "Appointment"} · ${appt.appointment_date} ${String(appt.start_time).slice(0, 5)} · Dr. ${doctor?.first_name || ""} ${doctor?.last_name || ""}`.trim();

}

async function handleAppointmentManagement(ctx: AppContext, bookingDraft?: BookingDraft | null) {

  const { supabase, message, clinicId, clinicName, role, user } = ctx;

  if (!user)
    return { handled: true, reply: "Please log in before managing appointments.", actions: [], bookingDraft: null };

if (!clinicId) {
  return {
    handled: true,
    reply:
      role === "platform_admin"
        ? "As a platform admin, you can access all clinics, but please select a clinic first so I know which clinic's appointments to manage."
        : "Please select a clinic before managing appointments.",
    actions: [{ label: "Select clinic", route: "/clinic-selection" }],
    bookingDraft: null,
  };
}

  let draft: BookingDraft = bookingDraft?.active
    ? { ...bookingDraft }
    : {
        active: true,
        mode: wantsCancelAppointment(message) ? "cancel" : wantsCheckInAppointment(message) ? "check_in" : "reschedule",
        step: "select_appointment",
      };

  if (cancels(message) || wantsToExitActiveFlow(message)) {
    await saveAuditLog(supabase, {
      user_id: user.id,
      clinic_id: clinicId,
      action: "appointment_management_flow_stopped",
      metadata: {
        role,
        mode: draft.mode,
        step: draft.step,
        appointmentId: draft.appointmentId || null,
        messagePreview: message.slice(0, 160),
      },
    });
    return {
      handled: true,
      reply: "No problem. I stopped the appointment management flow. What would you like to do next?",
      actions: buildNavigationActions({
        message,
        role,
        clinicId,
        clinicName,
      }),
      bookingDraft: null,
    };
  }

  if (draft.step === "select_appointment") {
    const appts = await listUserAppointments(supabase, user, role, clinicId);
    const lower = normalize(message);
    const selected = appts.find((appt: any) => lower.includes(String(appt.id).slice(0, 8))) || (appts.length === 1 ? appts[0] : null);

    if (!selected) {
      return {
        handled: true,
        reply: appts.length ? "Which appointment do you want to manage?" : "I could not find upcoming appointments for you in this clinic.",
        actions: appts.map((appt: any) => ({
          label: appointmentLabel(appt),
          message: `Appointment ${String(appt.id).slice(0, 8)}`,
        })),
        bookingDraft: appts.length ? draft : null,
      };
    }

    draft.appointmentId = selected.id;

    if (draft.mode === "cancel") {
      draft.step = "confirm_cancel";
      return {
        handled: true,
        reply: `Please confirm cancellation: ${appointmentLabel(selected)}.`,
        actions: [
          { label: "Confirm cancellation", message: "Confirm" },
          { label: "Keep appointment", message: "Cancel" },
        ],
        bookingDraft: draft,
      };
    }

    if (draft.mode === "check_in") {
      if (selected.status === "checked_in") {
        return {
          handled: true,
          reply: `This appointment is already checked in: ${appointmentLabel(selected)}.`,
          actions: [
            {
              label: "View appointments",
              route: "/manage-appointments",
              params: { clinicId, clinicName: clinicName || "" },
            },
          ],
          bookingDraft: null,
        };
      }

      draft.step = "confirm_check_in";

      return {
        handled: true,
        reply: `Please confirm check-in for this appointment: ${appointmentLabel(selected)}.`,
        actions: [
          { label: "Confirm check-in", message: "Confirm" },
          { label: "Cancel", message: "Cancel" },
        ],
        bookingDraft: draft,
      };
    }

    draft.step = "date";
    draft.serviceId = selected.service_id;
    draft.doctorId = selected.doctor_id;
    draft.locationId = selected.location_id;
    draft.serviceTitle = appointmentLabel(selected).split(" · ")[0];
    draft.serviceDuration = Math.max(30, timeToMinutes(selected.end_time) - timeToMinutes(selected.start_time));

    return {
      handled: true,
      reply: "What new date would you prefer? You can write today, tomorrow, Friday, or 2026-05-22.",
      actions: [
        { label: "Tomorrow", message: "Tomorrow" },
        { label: "Friday", message: "Friday" },
      ],
      bookingDraft: draft,
    };
  }

  if (draft.step === "confirm_cancel") {
    if (!confirms(message)) {
      return {
        handled: true,
        reply: "Please confirm cancellation or say Cancel to keep it.",
        actions: [
          { label: "Confirm cancellation", message: "Confirm" },
          { label: "Keep appointment", message: "Cancel" },
        ],
        bookingDraft: draft,
      };
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", draft.appointmentId)
      .eq("clinic_id", clinicId);

    if (error)
      return { handled: true, reply: `I could not cancel the appointment: ${error.message}`, actions: [], bookingDraft: draft };

    await saveAuditLog(supabase, {
      user_id: user.id,
      clinic_id: clinicId,
      action: "appointment_cancelled_from_chat",
      metadata: {
        role,
        appointmentId: draft.appointmentId,
        mode: draft.mode,
      },
    });

    return {
      handled: true,
      reply: "The appointment was cancelled successfully.",
      actions: [
        {
          label: "View appointments",
          route: role === "patient" ? "/my-appointments" : "/manage-appointments",
          params: { clinicId, clinicName: clinicName || "" },
        },
      ],
      bookingDraft: null,
    };
  }

  if (draft.step === "confirm_check_in") {
    if (!confirms(message)) {
      return {
        handled: true,
        reply: "Please confirm check-in or say Cancel to stop.",
        actions: [
          { label: "Confirm check-in", message: "Confirm" },
          { label: "Cancel", message: "Cancel" },
        ],
        bookingDraft: draft,
      };
    }

    if (role !== "clinic_admin" && role !== "platform_admin") {
      return {
        handled: true,
        reply: "Only clinic admins or platform admins can check in patients from chat.",
        actions: [],
        bookingDraft: null,
      };
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        status: "checked_in",
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", draft.appointmentId)
      .eq("clinic_id", clinicId)
      .in("status", ["scheduled", "rescheduled"]);

    if (error) {
      return {
        handled: true,
        reply: `I could not check in the appointment: ${error.message}`,
        actions: [],
        bookingDraft: draft,
      };
    }

    await saveAuditLog(supabase, {
      user_id: user.id,
      clinic_id: clinicId,
      action: "appointment_checked_in_from_chat",
      metadata: {
        role,
        appointmentId: draft.appointmentId,
        mode: draft.mode,
      },
    });

    return {
      handled: true,
      reply: "The patient was checked in successfully.",
      actions: [
        {
          label: "View appointments",
          route: "/manage-appointments",
          params: { clinicId, clinicName: clinicName || "" },
        },
      ],
      bookingDraft: null,
    };
  }

  if (draft.mode === "reschedule") {
    const parsedDate = parseDateFromMessage(message);

    if (parsedDate && isPastDate(parsedDate)) {
      return {
        handled: true,
        reply: "That date is in the past. Please choose today or a future date.",
        actions: [
          { label: "Today", message: "Today" },
          { label: "Tomorrow", message: "Tomorrow" },
        ],
        bookingDraft: { ...draft, appointmentDate: undefined, step: "date" },
      };
    }

    if (parsedDate) {
      draft.appointmentDate = parsedDate;
      draft.step = "time";
    }

    if (!draft.appointmentDate) {
      return {
        handled: true,
        reply: "What new date would you prefer?",
        actions: [
          { label: "Today", message: "Today" },
          { label: "Tomorrow", message: "Tomorrow" },
          { label: "Friday", message: "Friday" },
        ],
        bookingDraft: draft,
      };
    }

    const slots = await getAvailableSlots({ supabase, clinicId, serviceId: draft.serviceId!, durationMinutes: draft.serviceDuration || 30, date: draft.appointmentDate, doctorId: draft.doctorId, locationId: draft.locationId });

    if (slots.length === 0) {
      return {
        handled: true,
        reply: "I could not find available slots for that date. Please choose another date.",
        actions: [
          { label: "Tomorrow", message: "Tomorrow" },
          { label: "Friday", message: "Friday" },
        ],
        bookingDraft: { ...draft, appointmentDate: undefined, step: "date" },
      };
    }

    const parsedTime = parseTimeFromMessage(message);

    if (!draft.startTime && parsedTime) {
      const selectedSlot = slots.find((slot) => slot.startTime === parsedTime);

      if (!selectedSlot) {
        return {
          handled: true,
          reply: `That time is not available. Available options are: ${slots
            .map((slot) => `${slot.startTime.slice(0, 5)} with ${slot.doctorName}`)
            .join(", ")}.`,
          actions: slots.map((slot) => ({
            label: `${slot.startTime.slice(0, 5)} · ${slot.doctorName}`,
            message: slot.startTime.slice(0, 5),
          })),
          bookingDraft: draft,
        };
      }

      draft.startTime = selectedSlot.startTime;
      draft.endTime = selectedSlot.endTime;
      draft.doctorId = selectedSlot.doctorId;
      draft.locationId = selectedSlot.locationId;
      draft.doctorName = selectedSlot.doctorName;
      draft.locationName = selectedSlot.locationName;
      draft.step = "confirm";
    }

    if (!draft.startTime) {
      return {
        handled: true,
        reply: `I found these available slots on ${draft.appointmentDate}:`,
        actions: slots.map((slot) => ({
          label: `${slot.startTime.slice(0, 5)} · ${slot.doctorName}`,
          message: slot.startTime.slice(0, 5),
        })),
        bookingDraft: draft,
      };
    }

    if (draft.step === "confirm" && !confirms(message)) {
      return {
        handled: true,
        reply: `Please confirm rescheduling to ${draft.appointmentDate}, from ${draft.startTime?.slice(0, 5)} to ${draft.endTime?.slice(0, 5)}.`,
        actions: [
          { label: "Confirm reschedule", message: "Confirm" },
          { label: "Cancel", message: "Cancel" },
        ],
        bookingDraft: draft,
      };
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        appointment_date: draft.appointmentDate,
        start_time: draft.startTime,
        end_time: draft.endTime,
        doctor_id: draft.doctorId,
        location_id: draft.locationId,
        status: "rescheduled",
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", draft.appointmentId)
      .eq("clinic_id", clinicId);

    if (error)
      return { handled: true, reply: `I could not reschedule the appointment: ${error.message}`, actions: [], bookingDraft: draft };

    await saveAuditLog(supabase, {
      user_id: user.id,
      clinic_id: clinicId,
      action: "appointment_rescheduled_from_chat",
      metadata: {
        role,
        appointmentId: draft.appointmentId,
        date: draft.appointmentDate,
        startTime: draft.startTime,
        endTime: draft.endTime,
        doctorId: draft.doctorId,
        locationId: draft.locationId,
      },
    });

    return {
      handled: true,
      reply: `The appointment was rescheduled successfully to ${draft.appointmentDate}, from ${draft.startTime?.slice(0, 5)} to ${draft.endTime?.slice(0, 5)}.`,
      actions: [
        {
          label: "View appointments",
          route: role === "patient" ? "/my-appointments" : "/manage-appointments",
          params: { clinicId, clinicName: clinicName || "" },
        },
      ],
      bookingDraft: null,
    };
  }

  return { handled: false, reply: "", actions: [], bookingDraft: draft };

}

async function handleTriageFlow(ctx: AppContext, triageDraft?: TriageDraft | null) {

  const { supabase, message, clinicId, clinicName, role, user } = ctx;
  let draft: TriageDraft = triageDraft?.active
    ? { ...triageDraft }
    : { active: true, step: "symptom", adaptiveIndex: 0, adaptiveAnswers: {}, sessionStartedAt: new Date().toISOString(), messageCount: 0 };

  draft.messageCount = (draft.messageCount || 0) + 1;

  if (wantsToExitActiveFlow(message)) {
    await saveAuditLog(supabase, {
      user_id: user?.id ?? null,
      clinic_id: clinicId ?? null,
      action: "triage_flow_stopped",
      metadata: {
        role,
        step: draft.step,
        symptomCategory: draft.symptomCategory || null,
        messagePreview: message.slice(0, 160),
      },
    });

    return {
      handled: true,
      reply: "No problem. I stopped the triage flow. What would you like to do next?",
      actions: buildNavigationActions({ message, role, clinicId, clinicName }),
      bookingDraft: null,
      triageDraft: null,
    };
  }

  if (draft.step === "symptom") {
    if (!containsRealSymptomDetails(message)) {
      return {
        handled: true,
        reply: "Please describe your main symptom or concern in a few words.",
        actions: [
          { label: "Headache", message: "I have a headache" },
          { label: "Chest pain", message: "I have chest pain" },
          { label: "Rash", message: "I have a rash" },
          { label: "Stomach pain", message: "I have stomach pain" },
        ],
        bookingDraft: null,
        triageDraft: draft,
      };
    }

      draft.symptom = message;
      draft.symptomCategory = detectSymptomCategory(message);
      draft.recommendedService = getRecommendedServiceQuery(message);
      draft.step = "duration";

      return {
        handled: true,
        reply: "How long have you had this symptom?",
        actions: [
          { label: "Today", message: "Today" },
          { label: "1-2 days", message: "1-2 days" },
          { label: "More than a week", message: "More than a week" },
        ],
        bookingDraft: null,
        triageDraft: draft,
      };
  }

  if (draft.step === "duration") {
    draft.duration = message;
    draft.step = "severity";
    return {
      handled: true,
      reply: "How severe is it from 1 to 10?",
      actions: [
        { label: "Mild 1-3", message: "3" },
        { label: "Moderate 4-6", message: "5" },
        { label: "Severe 7-10", message: "8" },
      ],
      bookingDraft: null,
      triageDraft: draft,
    };
  }

  if (draft.step === "severity") {
    const severity = extractSeverity(message);
    if (!severity) {
      return {
        handled: true,
        reply: "Please choose a number from 1 to 10 for severity.",
        actions: [
          { label: "3", message: "3" },
          { label: "5", message: "5" },
          { label: "8", message: "8" },
        ],
        bookingDraft: null,
        triageDraft: draft,
      };
    }

    draft.severity = severity;
    draft.step = "adaptive";
    draft.adaptiveIndex = 0;
    draft.adaptiveAnswers = draft.adaptiveAnswers || {};

    const questions = getAdaptiveQuestions(draft.symptomCategory || "general");
    const nextQuestion = questions[0];

    return { handled: true, reply: nextQuestion.question, actions: nextQuestion.actions, bookingDraft: null, triageDraft: draft, };
  }

  if (draft.step === "adaptive") {
    const questions = getAdaptiveQuestions(draft.symptomCategory || "general");
    const currentIndex = draft.adaptiveIndex || 0;
    const currentQuestion = questions[currentIndex];
    draft.adaptiveAnswers = { ...(draft.adaptiveAnswers || {}), [currentQuestion.key]: message, };
    const nextIndex = currentIndex + 1;
    const nextQuestion = questions[nextIndex];

    if (nextQuestion) {
      draft.adaptiveIndex = nextIndex;
      return {
        handled: true,
        reply: nextQuestion.question,
        actions: nextQuestion.actions,
        bookingDraft: null,
        triageDraft: draft,
      };
    }

    draft.step = "red_flags";

    return {
      handled: true,
      reply:
        "Before I summarize this, do you have any severe or sudden symptoms such as fainting, confusion, severe bleeding, seizure, trouble breathing, or rapidly worsening symptoms?",
      actions: [
        { label: "No severe symptoms", message: "No severe symptoms" },
        { label: "Trouble breathing", message: "Trouble breathing" },
        { label: "Fainting or confusion", message: "Fainting or confusion" },
        { label: "Rapidly worsening", message: "Rapidly worsening symptoms" },
      ],
      bookingDraft: null,
      triageDraft: draft,
    };
  }

  const finalRedFlags = [ ...new Set([ ...detectRedFlagsFromDraft(draft), ...detectRedFlagsFromText(message), ]), ];
  draft.redFlags = finalRedFlags;
  draft.possibleCauses = getPossibleCauses(draft);
  draft.warningSigns = getWarningSigns(draft.symptomCategory || "general");
  draft.level = calculateTriageLevel(draft);

  const realService = await findRealClinicServiceForTriage(supabase, clinicId, draft);
  if (realService)
    draft.recommendedService = realService.title;

  draft.patientNote = buildTriagePatientNote(draft);
  draft.doctorSummary = buildTriageDoctorSummary(draft);

  const confidence = calculateConfidence(draft);
  const sessionDuration = draft.sessionStartedAt
    ? Math.round((Date.now() - new Date(draft.sessionStartedAt).getTime()) / 1000)
    : null;

  const triageId = await saveTriage(supabase, {
    user_id: user?.id ?? null,
    clinic_id: clinicId ?? null,
    role,
    main_symptom: draft.symptom ?? null,
    duration: draft.duration ?? null,
    severity: draft.severity ?? null,
    red_flags: draft.redFlags ?? [],
    triage_level: draft.level,
    possible_causes: draft.possibleCauses ?? [],
    recommended_service: draft.recommendedService ?? null,
    patient_note: draft.patientNote,
    doctor_summary: draft.doctorSummary,
    raw_draft: draft,
    triage_confidence: confidence,
    message_count: draft.messageCount ?? null,
    session_duration_seconds: sessionDuration,
  });

  await saveAuditLog(supabase, {
    user_id: user?.id ?? null,
    clinic_id: clinicId ?? null,
    action: "ai_triage_completed",
    metadata: {
      triageId,
      level: draft.level,
      category: draft.symptomCategory,
      recommendedService: draft.recommendedService,
      redFlags: draft.redFlags ?? [],
      severity: draft.severity ?? null,
      duration: draft.duration ?? null,
      hasUser: Boolean(user?.id),
    },
  });

  if (draft.level === "emergency") {
    return {
      handled: true,
      reply: withTriageDisclaimer(
        `Based on your answers, this may be a medical emergency. Possible causes may include: ${draft.possibleCauses.join(
          ", "
        )}. Please contact emergency services immediately or go to the nearest emergency department. I cannot diagnose you, but these symptoms require urgent medical attention.`
      ),
      actions: [],
      bookingDraft: null,
      triageDraft: null,
    };
  }

  const actions: ChatAction[] = [];

  if (role === "patient" && clinicId) {
    actions.push({
      label: draft.recommendedService
        ? `Start booking ${draft.recommendedService}`
        : "Start booking",
      message: draft.recommendedService
        ? `I want to book ${draft.recommendedService}`
        : "I want to book an appointment",
    });

    actions.push({
      label: "Message a doctor",
      route: "/messages",
      params: { clinicId, clinicName: clinicName || "" },
    });
  }

  const urgencyText = draft.level === "urgent" ? "This appears urgent because symptoms are significant, worsening, or include concerning details." : "This currently appears suitable for routine medical evaluation if symptoms remain stable.";

  return {
    handled: true,
    reply: withTriageDisclaimer(
      `${urgencyText} Possible causes may include: ${draft.possibleCauses.join(
        ", "
      )}. Recommended service: ${
        draft.recommendedService || "General consultation"
      }. Warning signs to monitor: ${draft.warningSigns.join(
        ", "
      )}. I cannot diagnose you, but medical evaluation is recommended if symptoms continue or worsen.`
    ),
    actions,
    bookingDraft: null,
    triageDraft: null,
  };

}

function handleRoleWorkflowHelp(ctx: AppContext) {

  const { message, role, clinicId, clinicName } = ctx;
  const params = clinicId ? { clinicId, clinicName: clinicName || "" } : undefined;

  if (!clinicId && roleWorkflowNeedsClinic(message, role)) {
  return selectClinicReply(role);
}

  if (role === "doctor") {
    if (wantsMedicalRecordHelp(message)) {
      return {
        handled: true,
        reply: "You can create a medical record from Manage Appointments. Open the relevant appointment, review the visit details, then add symptoms, diagnosis, vitals, treatment plan, prescription and follow-up notes. After saving, the record will appear in Patient History.",
        actions: [
          { label: "Manage appointments", route: "/manage-appointments", params },
          { label: "Patient history", route: "/my-patients-history", params },
        ],
      };
    }

    if (wantsPatientHistoryHelp(message)) {
      return {
        handled: true,
        reply: "You can review patient history, previous appointments, AI triage notes, onboarding summaries and patient documents from Patient History.",
        actions: [
          { label: "Open patient history", route: "/my-patients-history", params },
          { label: "Open my patients", route: "/my-patients", params },
        ],
      };
    }

    if (wantsMessagesHelp(message)) {
      return {
        handled: true,
        reply: "You can message patients from the Messages page. Conversations are linked to your clinic context.",
        actions: [{ label: "Open messages", route: "/messages", params }],
      };
    }
  }

  if (role === "clinic_admin") {
    if (asksHowToManageAppointments(message) || asksHowToCheckIn(message)) {
  return {
    handled: true,
    reply:
      "You can manage appointment status from Manage Appointments. There you can view appointment details, cancel or reschedule bookings, and check in patients when they arrive. Check-in marks the patient as arrived and updates the appointment status so the visit can continue smoothly.\n\nWould you like to open Manage Appointments, or do you want me to start one of these actions from chat?",
    actions: [
      { label: "Open appointments", route: "/manage-appointments", params },
      { label: "Cancel from chat", message: "Start cancellation" },
      { label: "Reschedule from chat", message: "Start reschedule" },
      { label: "Check in from chat", message: "Start check in" },
    ],
  };
}
    if (wantsCancelAppointment(message) || wantsRescheduleAppointment(message) || wantsCheckInAppointment(message)) {
      return {
        handled: true,
        reply: "You can manage appointment cancellation, rescheduling and patient check-in from Manage Appointments. For cancel or reschedule, I can also guide the flow directly from chat.",
        actions: [{ label: "Manage appointments", route: "/manage-appointments", params }],
      };
    }

    if (wantsUsersHelp(message)) {
      return {
        handled: true,
        reply: "As a clinic admin, you can create clinic users, edit doctors, patients and clinic admins, update access and manage profile details from Manage Users.",
        actions: [{ label: "Manage users", route: "/manage-users", params }],
      };
    }

    if (wantsClinicContentHelp(message)) {
      return {
        handled: true,
        reply: "You can edit clinic services, technologies and health tips from Manage Clinic Content.",
        actions: [{ label: "Manage clinic content", route: "/manage-clinic-content", params }],
      };
    }

    if (wantsClinicSettingsHelp(message)) {
      return {
        handled: true,
        reply: "Clinic settings let you update clinic branding, logo, colors and clinic profile information.",
        actions: [{ label: "Open clinic settings", route: "/clinic-settings", params }],
      };
    }
  }

  if (role === "platform_admin") {
    if (asksHowToManageAppointments(message) || asksHowToCheckIn(message)) {
      return {
        handled: true,
        reply:
          "As a platform admin, you can review and manage appointment workflows in the selected clinic context. Manage Appointments lets you inspect bookings, review status, cancel or reschedule appointments, and check in patients. If no clinic is selected, choose a clinic first so the system knows which appointments to show.\n\nWould you like to open Manage Appointments, select a clinic, or start an action from chat?",
        actions: [
          clinicId
            ? { label: "Open appointments", route: "/manage-appointments", params }
            : { label: "Select clinic", route: "/clinic-selection" },
          { label: "Cancel from chat", message: "Start cancellation" },
          { label: "Reschedule from chat", message: "Start reschedule" },
          { label: "Check in from chat", message: "Start check in" },
        ],
      };
    }

    if (wantsCancelAppointment(message) || wantsRescheduleAppointment(message) || wantsCheckInAppointment(message)) {
      return {
        handled: true,
        reply: "As a platform admin, you can review appointment cancellation, rescheduling and check-in workflows from Manage Appointments. For cancel or reschedule, I can also start the management flow from chat when a clinic context is selected.",
        actions: [{ label: "Manage appointments", route: "/manage-appointments", params }],
      };
    }

    if (wantsUsersHelp(message)) {
      return {
        handled: true,
        reply: "As a platform admin, you can manage users across the platform, assign clinic access, create admins, doctors and patients, and deactivate or delete users.",
        actions: [{ label: "Manage users", route: "/manage-users", params }],
      };
    }

    if (wantsAnalyticsHelp(message)) {
      return {
        handled: true,
        reply: "You can view platform analytics, clinic activity, appointment trends and platform health from Analytics.",
        actions: [
          { label: "View analytics", route: "/analytics", params },
          { label: "Dashboard", route: "/main-platform-admin", params },
        ],
      };
    }

    if (normalizeLoose(message).includes("clinic")) {
      return {
        handled: true,
        reply: "You can create, edit and review clinics from Manage Clinics.",
        actions: [{ label: "Manage clinics", route: "/manage-clinics", params }],
      };
    }
  }

  return { handled: false };

}

async function handleBookingFlow(ctx: AppContext, bookingDraft?: BookingDraft | null) {

  const { supabase, message, clinicId, clinicName, role, user } = ctx;

  if (!user) {
    return {
      handled: true,
      reply: "Please log in before booking an appointment.",
      actions: [
        {
          label: "Log in",
          route: "/login",
        },
        {
          label: "Create account",
          route: "/signup",
        },
      ],
      bookingDraft: null,
    };
  }

  if (!clinicId) {
    return {
      handled: true,
      reply: "Please select a clinic before booking an appointment.",
      actions: [
        {
          label: "Select clinic",
          route: "/clinic-selection",
        },
      ],
      bookingDraft: null,
    };
  }

  if (role !== "patient") {
    return {
      handled: true,
      reply:
        "Direct appointment booking from chat is currently available only for patients. You can still cancel or reschedule appointments from chat if you have permission.",
      actions: [],
      bookingDraft: null,
    };
  }

  if (cancels(message) || wantsToExitActiveFlow(message)) {
    await saveAuditLog(supabase, {
      user_id: user.id,
      clinic_id: clinicId,
      action: "booking_flow_stopped",
      metadata: {
        role,
        step: bookingDraft?.step || null,
        serviceId: bookingDraft?.serviceId || null,
        serviceTitle: bookingDraft?.serviceTitle || null,
        messagePreview: message.slice(0, 160),
      },
    });

    return {
      handled: true,
      reply: "No problem. I stopped the booking flow. What would you like to do next?",
      actions: buildNavigationActions({ message, role, clinicId, clinicName }),
      bookingDraft: null,
    };
  }

  let draft: BookingDraft = bookingDraft?.active ? { ...bookingDraft, mode: bookingDraft.mode || "create" } : { active: true, mode: "create", step: "service" };

  if (bookingDraft?.active && wantsContinueBooking(message)) {
    const continued = continueBookingReply(draft);
    await saveAuditLog(supabase, {
      user_id: user.id,
      clinic_id: clinicId,
      action: "booking_flow_continued",
      metadata: {
        role,
        step: draft.step || null,
        serviceId: draft.serviceId || null,
        serviceTitle: draft.serviceTitle || null,
        doctorId: draft.doctorId || null,
        locationId: draft.locationId || null,
        appointmentDate: draft.appointmentDate || null,
        hasStartTime: Boolean(draft.startTime),
        hasInsuranceMethod: Boolean(draft.insuranceMethod),
      },
    });
    return {
      handled: true,
      reply: continued.reply,
      actions: continued.actions,
      bookingDraft: continued.bookingDraft,
    };
  }

  const lower = normalize(message);
  const { service, services, recommendedServiceTitle, recommendationScore } = await findService(supabase, clinicId, message);
  const wantsFirstAvailable = lower.includes("first available") || lower.includes("as soon as possible") || lower.includes("soonest") || lower.includes("earliest") || lower.includes("any doctor") || lower.includes("anyone");

  if (!draft.serviceId) {
    if (!service) {
      return {
        handled: true,
        reply: services.length
          ? `Which service would you like to book? Available services include: ${services.map((s: any) => s.title).join(", ")}.`
          : "I could not find active services for this clinic.",
        actions: services.slice(0, 5).map((s: any) => ({
          label: s.title,
          message: `I want to book ${s.title}`,
        })),
        bookingDraft: draft,
      };
    }

    const latestTriage = await getLatestAttachableTriage(supabase, user.id, clinicId, service.title);

    draft = {
      ...draft,
      serviceId: service.id,
      serviceTitle: service.title,
      serviceDuration: service.duration_minutes || 30,
      step: "doctor",
      recommendedFromTriage: Boolean(latestTriage),
      triageId: latestTriage?.id || null,
      aiTriagePatientNote: latestTriage?.patient_note || null,
      aiTriageDoctorSummary: latestTriage?.doctor_summary || null,
      aiTriageLevel: latestTriage?.triage_level || null,
    };

    await saveAuditLog(supabase, {
      user_id: user.id,
      clinic_id: clinicId,
      action: "booking_service_selected_from_chat",
      metadata: {
        serviceId: service.id,
        serviceTitle: service.title,
        recommendedServiceTitle,
        recommendationScore,
        attachedTriageId: latestTriage?.id || null,
        messagePreview: message.slice(0, 160),
      },
    });
  }

  if (wantsFirstAvailable && draft.serviceId) {
    const firstSlot = await getFirstAvailableSlot({ supabase, clinicId, serviceId: draft.serviceId, durationMinutes: draft.serviceDuration || 30, doctorId: draft.doctorId, locationId: draft.locationId, });
    if (!firstSlot)
      return { handled: true, reply: "I could not find any available slot in the next 14 days.", actions: [], bookingDraft: draft };

    draft = {
      ...draft,
      doctorId: firstSlot.doctorId,
      doctorName: firstSlot.doctorName,
      locationId: firstSlot.locationId,
      locationName: firstSlot.locationName,
      appointmentDate: firstSlot.date,
      startTime: firstSlot.startTime,
      endTime: firstSlot.endTime,
      step: "insurance",
    };

    return {
      handled: true,
      reply: `I found the first available slot: ${draft.serviceTitle} with ${draft.doctorName} at ${draft.locationName}, on ${
        draft.appointmentDate
      }, from ${draft.startTime?.slice(0, 5)} to ${draft.endTime?.slice(0, 5)}. How would you like to handle insurance?`,
      actions: [
        { label: "Public insurance", message: "Public insurance" },
        { label: "Private insurance", message: "Private insurance" },
        { label: "Self pay", message: "Self pay" },
        { label: "Other", message: "Other" },
      ],
      bookingDraft: draft,
    };
  }

  const doctors = await findDoctorsForService(supabase, clinicId, draft.serviceId!);
  const doctorFromMessage = findDoctorFromMessage(doctors, message);

  if (!draft.doctorId && doctorFromMessage) {
    draft.doctorId = doctorFromMessage.id;
    draft.doctorName = `Dr. ${doctorFromMessage.first_name} ${doctorFromMessage.last_name}`;
    draft.step = "location";
  }

  if (!draft.doctorId && doctors.length === 1) {
    draft.doctorId = doctors[0].id;
    draft.doctorName = `Dr. ${doctors[0].first_name} ${doctors[0].last_name}`;
    draft.step = "location";
  }

  if (!draft.doctorId && doctors.length > 1) {
    return {
      handled: true,
      reply: `I found ${draft.serviceTitle}. Which doctor would you prefer, or should I search for the first available option?`,
      actions: [
        ...doctors.slice(0, 4).map((d: any) => ({
          label: `Dr. ${d.first_name} ${d.last_name}`,
          message: `I choose Dr. ${d.first_name} ${d.last_name}`,
        })),
        { label: "First available", message: "First available" },
      ],
      bookingDraft: draft,
    };
  }

  if (!draft.locationId) {
    const availableDoctorIds = draft.doctorId ? [draft.doctorId] : doctors.map((d: any) => d.id);
    const { data: doctorLocations } = await supabase
      .from("doctor_locations")
      .select("location_id")
      .in("doctor_id", availableDoctorIds);
    const locationIds = [...new Set((doctorLocations ?? []).map((item: any) => item.location_id))];
    const { data: locations } = await supabase
      .from("clinic_locations")
      .select("id, name, city")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .in("id", locationIds);
    const selectedLocation = locations?.find((l: any) => {
      const text = `${l.name} ${l.city}`.toLowerCase();
      return text.includes(lower) || lower.includes(String(l.name).toLowerCase());
    });

    if (!selectedLocation) {
      return {
        handled: true,
        reply: "Which location do you prefer?",
        actions: (locations ?? []).map((l: any) => ({
          label: `${l.name}${l.city ? `, ${l.city}` : ""}`,
          message: `I choose ${l.name}`,
        })),
        bookingDraft: { ...draft, step: "location" },
      };
    }

    draft.locationId = selectedLocation.id;
    draft.locationName = `${selectedLocation.name}${selectedLocation.city ? `, ${selectedLocation.city}` : ""}`;
    draft.step = "date";
  }

  const parsedDate = parseDateFromMessage(message);
  if (parsedDate && isPastDate(parsedDate)) {
    return {
      handled: true,
      reply: "That date is in the past. Please choose today or a future date.",
      actions: [
        { label: "Today", message: "Today" },
        { label: "Tomorrow", message: "Tomorrow" },
        { label: "Friday", message: "Friday" },
      ],
      bookingDraft: { ...draft, appointmentDate: undefined, step: "date" },
    };
  }
  if (parsedDate) {
    draft.appointmentDate = parsedDate;
    draft.step = "time";
  }

  if (!draft.appointmentDate) {
    return {
      handled: true,
      reply: "What date would you prefer? You can write today, tomorrow, Friday, or 2026-05-22.",
      actions: [
        { label: "Today", message: "Today" },
        { label: "Tomorrow", message: "Tomorrow" },
        { label: "Friday", message: "Friday" },
      ],
      bookingDraft: draft,
    };
  }

  const slots = await getAvailableSlots({ supabase, clinicId, serviceId: draft.serviceId!, durationMinutes: draft.serviceDuration || 30, date: draft.appointmentDate, doctorId: draft.doctorId, locationId: draft.locationId });
  if (slots.length === 0) {
    return {
      handled: true,
      reply: "I could not find available slots for that date. Please choose another date.",
      actions: [
        { label: "Tomorrow", message: "Tomorrow" },
        { label: "Friday", message: "Friday" },
      ],
      bookingDraft: { ...draft, appointmentDate: undefined, step: "date" },
    };
  }

  const parsedTime = parseTimeFromMessage(message);
  if (!draft.startTime && parsedTime) {
    const selectedSlot = slots.find((slot) => slot.startTime === parsedTime);
    if (!selectedSlot) {
      return {
        handled: true,
        reply: `That time is not available. Available options are: ${slots
          .map((slot) => `${slot.startTime.slice(0, 5)} with ${slot.doctorName}`)
          .join(", ")}.`,
        actions: slots.map((slot) => ({
          label: `${slot.startTime.slice(0, 5)} · ${slot.doctorName}`,
          message: slot.startTime.slice(0, 5),
        })),
        bookingDraft: draft,
      };
    }

    draft = {
      ...draft,
      doctorId: selectedSlot.doctorId,
      doctorName: selectedSlot.doctorName,
      locationId: selectedSlot.locationId,
      locationName: selectedSlot.locationName,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      step: "insurance",
    };

    return {
      handled: true,
      reply: "How would you like to handle insurance for this appointment?",
      actions: [
        { label: "Public insurance", message: "Public insurance" },
        { label: "Private insurance", message: "Private insurance" },
        { label: "Self pay", message: "Self pay" },
        { label: "Other", message: "Other" },
      ],
      bookingDraft: draft,
    };
  }

  if (!draft.startTime) {
    return {
      handled: true,
      reply: `I found these available slots for ${draft.serviceTitle} on ${draft.appointmentDate}:`,
      actions: slots.map((slot) => ({
        label: `${slot.startTime.slice(0, 5)} · ${slot.doctorName}`,
        message: slot.startTime.slice(0, 5),
      })),
      bookingDraft: draft,
    };
  }

  if (draft.step === "insurance") {
    draft.insuranceMethod = parseInsuranceMethod(message);
    if (draft.insuranceMethod === "other") {
      draft.insuranceDetails = null;
      draft.step = "insurance_details";
      return {
        handled: true,
        reply: "Please write the insurance or payment details.",
        actions: [],
        bookingDraft: draft,
      };
    }

    draft.insuranceDetails = draft.insuranceMethod === "public_insurance" ? null : message;
    draft.step = "notes";

    return {
      handled: true,
      reply: "Please add a short reason for the visit or any notes for the doctor. You can also type No notes.",
      actions: [{ label: "No notes", message: "No notes" }],
      bookingDraft: draft,
    };
  }

  if (draft.step === "insurance_details") {
    draft.insuranceDetails = message;
    draft.step = "notes";
    return {
      handled: true,
      reply: "Please add a short reason for the visit or any notes for the doctor. You can also type No notes.",
      actions: [{ label: "No notes", message: "No notes" }],
      bookingDraft: draft,
    };
  }

  if (draft.step === "notes") {
    const lowerNotes = normalize(message);
    draft.reason = lowerNotes === "no notes" || lowerNotes === "none" ? "Booked from MedSync Assistant" : message;
    draft.notes = lowerNotes === "no notes" || lowerNotes === "none" ? null : message;
    draft.step = "onboarding_offer";

  return {
    handled: true,
    reply: "Would you like to add onboarding details for the doctor before booking?",
    actions: [
      { label: "Yes, add onboarding", message: "Yes onboarding" },
      { label: "No, skip", message: "No onboarding" },
    ],
    bookingDraft: draft,
  };
    }

  if (draft.step === "onboarding_offer") {
    const lower = normalizeLoose(message);

    if (lower.includes("yes") || lower.includes("onboarding")) {
      draft.onboardingAccepted = true;
      draft.step = "onboarding_main";

      return {
        handled: true,
        reply: "What is the main reason for your visit?",
        actions: [],
        bookingDraft: draft,
      };
    }

    draft.onboardingAccepted = false;
    draft.step = "confirm";

    return {
      handled: true,
      reply: formatBookingConfirmation(draft),
      actions: [
        { label: "Confirm booking", message: "Confirm" },
        { label: "Cancel booking", message: "Cancel booking" },
      ],
      bookingDraft: draft,
    };
  }

  if (draft.step === "onboarding_main") {
    draft.onboardingMainConcern = message;
    draft.step = "onboarding_symptoms";

    return {
      handled: true,
      reply: "What symptoms are you currently experiencing?",
      actions: [{ label: "No symptoms", message: "No symptoms" }],
      bookingDraft: draft,
    };
  }

  if (draft.step === "onboarding_symptoms") {
    draft.onboardingSymptoms = message;
    draft.step = "onboarding_medications";

    return {
      handled: true,
      reply: "Are you currently taking any medications?",
      actions: [{ label: "No medications", message: "No medications" }],
      bookingDraft: draft,
    };
  }

  if (draft.step === "onboarding_medications") {
    draft.onboardingMedications = message;
    draft.step = "onboarding_chronic";

    return {
      handled: true,
      reply: "Do you have chronic conditions, allergies or relevant medical history?",
      actions: [{ label: "None", message: "None" }],
      bookingDraft: draft,
    };
  }

  if (draft.step === "onboarding_chronic") {
    draft.onboardingChronicConditions = message;

    draft.aiTriagePatientNote = [
      draft.onboardingMainConcern ? `Main concern: ${draft.onboardingMainConcern}` : "",
      draft.onboardingSymptoms ? `Symptoms: ${draft.onboardingSymptoms}` : "",
      draft.onboardingMedications ? `Medications: ${draft.onboardingMedications}` : "",
      draft.onboardingChronicConditions ? `Chronic conditions: ${draft.onboardingChronicConditions}` : "",
    ].filter(Boolean).join("\n");

    draft.step = "confirm";

    return {
      handled: true,
      reply: formatBookingConfirmation(draft),
      actions: [
        { label: "Confirm booking", message: "Confirm" },
        { label: "Cancel booking", message: "Cancel booking" },
      ],
      bookingDraft: draft,
    };
  }

  if (draft.step === "confirm" && !confirms(message)) {
    return {
      handled: true,
      reply: formatBookingConfirmation(draft),
      actions: [
        { label: "Confirm booking", message: "Confirm" },
        { label: "Cancel", message: "Cancel booking" },
      ],
      bookingDraft: draft,
    };
  }

  const profile = await getProfile(supabase, user.id);
  const firstName = profile?.first_name || user.user_metadata?.first_name || "Patient";
  const lastName = profile?.last_name || user.user_metadata?.last_name || "";

  const { data: rpcData, error: rpcError } = await supabase.rpc("create_appointment_safely", {
    p_clinic_id: clinicId,
    p_location_id: draft.locationId,
    p_doctor_id: draft.doctorId,
    p_service_id: draft.serviceId,
    p_patient_id: user.id,
    p_appointment_date: draft.appointmentDate,
    p_start_time: draft.startTime,
    p_end_time: draft.endTime,
    p_patient_first_name: firstName,
    p_patient_last_name: lastName,
    p_insurance_method: draft.insuranceMethod || "public_insurance",
    p_insurance_details: draft.insuranceDetails || null,
    p_reason: draft.reason || "Booked from MedSync Assistant",
    p_notes: draft.notes || null,
    p_ai_triage_patient_note: draft.aiTriagePatientNote || null,
    p_ai_triage_summary: draft.aiTriageDoctorSummary || null,
    p_ai_triage_level: draft.aiTriageLevel || null,
    p_triage_session_id: draft.triageId || null,
    p_created_by: user.id,
  });

  if (rpcError) 
    return { handled: true, reply: `I could not create the appointment: ${rpcError.message}`, actions: [], bookingDraft: draft };

  if (draft.triageId) {
    try {
      await supabase
        .from("ai_triage_sessions")
        .update({ completed: true })
        .eq("id", draft.triageId);
    } catch (_) {}
  }

  await saveAuditLog(supabase, {
    user_id: user.id,
    clinic_id: clinicId,
    action: "appointment_created_from_chat",
    metadata: {
      appointmentId: rpcData,
      triageId: draft.triageId || null,
      serviceId: draft.serviceId,
      serviceTitle: draft.serviceTitle,
      doctorId: draft.doctorId,
      doctorName: draft.doctorName,
      locationId: draft.locationId,
      locationName: draft.locationName,
      appointmentDate: draft.appointmentDate,
      startTime: draft.startTime,
      endTime: draft.endTime,
      insuranceMethod: draft.insuranceMethod || "public_insurance",
      hasNotes: Boolean(draft.notes),
      aiTriageLevel: draft.aiTriageLevel || null,
    },
  });

  return {
    handled: true,
    reply: `Your appointment has been created successfully. ${draft.serviceTitle} with ${draft.doctorName} at ${draft.locationName}, on ${
      draft.appointmentDate
    }, from ${draft.startTime?.slice(0, 5)} to ${draft.endTime?.slice(0, 5)}.`,
    actions: [
      {
        label: "View my appointments",
        route: "/my-appointments",
        params: { clinicId, clinicName: clinicName || "" },
      },
    ],
    bookingDraft: null,
  };

}

async function buildClinicContext(
  supabase: any,
  clinicId?: string,
  clinicName?: string,
  options?: { includeAvailability?: boolean }
) {

  if (!clinicId)
    return { text: "", resolvedClinicName: clinicName || "No clinic selected", };

  const includeAvailability = Boolean(options?.includeAvailability);
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, description, slug")
    .eq("id", clinicId)
    .maybeSingle();
  const resolvedClinicName = clinic?.name || clinicName || "this clinic";
  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, first_name, last_name, specialty, bio")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .limit(10);
  const { data: services } = await supabase
    .from("clinic_services")
    .select("id, title, category, description, duration_minutes")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .limit(10);

  let availability: any[] = [];

  if (includeAvailability) {
    const doctorIdsForAvailability = (doctors ?? []).map((d: any) => d.id);
    if (doctorIdsForAvailability.length > 0) {
      const { data } = await supabase
        .from("doctor_availability")
        .select(`doctor_id, location_id, weekday, start_time, end_time, slot_minutes, is_active, doctors (first_name, last_name), clinic_locations (name, city)`)
        .eq("is_active", true)
        .in("doctor_id", doctorIdsForAvailability)
        .limit(50);
      availability = data ?? [];
    }
  }

  let technologies: any[] = [];
  let tips: any[] = [];

  try {
    const { data } = await supabase
      .from("clinic_technologies")
      .select("id, title, description")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .limit(10);

    technologies = data ?? [];
  } catch (_) {
    technologies = [];
  }

  try {
    const { data } = await supabase
      .from("health_tips")
      .select("id, title, body, description")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .limit(10);

    tips = data ?? [];
  } catch (_) {
    tips = [];
  }

  const availabilityText = includeAvailability
    ? `\n\nDoctor availability:\n${
        availability.length
          ? availability
              .map((a: any) => {
                const doctor = Array.isArray(a.doctors) ? a.doctors[0] : a.doctors;
                const location = Array.isArray(a.clinic_locations) ? a.clinic_locations[0] : a.clinic_locations;

                return `- Dr. ${doctor?.first_name || ""} ${doctor?.last_name || ""}: ${a.weekday}, ${String(a.start_time).slice(0, 5)}-${String(a.end_time).slice(0, 5)}${location?.name ? ` at ${location.name}${location.city ? `, ${location.city}` : ""}` : ""}`;
              })
              .join("\n")
          : "- No doctor availability data available"
      }`
    : "";

  const text = `CURRENT CLINIC DATA:
    Clinic: ${resolvedClinicName}
    Description: ${clinic?.description || "No description available"}
    Doctors: ${doctors?.length ? doctors.map((d: any) => `- Dr. ${d.first_name} ${d.last_name}${d.specialty ? `, ${d.specialty}` : ""}`).join("\n") : "- No doctor data available"}${availabilityText}
    Services: ${services?.length ? services.map((s: any) => `- ${s.title}${s.duration_minutes ? `, ${s.duration_minutes} minutes` : ""}${s.description ? `: ${s.description}` : ""}`).join("\n") : "- No service data available"}
    Technologies: ${technologies.length ? technologies.map((t: any) => `- ${t.title}${t.description ? `: ${t.description}` : ""}`).join("\n") : "- No technology data available"}
    Health tips: ${tips.length ? tips.map((t: any) => `- ${t.title}`).join("\n") : "- No health tips available"}`;

  return { text, resolvedClinicName };

}

function buildNavigationActions({
  message,
  role,
  clinicId,
  clinicName,
}: {
  message: string;
  role: Role;
  clinicId?: string;
  clinicName?: string;
}) {

  const lower = normalize(message);
  const actions: ChatAction[] = [];
  const params = clinicId ? { clinicId, clinicName: clinicName || "" } : undefined;
  const add = (
    label: string,
    route?: string,
    messageAction?: string
  ) => {
    actions.push({
      label,
      route,
      message: messageAction,
      params: route && params ? params : undefined,
    });
  };

  if (role === "guest") {
    add("Log in", "/login");
    add("Create account", "/signup");
    return actions;
  }

  if (!clinicId) {
    add("Select clinic", "/clinic-selection");
    return actions;
  }

  if (role === "patient") {

    if (lower.includes("doctor") || lower.includes("clinic"))
      add("Go to doctors", "/clinic-doctors");

    if (lower.includes("service") || lower.includes("book"))
      add("Open services", "/clinic-services");

    if (lower.includes("technolog"))
      add("Open technologies", "/clinic-technologies");

    if (lower.includes("health") || lower.includes("tip"))
      add("Open health tips", "/health-tips");

    if (lower.includes("message") || lower.includes("chat"))
      add("Open messages", "/messages");

    if (lower.includes("appointment"))
      add("Open my appointments", "/my-appointments");

    add("Change clinic", "/clinic-selection");
  }

  if (role === "doctor") {
    if (lower.includes("appointment"))
      add("Manage appointments", "/manage-appointments");

    if (lower.includes("patient"))
      add("My patients", "/my-patients");

    if (lower.includes("history") || lower.includes("summary") || lower.includes("chart"))
      add("Patient history", "/my-patients-history");

    if (lower.includes("message") || lower.includes("chat"))
      add("Open messages", "/messages");

    add("Doctor dashboard", "/main-doctor");
    add("Change clinic", "/clinic-selection");
  }

  if (role === "clinic_admin") {
    if (lower.includes("appointment") || lower.includes("check"))
      add("Manage appointments", "/manage-appointments");

    if (lower.includes("user") || lower.includes("doctor") || lower.includes("patient"))
      add("Manage users", "/manage-users");

    if (lower.includes("content") || lower.includes("service") || lower.includes("technology") || lower.includes("tip"))
      add("Manage clinic content", "/manage-clinic-content");

    if (lower.includes("setting") || lower.includes("logo") || lower.includes("branding"))
      add("Clinic settings", "/clinic-settings");

    add("Clinic admin dashboard", "/main-clinic-admin");
    add("Change clinic", "/clinic-selection");
  }

  if (role === "platform_admin") {
    if (lower.includes("appointment") || lower.includes("check"))
      add("Manage appointments", "/manage-appointments");

    if (lower.includes("user"))
      add("Manage users", "/manage-users");

    if (lower.includes("clinic"))
      add("Manage clinics", "/manage-clinics");

    if (lower.includes("analytics") || lower.includes("stats") || lower.includes("overview") || lower.includes("platform health"))
      add("View analytics", "/analytics");

    add("Platform dashboard", "/main-platform-admin");
  }

  return actions.slice(0, 7);
}

function buildSystemPrompt({
  role,
  resolvedClinicName,
  clinicContext,
  triage,
  includeAvailability,
}: {
  role: Role;
  resolvedClinicName: string;
  clinicContext: string;
  triage: any;
  includeAvailability?: boolean;
}) {

  return `You are the MedSync Assistant inside the MedSync healthcare app. Always answer in English. Use plain text only. Do not use markdown tables. Be concise but helpful.

  Core behavior:
  - Help with information first.
  - Allow general AI conversation.
  - Be role-based: guest, patient, doctor, clinic admin, platform admin.
  - Be clinic-aware: current clinic is ${resolvedClinicName}.
  - Use the latest conversation messages provided by the client.
  - Respect active bookingDraft and triageDraft. If a flow is active, continue it unless the server explicitly pauses or stops it.
  - Mention doctor availability only when the user explicitly asks about schedule, availability, hours, or working program. Current request asks availability: ${Boolean(includeAvailability)}.

  Medical safety:
  - Do not provide a certain diagnosis.
  - Use the phrase "possible causes may include" when discussing possible diseases or causes.
  - Do not prescribe medication.
  - If symptoms may be an emergency, recommend emergency services or the nearest emergency department.
  - Emergency triage does not start booking.

  Adaptive triage behavior:
  - For chest pain, ask about breathing, spreading pain, sweating, nausea, dizziness or fainting.
  - For rash, ask about allergies, new medicine/food/products, spreading, fever, swelling and breathing.
  - For headache, ask about sudden onset, vision changes, confusion, weakness, numbness, speech issues, fever, stiff neck and vomiting.
  - Separate patient-facing triage note from doctor-facing clinical summary.

  Role-specific guidance:

  - Guest:
    - Can ask general questions.
    - Must log in before booking, triage continuation, appointments, or clinic-specific workflows.

  - Patient:
    - Can browse doctors, services, technologies, health tips.
    - Can start booking appointments.
    - Can cancel or reschedule appointments.
    - Can message doctors.
    - Can manage profile and clinic selection.

  - Doctor:
    - Can manage appointments.
    - Can use messages.
    - Does not use patient booking/services browsing flows.
    - Should receive clinician-oriented guidance.

  - Clinic admin:
    - Can manage clinic operations and appointments.
    - Should receive admin-oriented guidance instead of patient flows.

  - Platform admin:
    - Should receive platform-level administrative guidance only.
    
  Role rules:
  - Patient: can book from chat, cancel/reschedule from chat, view clinic pages, message doctors.
  - Doctor: can cancel/reschedule appointments from chat, view appointment and message guidance.
  - Clinic admin/platform admin: can cancel/reschedule appointments from chat if permitted and get admin workflow guidance.
  - Guest: can ask for information but must log in before booking or managing appointments.

  Current triage classification:
  - Is triage related: ${triage.isTriage}
  - Triage level: ${triage.level}

  ${clinicContext}`;

}

async function generateGeminiReply({

  message,
  history,
  supabase,
  clinicId,
  clinicName,
  role,
  geminiKey,
}: {
  message: string;
  history: any[];
  supabase: any;
  clinicId?: string;
  clinicName?: string;
  role: Role;
  geminiKey: string;
}) {

  const includeAvailability = wantsAvailabilityInfo(message);
  const { text: clinicContext, resolvedClinicName } = await buildClinicContext(supabase, clinicId, clinicName, { includeAvailability, });
  const triage = getTriageLevel(message);
  const systemPrompt = buildSystemPrompt({ role, resolvedClinicName, clinicContext, triage, includeAvailability, });
  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    ...history.slice(-8).map((item: any) => ({
      role: item.role === "bot" ? "model" : "user",
      parts: [{ text: String(item.text || "") }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const geminiUrl = new URL("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent");
  geminiUrl.searchParams.set("key", geminiKey);
  const geminiRes = await fetch(geminiUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });
  const geminiData = await geminiRes.json();
  if (!geminiRes.ok)
    throw new Error(geminiData?.error?.message || "Gemini request failed");

  const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "I could not generate a response right now.";

  return { reply, triage, resolvedClinicName, includeAvailability, };

}

Deno.serve(async (req) => {

  if (req.method === "OPTIONS")
    return new Response("ok", { status: 200, headers: corsHeaders });

  let message = "";
  let clinicId: string | undefined;
  let clinicName: string | undefined;
  let role: Role = "guest";

  try {
    const body = await req.json();
    message = String(body.message || "");
    clinicId = body.clinicId ? String(body.clinicId) : undefined;
    clinicName = body.clinicName ? String(body.clinicName) : undefined;
    const history = Array.isArray(body.history) ? body.history : [];
    const bookingDraft = body.bookingDraft ?? null;
    const triageDraft = body.triageDraft ?? null;
    const incomingRole = String(body.userRole || "guest");

    if (!message.trim())
      return json({ error: "Missing message" }, 400);

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");

    if (!geminiKey) 
      return json({ error: "Missing GEMINI_API_KEY" }, 500);
    if (!supabaseUrl || !serviceRoleKey)
      return json({ error: "Missing Supabase server credentials" }, 500);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const user = await getCurrentUser(supabase, req);
    const profile = user ? await getProfile(supabase, user.id) : null;

    role = isRole(profile?.role) ? profile.role : isRole(incomingRole) ? incomingRole : "guest";

    if (requiresClinicContext(role) && !clinicId && (wantsBooking(message) || wantsTriage(message) || wantsAvailabilityInfo(message))) {
      return json({
        reply: "Please select a clinic first before using clinic-specific assistant features.",
        actions: [
          {
            label: "Select clinic",
            route: "/clinic-selection",
          },
        ],
        bookingDraft: null,
        triageDraft: null,
        triage: {
          isTriage: false,
          level: "unknown",
        },
      });
    } 

    const ctx: AppContext = {

      supabase,
      message,
      clinicId,
      clinicName,
      role,
      user,

    };

    await saveAuditLog(supabase, {
      user_id: user?.id ?? null,
      clinic_id: clinicId ?? null,
      action: "chat_message_received",
      metadata: {
        role,
        incomingRole,
        profileRole: profile?.role || null,
        hasUser: Boolean(user?.id),
        messageLength: message.length,
        messagePreview: message.slice(0, 160),
        hasClinicId: Boolean(clinicId),
        clinicName: clinicName || null,
        hasBookingDraft: Boolean(bookingDraft?.active),
        bookingDraftMode: bookingDraft?.mode || null,
        bookingDraftStep: bookingDraft?.step || null,
        bookingDraftServiceId: bookingDraft?.serviceId || null,
        bookingDraftServiceTitle: bookingDraft?.serviceTitle || null,
        hasTriageDraft: Boolean(triageDraft?.active),
        triageDraftStep: triageDraft?.step || null,
        wantsAvailabilityInfo: wantsAvailabilityInfo(message),
        wantsBooking: wantsBooking(message),
        wantsTriage: wantsTriage(message),
      },
    });

    if (bookingDraft?.active && bookingDraft.mode === "create" && isLikelyNonBookingQuestion(message, bookingDraft)) {
      const general = await generateGeminiReply({ message, history, supabase, clinicId, clinicName, role, geminiKey, });
      await saveAuditLog(supabase, {
        user_id: user?.id ?? null,
        clinic_id: clinicId ?? null,
        action: "booking_flow_paused_for_general_question",
        metadata: {
          role,
          bookingDraftStep: bookingDraft.step || null,
          bookingDraftServiceId: bookingDraft.serviceId || null,
          bookingDraftServiceTitle: bookingDraft.serviceTitle || null,
          messagePreview: message.slice(0, 160),
          includeAvailability: general.includeAvailability,
        },
      });
      return json({
        reply: `${general.reply}\n\nI have kept your booking draft open. You can continue it whenever you are ready.`,
        actions: [
          { label: "Continue booking", message: "Continue booking" },
          { label: "Cancel booking", message: "Cancel booking" },
        ],
        bookingDraft,
        triageDraft: null,
        triage: general.triage,
      });
    }

    if (bookingDraft?.active && (bookingDraft.mode === "cancel" || bookingDraft.mode === "reschedule" || bookingDraft.step === "select_appointment" || bookingDraft.step === "confirm_cancel")) {
      const result = await handleAppointmentManagement(ctx, bookingDraft);
      return json({
        reply: result.reply,
        actions: result.actions,
        bookingDraft: result.bookingDraft,
        triageDraft: null,
        triage: { isTriage: false, level: "unknown" },
      });
    }

if (
  wantsStartCancellationFromChat(message) ||
  wantsStartRescheduleFromChat(message) ||
  wantsStartCheckInFromChat(message) ||
  (
    !asksHowToManageAppointments(message) &&
    !asksHowToCheckIn(message) &&
    (
      wantsCancelAppointment(message) ||
      wantsRescheduleAppointment(message) ||
      wantsCheckInAppointment(message)
    )
  ) ||
  (bookingDraft?.active && bookingDraft.mode !== "create")
) {
  let nextBookingDraft = bookingDraft;

if (wantsStartCancellationFromChat(message)) {
  nextBookingDraft = {
    active: true,
    mode: "cancel",
    step: "select_appointment",
  };
}

if (wantsStartRescheduleFromChat(message)) {
  nextBookingDraft = {
    active: true,
    mode: "reschedule",
    step: "select_appointment",
  };
}

if (wantsStartCheckInFromChat(message)) {
  nextBookingDraft = {
    active: true,
    mode: "check_in",
    step: "select_appointment",
  };
}
  const appointmentResult = await handleAppointmentManagement(ctx, nextBookingDraft);
    return json({
      reply: appointmentResult.reply,
      actions: appointmentResult.actions || [],
      bookingDraft: appointmentResult.bookingDraft || null,
      triageDraft: triageDraft || null,
      triage: getTriageLevel(message),
    });
  }

    if (bookingDraft?.active || wantsBooking(message)) {
      const result = await handleBookingFlow(ctx, bookingDraft);
      return json({
        reply: result.reply,
        actions: result.actions,
        bookingDraft: result.bookingDraft,
        triageDraft: null,
        triage: { isTriage: false, level: "unknown" },
      });
    }

    if (!user && (triageDraft?.active || wantsTriage(message))) {
      return json({
        reply: "Please log in before using triage help.",
        actions: [
          { label: "Log in", route: "/login" },
          { label: "Create account", route: "/signup" },
        ],
        bookingDraft: null,
        triageDraft: null,
        triage: { isTriage: false, level: "unknown" },
      });
    }    

    if (triageDraft?.active || wantsTriage(message)) {
      const result = await handleTriageFlow(ctx, triageDraft);
      if (result.handled) {
        return json({
          reply: result.reply,
          actions: result.actions,
          bookingDraft: result.bookingDraft || null,
          triageDraft: result.triageDraft,
          triage: getTriageLevel(message),
        });
      }
    }

    const roleHelp = handleRoleWorkflowHelp(ctx);
    if (roleHelp.handled) {
      return json({
        reply: roleHelp.reply,
        actions: roleHelp.actions || [],
        bookingDraft: bookingDraft || null,
        triageDraft: triageDraft || null,
        triage: getTriageLevel(message),
      });
    }

    const general = await generateGeminiReply({ message, history, supabase, clinicId, clinicName, role, geminiKey, });
    const actions = buildNavigationActions({ message, role, clinicId, clinicName: general.resolvedClinicName, });

    await saveAuditLog(supabase, {
      user_id: user?.id ?? null,
      clinic_id: clinicId ?? null,
      action: "chat_response_generated",
      metadata: {
        role,
        actionsCount: actions.length,
        includeAvailability: general.includeAvailability,
        triage: general.triage,
        messagePreview: message.slice(0, 160),
      },
    });

    return json({
      reply: general.reply,
      actions,
      bookingDraft: null,
      triageDraft: null,
      triage: general.triage,
    });

  } catch (error) {
        console.error("medsync-chatbot error:", error);
        if (error instanceof Error && error.message.toLowerCase().includes("quota")) {
          return json({
            reply: "The assistant is temporarily busy because the AI request limit was reached. Please try again shortly.",
            actions: buildNavigationActions({ message, role, clinicId, clinicName }),
            bookingDraft: null,
            triageDraft: null,
            triage: { isTriage: false, level: "unknown" },
          });
        }
        return json(
          {
            error: error instanceof Error ? error.message : "Unknown server error",
            details: String(error),
          },
          500
        );
      }

});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/medsync-chatbot' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/