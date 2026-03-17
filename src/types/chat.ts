export interface PatientInfo {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
}

export interface AppointmentDetails {
  action: "schedule" | "reschedule" | "cancel" | null;
  visitType: "telehealth" | "office" | null;
  urgency: "urgent" | "routine" | null;
  reason: string;
  insurance: string;
  preferredDate: string;
  preferredTime: string;
}

export type ConversationStep =
  | "WELCOME"
  | "COLLECT_INFO"
  | "IDENTIFYING_PATIENT"
  | "PATIENT_IDENTIFIED"
  | "SELECT_ACTION"
  | "SELECT_VISIT_TYPE"
  | "COLLECT_REASON"
  | "SELECT_URGENCY"
  | "COLLECT_INSURANCE"
  | "SELECT_SLOT"
  | "CONFIRM"
  | "CONFIRMED"
  | "CANCELLED";

export interface Message {
  id: string;
  type: "bot" | "user" | "form" | "loading" | "action-buttons" | "slots" | "confirmation" | "appointment-list";
  content?: string;
  formType?: string;
  options?: string[];
  slots?: TimeSlot[];
  appointments?: AppointmentResponse[];
}

import { type AppointmentResponse } from "@/services/api";

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  provider: string;
}

export const MOCK_SLOTS: TimeSlot[] = [
  { id: "1", date: "2026-03-13", time: "9:00 AM", provider: "Dr. Sarah Chen" },
  { id: "2", date: "2026-03-13", time: "11:30 AM", provider: "Dr. Sarah Chen" },
  { id: "3", date: "2026-03-13", time: "2:00 PM", provider: "Dr. James Miller" },
  { id: "4", date: "2026-03-16", time: "10:00 AM", provider: "Dr. Sarah Chen" },
  { id: "5", date: "2026-03-16", time: "3:30 PM", provider: "Dr. James Miller" },
  { id: "6", date: "2026-03-17", time: "9:30 AM", provider: "Dr. Sarah Chen" },
];

export const URGENT_SLOTS: TimeSlot[] = [
  { id: "u1", date: "2026-03-12", time: "4:00 PM", provider: "Dr. James Miller" },
  { id: "u2", date: "2026-03-13", time: "8:30 AM", provider: "Dr. Sarah Chen" },
];
