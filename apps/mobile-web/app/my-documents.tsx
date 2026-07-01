import React, { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
import { getCurrentUserProfile } from "../src/lib/auth";
import { useClinicTheme } from "../src/lib/clinicTheme";
import ClinicNavbar from "../src/common/ClinicNavbar";
import AnimatedStatsCard from "../src/common/AnimatedStatsCard";
import DropdownMenu from "../src/common/DropdownMenu";
import HoverCard from '../src/common/HoverCard';

type Tab = "all" | "images" | "pdfs" | "docs" | "other" | "records";

type SortBy =
  | "default"
  | "newest"
  | "oldest"
  | "title_asc"
  | "title_desc"
  | "type_asc"
  | "type_desc";

type PatientFile = {

  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  medical_record_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  category: string | null;
  notes: string | null;
  created_at: string | null;
  ai_summary?: string | null;
  ai_image_summary?: string | null;
  ai_image_findings?: string[] | null;
  ai_image_flags?: string[] | null;

  doctors?: {
    first_name: string;
    last_name: string;
    specialty: string | null;
  } | null;

};

type MedicalRecord = {

  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  title: string | null;
  category: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  prescription: string | null;
  recommendations: string | null;
  notes: string | null;
  blood_pressure: string | null;
  heart_rate: number | null;
  temperature: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  follow_up_date: string | null;
  created_at: string | null;

  doctors?: {
    first_name: string;
    last_name: string;
    specialty: string | null;
  } | null;

};

function formatDate(value?: string | null) {

  if (!value) 
    return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) 
    return value;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

}

function formatDateTime(value?: string | null) {

  if (!value) 
    return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) 
    return value;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

}

function getDoctorName(doctor?: PatientFile["doctors"] | MedicalRecord["doctors"]) {

  if (!doctor) 
    return "Doctor not assigned";
  return `Dr. ${doctor.first_name || ""} ${doctor.last_name || ""}`.trim();

}

function getSearchTextFromFile(file: PatientFile) {

  return [
    file.title,
    file.description,
    file.notes,
    file.category,
    file.file_type,
    file.doctors?.first_name,
    file.doctors?.last_name,
    file.doctors?.specialty, ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

}

function getSearchTextFromRecord(record: MedicalRecord) {

  return [
    record.title,
    record.category,
    record.symptoms,
    record.diagnosis,
    record.treatment_plan,
    record.prescription,
    record.recommendations,
    record.notes,
    record.blood_pressure,
    record.follow_up_date,
    record.doctors?.first_name,
    record.doctors?.last_name,
    record.doctors?.specialty, ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

}

function isImageFile(file: PatientFile) {

  const value = `${file.file_type || ""} ${file.title || ""} ${file.file_url || ""}`.toLowerCase();
  return value.includes("image/") || value.includes(".png") || value.includes(".jpg") || value.includes(".jpeg") || value.includes(".webp");

}

function isPdfFile(file: PatientFile) {

  const value = `${file.file_type || ""} ${file.title || ""} ${file.file_url || ""}`.toLowerCase();
  return value.includes("pdf") || value.includes(".pdf");

}

function isDocFile(file: PatientFile) {

  const value = `${file.file_type || ""} ${file.title || ""} ${file.file_url || ""}`.toLowerCase();
  return value.includes("word") || value.includes("document") || value.includes(".doc") || value.includes(".docx") || value.includes("text/") || value.includes(".txt");

}

function getDocumentGroup(file: PatientFile): "images" | "pdfs" | "docs" | "other" {

  if (isImageFile(file)) 
    return "images";
  if (isPdfFile(file)) 
    return "pdfs";
  if (isDocFile(file)) 
    return "docs";
  return "other";

}

function getFileIcon(file: PatientFile): keyof typeof Ionicons.glyphMap {

  const group = getDocumentGroup(file);
  if (group === "images") 
    return "image-outline";
  if (group === "pdfs") 
    return "document-text-outline";
  if (group === "docs") 
    return "document-outline";

  const value = `${file.file_type || ""} ${file.title || ""} ${file.file_url || ""}`.toLowerCase();
  if (value.includes("spreadsheet") || value.includes(".xls"))
    return "grid-outline";

  return "document-attach-outline";

}

function getFileTypeLabel(file: PatientFile) {

  const group = getDocumentGroup(file);
  if (group === "images") 
    return "Image";
  if (group === "pdfs") 
    return "PDF";
  if (group === "docs") 
    return "Document";

  return file.category || file.file_type || "Other";

}

function getRecordSummary(record: MedicalRecord) {
  return record.diagnosis || record.symptoms || record.treatment_plan || record.recommendations || record.notes || "Medical record details available.";
}

function getFileSortTitle(file: PatientFile) {
  return (file.title || "Untitled document").toLowerCase();
}

function getRecordSortTitle(record: MedicalRecord) {
  return (record.title || record.category || "Medical record").toLowerCase();
}

export default function MyDocumentsScreen() {

  const { clinicId, clinicName, patientId } = useLocalSearchParams<{ clinicId?: string; clinicName?: string; patientId?: string; }>();

  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [sortBy, setSortBy] = useState<SortBy>("default");
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<PatientFile | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!clinicId) {
        router.replace("/clinic-selection");
        return;
      }

      setLoading(true);
      setError("");

      const { user, profile } = await getCurrentUserProfile();

      if (!user) {
        router.replace("/login");
        return;
      }

      const role = profile?.role || "patient";
      const targetPatientId = patientId || user.id;

      if (role === "patient" && targetPatientId !== user.id) {
        setError("You can only view your own documents.");
        setLoading(false);
        return;
      }

      let filesQuery = supabase
        .from("patient_files")
        .select(`*, doctors ( first_name, last_name, specialty )`)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      let recordsQuery = supabase
        .from("patient_medical_records")
        .select(`*, doctors ( first_name, last_name, specialty )`)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (role === "patient" || patientId) {
        filesQuery = filesQuery.eq("patient_id", targetPatientId);
        recordsQuery = recordsQuery.eq("patient_id", targetPatientId);
      }

      if (role === "doctor") {
        const doctorFilter = profile?.email ? `profile_id.eq.${user.id},email.eq.${profile.email}` : `profile_id.eq.${user.id}`;

        const { data: doctorData } = await supabase
          .from("doctors")
          .select("id")
          .eq("clinic_id", clinicId)
          .or(doctorFilter)
          .maybeSingle();

        if (!doctorData?.id) {
          setError("No doctor profile is connected to this account.");
          setLoading(false);
          return;
        }

        if (!patientId) {
          filesQuery = filesQuery.eq("doctor_id", doctorData.id);
          recordsQuery = recordsQuery.eq("doctor_id", doctorData.id);
        }
      }

      const [
        { data: fileRows, error: filesError },
        { data: recordRows, error: recordsError },
      ] = await Promise.all([filesQuery, recordsQuery]);

      if (filesError || recordsError) {
        setError(
          filesError?.message ||
            recordsError?.message ||
            "Could not load documents."
        );
        setFiles([]);
        setRecords([]);
        setLoading(false);
        return;
      }

      setFiles((fileRows ?? []) as PatientFile[]);
      setRecords((recordRows ?? []) as MedicalRecord[]);
      setLoading(false);
    };

    loadDocuments();
  }, [clinicId, patientId]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    let items = files.filter((file) => {
      if (tab === "records") 
        return false;
      if (tab !== "all" && getDocumentGroup(file) !== tab) 
        return false;
      if (!query) 
        return true;

      return getSearchTextFromFile(file).includes(query);
    });

    items = [...items].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      switch (sortBy) {
        case "oldest":
          return dateA - dateB;
        case "title_asc":
          return getFileSortTitle(a).localeCompare(getFileSortTitle(b));
        case "title_desc":
          return getFileSortTitle(b).localeCompare(getFileSortTitle(a));
        case "type_asc":
          return getFileTypeLabel(a).localeCompare(getFileTypeLabel(b));
        case "type_desc":
          return getFileTypeLabel(b).localeCompare(getFileTypeLabel(a));
        case "default":
          case "newest":
        default:
          return dateB - dateA;
      }
    });

    return items;
  }, [files, search, sortBy, tab]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    let items = records.filter((record) => {
      if (!["all", "records"].includes(tab)) 
        return false;
      if (!query) 
        return true;

      return getSearchTextFromRecord(record).includes(query);
    });

    items = [...items].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      switch (sortBy) {
        case "oldest":
          return dateA - dateB;
        case "title_asc":
          return getRecordSortTitle(a).localeCompare(getRecordSortTitle(b));
        case "title_desc":
          return getRecordSortTitle(b).localeCompare(getRecordSortTitle(a));
        case "type_asc":
          return (a.category || "Medical Record").localeCompare(b.category || "Medical Record");
        case "type_desc":
          return (b.category || "Medical Record").localeCompare(a.category || "Medical Record");
        case "default":  
        case "newest":
        default:
          return dateB - dateA;
      }
    });

    return items;
  }, [records, search, sortBy, tab]);

  const selectedRecordFiles = useMemo(() => {
    if (!selectedRecord) return [];

    return files.filter(
      (file) =>
        file.medical_record_id === selectedRecord.id ||
        (!!selectedRecord.appointment_id &&
          file.appointment_id === selectedRecord.appointment_id)
    );
  }, [files, selectedRecord]);

  const totalCount = files.length + records.length;

  const aiInsightsCount = files.filter(
    (file) =>
      !!file.ai_summary ||
      !!file.ai_image_summary ||
      !!file.ai_image_findings?.length ||
      !!file.ai_image_flags?.length
  ).length;

  const filteredCount = filteredFiles.length + filteredRecords.length;

  const openFile = async (url: string) => {
    if (!url) 
      return;

    if (Platform.OS === "web") {
      window.open(url, "_blank");
      return;
    }

    await Linking.openURL(url);
  };

  const backRoute = () => {
    router.replace({
      pathname: "/main-patient" as any,
      params: { clinicId, clinicName },
    });
  };

  return (

    <>

      <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

        <ClinicNavbar
          clinicName={clinicName}
          clinicId={clinicId}
          primaryColor={theme.primary}
          roleLabel=""
          showRolePill={false}
          showBackButton
          onBackPress={backRoute}
          canChangeClinic={false}
        />

        <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>My Documents</Text>
          <Text style={[styles.title, { color: theme.secondary }]}>Oversee your Medical Files</Text>
          <Text style={styles.subtitle}>Review all of your uploaded files such as appointment documents, radiology images and medical records from your clinic.</Text>
        </View>

        <View style={styles.summaryGrid}>
          {[
            {
              label: "Uploaded Documents",
              value: files.length,
              icon: "document-attach-outline" as const,
            },
            {
              label: "Medical Records",
              value: records.length,
              icon: "medkit-outline" as const,
            },
            {
              label: "AI Insights",
              value: aiInsightsCount,
              icon: "sparkles-outline" as const,
            },
            {
              label: "Total Items",
              value: totalCount,
              icon: "folder-open-outline" as const,
            },
          ].map((item) => (
            <View key={item.label} style={isMobile ? styles.statMobileItem : styles.statWebItem}>
              <AnimatedStatsCard {...item} color={theme.primary} centered={isMobile}/>
            </View>
          ))}
        </View>

        <View style={styles.controlsCard}>
          <View style={[styles.controlsRow, isMobile && styles.controlsRowMobile]}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={19} color="#64748B"/>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search documents, records, notes..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />

              {!!search && (
                <Pressable onPress={() => setSearch("")} style={styles.clearSearchButton}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8"/>
                </Pressable>
              )}
            </View>

            <View style={[styles.sortWrap, isMobile && styles.sortWrapMobile]}>
              <DropdownMenu
                value={sortBy}
                onChange={(value) => setSortBy(value as SortBy)}
                items={[
                  { label: "Default", value: "default" },
                  { label: "Newest first", value: "newest" },
                  { label: "Oldest first", value: "oldest" },
                  { label: "Title A-Z", value: "title_asc" },
                  { label: "Title Z-A", value: "title_desc" },
                  { label: "Type A-Z", value: "type_asc" },
                  { label: "Type Z-A", value: "type_desc" },
                ]}
              />
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { label: "All", value: "all" as Tab },
            { label: "Medical Records", value: "records" as Tab },
            { label: "Images", value: "images" as Tab },
            { label: "PDFs", value: "pdfs" as Tab },
            { label: "Docs", value: "docs" as Tab },
            { label: "Other", value: "other" as Tab },
          ].map((item) => {
            const active = tab === item.value;

            return (
              <Pressable key={item.value} style={[styles.tab, active && { backgroundColor: theme.soft, borderColor: theme.borderSoft }]} onPress={() => setTab(item.value)}>
                <Text style={[styles.tabText, active && { color: theme.primary }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary}/>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={30} color="#DC2626"/>
            <Text style={styles.emptyTitle}>Could not load documents</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : totalCount === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={34} color={theme.primary}/>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyText}>Uploaded appointment files and medical records will appear here.</Text>
          </View>
        ) : filteredCount === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={34} color={theme.primary}/>
            <Text style={styles.emptyTitle}>No matching items</Text>
            <Text style={styles.emptyText}>Try another search term, category or sorting option.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredFiles.map((file) => (
              <HoverCard
                key={`file-${file.id}`}
                pressableStyle={styles.cardWrap}
                cardStyle={styles.card}
                withShadow
                onPress={() => setSelectedFile(file)}
              > 
                <View style={[styles.cardIcon, { backgroundColor: `${theme.primary}12` }]}>
                  <Ionicons name={getFileIcon(file)} size={24} color={theme.primary}/>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{file.title || "Untitled document"}</Text>
                  <Text style={styles.cardMeta}>{getFileTypeLabel(file)} · {formatDateTime(file.created_at)}</Text>
                  <Text style={styles.cardText} numberOfLines={2}>{file.description || file.notes || file.category || "Uploaded document"}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardBadge}>{getFileTypeLabel(file)}</Text>
                    <Ionicons name="chevron-forward-outline" size={18} color="#94A3B8"/>
                  </View>
                </View>
              </HoverCard>
            ))}

            {filteredRecords.map((record) => (
              <HoverCard
                key={`record-${record.id}`}
                pressableStyle={styles.cardWrap}
                cardStyle={styles.card}
                withShadow
                onPress={() => setSelectedRecord(record)}
              >
                <View style={[styles.cardIcon, { backgroundColor: `${theme.primary}12` }]}>
                  <Ionicons name="medkit-outline" size={24} color={theme.primary}/>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{record.title || record.category || "Medical record"}</Text>
                  <Text style={styles.cardMeta}>Medical Record · {formatDateTime(record.created_at)}</Text>
                  <Text style={styles.cardText} numberOfLines={2}>{getRecordSummary(record)}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardBadge}>{record.category || "Medical Record"}</Text>
                    <Ionicons name="chevron-forward-outline" size={18} color="#94A3B8"/>
                  </View>
                </View>
              </HoverCard>
            ))}
          </View>
        )}

      </ScrollView>

      <Modal visible={!!selectedFile} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedFile && (
              <>
                <View style={[styles.modalIcon, { backgroundColor: `${theme.primary}12` }]}>
                  <Ionicons name={getFileIcon(selectedFile)} size={34} color={theme.primary}/>
                </View>
                <Text style={styles.modalTitle}>{selectedFile.title}</Text>
                <Text style={styles.modalSubtitle}>{getFileTypeLabel(selectedFile)}</Text>
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.detailList}>
                  <DetailRow label="Uploaded" value={formatDateTime(selectedFile.created_at)}/>
                  <DetailRow label="Doctor" value={getDoctorName(selectedFile.doctors)}/>
                  <DetailRow label="Description" value={selectedFile.description || "Not set"}/>
                  <DetailRow label="Notes" value={selectedFile.notes || "Not set"}/>
                  <DetailRow label="File type" value={selectedFile.file_type || "Not set"}/>
                  <DetailRow label="Category" value={selectedFile.category || "Not set"}/>
                  {!!selectedFile.ai_summary && (
                    <View style={styles.aiSummaryBox}>
                      <View style={styles.aiSummaryHeader}>
                        <Ionicons name="sparkles-outline" size={18} color={theme.primary}/>
                        <Text style={styles.aiSummaryTitle}>AI Summary</Text>
                      </View>
                      <Text style={styles.aiSummaryText}>{selectedFile.ai_summary}</Text>
                    </View>
                  )}
                  {!!selectedFile.ai_image_summary && (
                    <View style={styles.aiSummaryBox}>
                      <View style={styles.aiSummaryHeader}>
                        <Ionicons name="sparkles-outline" size={18} color={theme.primary}/>
                        <Text style={styles.aiSummaryTitle}>AI Image Summary</Text>
                      </View>
                      <Text style={styles.aiSummaryText}>{selectedFile.ai_image_summary}</Text>
                    </View>
                  )}
                  {!!selectedFile.ai_image_findings?.length && (
                    <View style={styles.aiSummaryBox}>
                      <View style={styles.aiSummaryHeader}>
                        <Ionicons name="sparkles-outline" size={18} color={theme.primary}/>
                        <Text style={styles.aiSummaryTitle}>AI Image Findings</Text>
                      </View>
                      <Text style={styles.aiSummaryText}>{selectedFile.ai_image_findings.join(", ")}</Text>
                    </View>
                  )}
                </ScrollView>
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalCancelButton} onPress={() => setSelectedFile(null)}>
                    <Text style={styles.modalCancelText}>Close</Text>
                  </Pressable>
                  <Pressable style={[styles.modalPrimaryButton, { backgroundColor: theme.primary }]} onPress={() => openFile(selectedFile.file_url)}>
                    <Ionicons name="open-outline" size={18} color="#FFFFFF"/>
                    <Text style={styles.modalPrimaryButtonText}>Open file</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>

      </Modal>

      <Modal visible={!!selectedRecord} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedRecord && (
              <>
                <View style={[styles.modalIcon, { backgroundColor: `${theme.primary}12` }]}>
                  <Ionicons name="medkit-outline" size={34} color={theme.primary} />
                </View>

                <Text style={styles.modalTitle}>{selectedRecord.title || selectedRecord.category || "Medical record"}</Text>
                <Text style={styles.modalSubtitle}>{getDoctorName(selectedRecord.doctors)} · {formatDate(selectedRecord.created_at)}</Text>

                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.detailList}>
                  <DetailRow label="Category" value={selectedRecord.category || "Not set"}/>
                  <DetailRow label="Symptoms" value={selectedRecord.symptoms || "Not set"}/>
                  <DetailRow label="Diagnosis" value={selectedRecord.diagnosis || "Not set"}/>
                  <DetailRow label="Treatment plan" value={selectedRecord.treatment_plan || "Not set"}/>
                  <DetailRow label="Prescription" value={selectedRecord.prescription || "Not set"}/>
                  <DetailRow label="Recommendations" value={selectedRecord.recommendations || "Not set"}/>
                  <DetailRow label="Notes" value={selectedRecord.notes || "Not set"}/>
                  <DetailRow label="Blood pressure" value={selectedRecord.blood_pressure || "Not set"}/>
                  <DetailRow label="Heart rate" value={selectedRecord.heart_rate ? `${selectedRecord.heart_rate} bpm` : "Not set"}/>
                  <DetailRow label="Temperature" value={selectedRecord.temperature ? `${selectedRecord.temperature}°C` : "Not set"}/>
                  <DetailRow label="Weight" value={selectedRecord.weight_kg ? `${selectedRecord.weight_kg} kg` : "Not set"}/>
                  <DetailRow label="Height" value={selectedRecord.height_cm ? `${selectedRecord.height_cm} cm` : "Not set"}/>
                  <DetailRow label="Follow-up" value={selectedRecord.follow_up_date || "Not set"}/>

                  <View style={styles.recordFilesSection}>
                    <Text style={styles.recordFilesTitle}>Attached documents</Text>

                    {selectedRecordFiles.length === 0 ? (
                      <Text style={styles.recordFilesEmpty}>No documents are attached to this medical record.</Text>
                    ) : (
                      selectedRecordFiles.map((file) => (
                        <Pressable key={file.id} style={styles.attachedFileCard} onPress={() => openFile(file.file_url)}>
                          <View style={[styles.attachedFileIcon, { backgroundColor: `${theme.primary}12` }]}>
                            <Ionicons name={getFileIcon(file)} size={18} color={theme.primary}/>
                          </View>

                          <View style={styles.attachedFileContent}>
                            <Text style={styles.attachedFileTitle}>{file.title}</Text>
                            <Text style={styles.attachedFileMeta}>{getFileTypeLabel(file)} · {formatDateTime(file.created_at)}</Text>
                          </View>

                          <Ionicons name="open-outline" size={18} color="#94A3B8"/>
                        </Pressable>
                      ))
                    )}
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <Pressable style={styles.modalCancelButton} onPress={() => setSelectedRecord(null)}>
                    <Text style={styles.modalCancelText}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>

      </Modal>

    </>
  
  );

}

function DetailRow({ label, value }: { label: string; value: string }) {

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
    padding: 24,
    gap: 18,
  },

  hero: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 24,
  },

  eyebrow: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: "#475569",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  statWebItem: {
    flex: 1,
  },

  statMobileItem: {
    width: "47%",
  },

  controlsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
  },

  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  controlsRowMobile: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  searchWrap: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    outlineStyle: "none" as any,
  },

  clearSearchButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  sortWrap: {
    width: 220,
  },

  sortWrapMobile: {
    width: "100%",
  },

  tabsScroll: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 24,
  },

  tab: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },

  tabText: {
    color: "#0F172A",
    fontWeight: "900",
  },

  centered: {
    paddingVertical: 48,
    alignItems: "center",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 28,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },

  cardWrap: {
    flexBasis: 320,
    flexGrow: 1,
    minWidth: 260,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    flexDirection: "row",
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: Platform.OS === "web" ? 0.04 : 0,
    shadowRadius: Platform.OS === "web" ? 8 : 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === "web" ? 2 : 0,
  },

  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  cardContent: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },

  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },

  cardText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#475569",
    fontWeight: "700",
  },

  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardBadge: {
    backgroundColor: "#F1F5F9",
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 24,
    alignItems: "center",
  },

  modalIcon: {
    width: 86,
    height: 86,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },

  modalSubtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    fontWeight: "700",
    textAlign: "center",
  },

  modalScroll: {
    width: "100%",
    maxHeight: 420,
  },

  aiSummaryBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
  },

  aiSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  aiSummaryTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#64748B",
    textTransform: "uppercase",
  },

  aiSummaryText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#0F172A",
    fontWeight: "700",
  },

  detailList: {
    width: "100%",
    gap: 10,
    paddingBottom: 4,
  },

  detailRow: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 5,
  },

  detailValue: {
    fontSize: 14,
    lineHeight: 21,
    color: "#0F172A",
    fontWeight: "700",
  },

  modalActions: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  modalCancelText: {
    color: "#0F172A",
    fontWeight: "900",
  },

  modalPrimaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  modalPrimaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },

  recordFilesSection: {
    marginTop: 4,
    gap: 10,
  },

  recordFilesTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 4,
  },

  recordFilesEmpty: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 20,
  },

  attachedFileCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  attachedFileIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  attachedFileContent: {
    flex: 1,
    minWidth: 0,
  },

  attachedFileTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },

  attachedFileMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

});