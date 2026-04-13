export const getApiBase = () => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) return "/api";
  if (url.startsWith("http")) return url + "/api";
  // On Render, the 'host' property is just the domain
  return `https://${url}/api`;
};
export const API_BASE = getApiBase();

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string | null;
  email: string | null;
  insurance_provider: string | null;
  is_new_patient: boolean;
}

export interface PatientLookupRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string; // "YYYY-MM-DD"
  phone?: string;
  email?: string;
}

export interface PatientLookupResult {
  found: boolean;
  patient: Patient | null;
  error?: string;
}

export interface SlotResponse {
  id: number;
  date: string;
  time: string;
  provider: string;
  is_urgent_eligible: boolean;
}

export interface AppointmentCreateRequest {
  patient_id: number;
  slot_id: number;
  visit_type: "telehealth" | "office";
  urgency: "urgent" | "routine";
  reason: string;
  insurance?: string;
  price: number;
  payment_status?: string;
  consent_signed?: boolean;
}

export interface AppointmentResponse {
  id: number;
  patient_id: number;
  slot_id: number;
  visit_type: string;
  urgency: string;
  reason: string;
  insurance: string | null;
  status: string;
  price: number;
  payment_status: string;
  consent_signed: boolean;
  slot?: SlotResponse;
}

export interface Invoice {
  id: number;
  patient_id: number;
  amount: number;
  status: "pending" | "paid";
  description: string;
  due_date: string;
}

export interface PriorAuthorization {
  id: number;
  patient_id: number;
  procedure_name: string;
  status: "Approved" | "Pending" | "Denied";
  valid_until: string | null;
  auth_number: string | null;
  facility: string | null;
}

export interface PreVisitFormCreate {
  patient_id: number;
  symptoms?: string;
  allergies?: string;
  medications?: string;
}

export interface DocumentResponse {
  id: number;
  patient_id: number;
  file_name: string;
  file_type: string | null;
  extracted_data: string | null;
}

export async function lookupPatient(data: PatientLookupRequest): Promise<PatientLookupResult> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 20000); // 20 second timeout

  try {
    const res = await fetch(`${API_BASE}/patients/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return res.json();
  } catch (error: any) {
    if (error.name === 'AbortError') throw new Error("Request timed out (server took too long to respond)");
    throw error;
  }
}

export async function getAvailableSlots(urgency: "urgent" | "routine"): Promise<SlotResponse[]> {
  const res = await fetch(`${API_BASE}/slots/available?urgency=${urgency}`);
  if (!res.ok) throw new Error("Failed to fetch slots");
  return res.json();
}

export async function createAppointment(data: AppointmentCreateRequest): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create appointment");
  return res.json();
}

export async function cancelAppointment(appointmentId: number): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to cancel appointment");
  return res.json();
}

export async function getPatientAppointments(patientId: number): Promise<AppointmentResponse[]> {
  const res = await fetch(`${API_BASE}/appointments/patient/${patientId}`);
  if (!res.ok) throw new Error("Failed to fetch appointments");
  return res.json();
}

export async function rescheduleAppointment(appointmentId: number, newSlotId: number): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/reschedule?new_slot_id=${newSlotId}`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to reschedule appointment");
  return res.json();
}

export async function getInvoices(patientId: number): Promise<Invoice[]> {
  const res = await fetch(`${API_BASE}/patients/${patientId}/invoices`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

export async function payInvoice(invoiceId: number): Promise<Invoice> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_method: "stripe" }),
  });
  if (!res.ok) throw new Error("Failed to pay invoice");
  return res.json();
}

export async function getAuthorizations(patientId: number): Promise<PriorAuthorization[]> {
  const res = await fetch(`${API_BASE}/patients/${patientId}/authorizations`);
  if (!res.ok) throw new Error("Failed to fetch authorizations");
  return res.json();
}

export async function submitIntakeForm(data: PreVisitFormCreate): Promise<any> {
    const res = await fetch(`${API_BASE}/patients/${data.patient_id}/forms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to submit intake form");
    return res.json();
}

export async function uploadPatientDocument(patientId: number, file: File): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch(`${API_BASE}/patients/${patientId}/documents`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload document");
  return res.json();
}
