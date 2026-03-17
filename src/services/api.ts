const API_BASE = "/api";

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
  slot?: SlotResponse;
}

export async function lookupPatient(data: PatientLookupRequest): Promise<PatientLookupResult> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
