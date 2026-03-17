import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { FormBlock, FormField, FormInput, FormSelect } from "@/components/chat/FormBlock";
import { ChatActionButton } from "@/components/chat/ChatActionButton";
import { ChatInput } from "@/components/chat/ChatInput";
import { LoadingAnimation } from "@/components/chat/LoadingAnimation";
import { Calendar, Clock, Stethoscope, Sun, Moon } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  type ConversationStep,
  type Message,
  type PatientInfo,
  type AppointmentDetails,
  type TimeSlot,
} from "@/types/chat";
import { 
  lookupPatient, 
  getAvailableSlots, 
  createAppointment,   getPatientAppointments, 
  cancelAppointment,
  rescheduleAppointment,
  type AppointmentResponse
} from "@/services/api";

const uid = () => Math.random().toString(36).slice(2, 9);

export default function SchedulingChat() {
  const [step, setStep] = useState<ConversationStep>("WELCOME");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfo & { countryCode: string }>({
    firstName: "",
    lastName: "",
    dob: "",
    phone: "",
    email: "",
    countryCode: "+1",
  });
  const [appointment, setAppointment] = useState<AppointmentDetails>({
    action: null,
    visitType: null,
    urgency: null,
    reason: "",
    insurance: "",
    preferredDate: "",
    preferredTime: "",
  });
  const [isExistingPatient, setIsExistingPatient] = useState<boolean | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<AppointmentResponse[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    });
  }, []);

  const addMessage = useCallback(
    (msg: Omit<Message, "id">) => {
      setMessages((prev) => [...prev, { ...msg, id: uid() }]);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const simulateDelay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Initial welcome
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await simulateDelay(800);
      setLoading(false);
      addMessage({
        type: "bot",
        content:
          "Welcome to MedSchedule. I can help you schedule, reschedule, or cancel an appointment. To get started, please provide your details for verification.",
      });
      await simulateDelay(400);
      addMessage({ type: "form", formType: "patient-info" });
      setStep("COLLECT_INFO");
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(scrollToBottom, [messages, loading, scrollToBottom]);

  const handlePatientInfoSubmit = async () => {
    if (!patientInfo.firstName || !patientInfo.lastName || !patientInfo.dob) return;

    addMessage({
      type: "user",
      content: `${patientInfo.firstName} ${patientInfo.lastName}, DOB: ${patientInfo.dob}`,
    });

    setStep("IDENTIFYING_PATIENT");
    setLoading(true);

    try {
      const fullPhone = `${patientInfo.countryCode}${patientInfo.phone.replace(/\D/g, '')}`;
      console.log("Starting patient lookup for:", patientInfo.firstName, patientInfo.lastName);
      const result = await lookupPatient({
        first_name: patientInfo.firstName,
        last_name: patientInfo.lastName,
        date_of_birth: patientInfo.dob,
        phone: fullPhone,
        email: patientInfo.email,
      });
      console.log("Lookup result received:", result);

      setIsExistingPatient(result.found);
      if (result.patient) {
        setPatientId(result.patient.id);
      }

      setLoading(false);

      if (result.found) {
        addMessage({
          type: "bot",
          content: `Welcome back, ${patientInfo.firstName}. I found your records in our system. How can I help you today?`,
        });
      } else {
        addMessage({
          type: "bot",
          content: `Hi ${patientInfo.firstName}, it looks like you're a new patient. Welcome! Let's get your appointment set up.`,
        });
      }

      await simulateDelay(300);
      addMessage({ type: "action-buttons", formType: "select-action" });
      setStep("SELECT_ACTION");
    } catch (err: any) {
      console.error("Lookup error details:", err);
      setLoading(false);
      addMessage({
        type: "bot",
        content: `Connection Error: ${err.message || 'Unknown error'}. Please check if the backend server is running and your database is connected.`,
      });
    }
  };

  const handleActionSelect = async (action: "schedule" | "reschedule" | "cancel") => {
    setAppointment((a) => ({ ...a, action }));
    const labels = { schedule: "Schedule a New Appointment", reschedule: "Reschedule Appointment", cancel: "Cancel Appointment" };
    addMessage({ type: "user", content: labels[action] });

    if (action === "cancel" || action === "reschedule") {
      setLoading(true);
      try {
        if (!patientId) throw new Error("No patient ID");
        const appts = await getPatientAppointments(patientId);
        setPatientAppointments(appts);
        setLoading(false);

        if (appts.length === 0) {
          addMessage({
            type: "bot",
            content: "I couldn't find any upcoming appointments for you. Is there anything else I can help with?",
          });
          setStep("SELECT_ACTION");
        } else {
          addMessage({
            type: "bot",
            content: action === "cancel" 
              ? "Which appointment would you like to cancel?" 
              : "Which appointment would you like to reschedule?",
          });
          addMessage({ type: "appointment-list", appointments: appts });
        }
      } catch (err) {
        setLoading(false);
        addMessage({
          type: "bot",
          content: `Sorry, I couldn't fetch your appointments. Please call our office.`,
        });
      }
      return;
    }

    await simulateDelay(300);
    addMessage({
      type: "bot",
      content: "What type of visit would you prefer?",
    });
    await simulateDelay(200);
    addMessage({ type: "action-buttons", formType: "visit-type" });
    setStep("SELECT_VISIT_TYPE");
  };

  const handleVisitType = async (type: "telehealth" | "office") => {
    setAppointment((a) => ({ ...a, visitType: type }));
    addMessage({ type: "user", content: type === "telehealth" ? "Telehealth Visit" : "Office Visit" });

    await simulateDelay(300);
    addMessage({ type: "bot", content: "Please tell me the reason for your visit and your insurance details." });
    await simulateDelay(200);
    addMessage({ type: "form", formType: "reason-insurance" });
    setStep("COLLECT_REASON");
  };

  const handleReasonSubmit = async () => {
    if (!appointment.reason) return;
    addMessage({
      type: "user",
      content: `Reason: ${appointment.reason}${appointment.insurance ? ` | Insurance: ${appointment.insurance}` : ""}`,
    });

    await simulateDelay(300);
    addMessage({ type: "bot", content: "How urgent is this visit?" });
    await simulateDelay(200);
    addMessage({ type: "action-buttons", formType: "urgency" });
    setStep("SELECT_URGENCY");
  };

  const handleUrgencySelect = async (urgency: "urgent" | "routine") => {
    setAppointment((a) => ({ ...a, urgency }));
    addMessage({ type: "user", content: urgency === "urgent" ? "Urgent — First Available" : "Routine — Can Wait" });

    setLoading(true);
    try {
      const slots = await getAvailableSlots(urgency);
      // Map SlotResponse to TimeSlot
      const timeSlots: TimeSlot[] = slots.map(s => ({
        id: s.id.toString(),
        date: s.date,
        time: s.time,
        provider: s.provider
      }));
      
      setAvailableSlots(timeSlots);
      setLoading(false);

      if (timeSlots.length === 0) {
        addMessage({
          type: "bot",
          content: urgency === "urgent" 
            ? "I'm sorry, we don't have any urgent slots available right now. Would you like to check for routine availability instead?"
            : "We don't have any available slots at the moment. Please check back later.",
        });
        if (urgency === "urgent") {
          addMessage({ type: "action-buttons", formType: "urgency" });
        }
        return;
      }

      addMessage({
        type: "bot",
        content: urgency === "urgent"
          ? "Here are the first available slots for you:"
          : "Here are the available time slots. Pick one that works best:",
      });
      await simulateDelay(200);
      addMessage({ type: "slots", slots: timeSlots });
      setStep("SELECT_SLOT");
    } catch (err) {
      setLoading(false);
      addMessage({
        type: "bot",
        content: "I couldn't fetch available slots right now. Please try again in a moment.",
      });
    }
  };

  const handleSlotSelect = async (slot: TimeSlot) => {
    setSelectedSlot(slot);
    addMessage({
      type: "user",
      content: `${format(parseISO(slot.date), "EEEE, MMM d")} at ${format(parseISO(`1970-01-01T${slot.time}`), "h:mm a")} with ${slot.provider}`,
    });

    await simulateDelay(300);
    addMessage({ type: "confirmation" });
    setStep("CONFIRM");
  };

  const handleConfirm = async () => {
    if (!patientId || !selectedSlot) return;
    
    setLoading(true);
    try {
      if (reschedulingAppointmentId && selectedSlot) {
        await rescheduleAppointment(reschedulingAppointmentId, parseInt(selectedSlot.id));
        
        setLoading(false);
        addMessage({
          type: "bot",
          content: `Rescheduled! Your appointment is now set for ${format(parseISO(selectedSlot.date), "EEEE, MMM d")} at ${format(parseISO(`1970-01-01T${selectedSlot.time}`), "h:mm a")} with ${selectedSlot.provider}. A confirmation has been sent.`,
        });
        setReschedulingAppointmentId(null);
        setStep("CONFIRMED");
      } else {
        await createAppointment({
          patient_id: patientId,
          slot_id: parseInt(selectedSlot.id),
          visit_type: appointment.visitType as "telehealth" | "office",
          urgency: appointment.urgency as "urgent" | "routine",
          reason: appointment.reason,
          insurance: appointment.insurance || undefined,
        });

        setLoading(false);
        addMessage({
          type: "bot",
          content: `Confirmed! Your ${appointment.visitType} appointment is set for ${format(parseISO(selectedSlot.date), "EEEE, MMM d")} at ${format(parseISO(`1970-01-01T${selectedSlot.time}`), "h:mm a")} with ${selectedSlot.provider}. A confirmation has been sent to your email (${patientInfo.email}) and phone (${patientInfo.countryCode}${patientInfo.phone}). Thank you!`,
        });
        setStep("CONFIRMED");
      }
    } catch (err) {
      setLoading(false);
      addMessage({
        type: "bot",
        content: "I encountered an error while booking your appointment. Please try again or contact us.",
      });
    }
  };

  const handleCancelAppt = async (appt: AppointmentResponse) => {
    setLoading(true);
    try {
      await cancelAppointment(appt.id);
      setLoading(false);
      addMessage({ type: "user", content: `Cancel appointment on ${format(parseISO(appt.slot!.date), "MMM d")}` });
      addMessage({
        type: "bot",
        content: `Your appointment for ${appt.reason} on ${format(parseISO(appt.slot!.date), "MMM d")} has been cancelled.`,
      });
      setStep("CANCELLED");
    } catch (err) {
      setLoading(false);
      addMessage({ type: "bot", content: "Failed to cancel the appointment. Please try again." });
    }
  };

  const handleRescheduleSelect = async (appt: AppointmentResponse) => {
    setReschedulingAppointmentId(appt.id);
    addMessage({ type: "user", content: `Reschedule appointment on ${format(parseISO(appt.slot!.date), "MMM d")}` });
    
    // Set some defaults based on existing appointment
    setAppointment(prev => ({
      ...prev,
      visitType: appt.visit_type as any,
      reason: appt.reason,
      insurance: appt.insurance || "",
    }));

    await simulateDelay(300);
    addMessage({ type: "bot", content: "Let's find a new time. How urgent is this?" });
    addMessage({ type: "action-buttons", formType: "urgency" });
    setStep("SELECT_URGENCY");
  };

  const handleFreeText = (text: string) => {
    addMessage({ type: "user", content: text });
  };

  const renderMessage = (msg: Message) => {
    switch (msg.type) {
      case "bot":
        return <ChatBubble key={msg.id} variant="bot">{msg.content}</ChatBubble>;
      case "user":
        return <ChatBubble key={msg.id} variant="user">{msg.content}</ChatBubble>;

      case "form":
        if (msg.formType === "patient-info") {
          return (
            <FormBlock key={msg.id} title="Patient Verification">
              <FormField label="First Name">
                <FormInput
                  value={patientInfo.firstName}
                  onChange={(e) => setPatientInfo((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="e.g. Jane"
                />
              </FormField>
              <FormField label="Last Name">
                <FormInput
                  value={patientInfo.lastName}
                  onChange={(e) => setPatientInfo((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="e.g. Smith"
                />
              </FormField>
              <FormField label="Date of Birth">
                <FormInput
                  type="date"
                  value={patientInfo.dob}
                  onChange={(e) => setPatientInfo((p) => ({ ...p, dob: e.target.value }))}
                />
              </FormField>
              <FormField label="Email Address">
                <FormInput
                  type="email"
                  value={patientInfo.email}
                  onChange={(e) => setPatientInfo((p) => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. jane.smith@example.com"
                />
              </FormField>
              <FormField label="Phone Number">
                <div className="flex gap-2">
                  <FormSelect
                    className="w-[100px] shrink-0"
                    value={patientInfo.countryCode}
                    onChange={(e) => setPatientInfo((p) => ({ ...p, countryCode: e.target.value }))}
                  >
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+81">+81 (JP)</option>
                    <option value="+49">+49 (DE)</option>
                    <option value="+33">+33 (FR)</option>
                    <option value="+971">+971 (UAE)</option>
                  </FormSelect>
                  <FormInput
                    type="tel"
                    className="flex-1"
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="555-0123"
                  />
                </div>
              </FormField>
              <ChatActionButton
                onClick={handlePatientInfoSubmit}
                disabled={!patientInfo.firstName || !patientInfo.lastName || !patientInfo.dob || !patientInfo.email}
              >
                Verify Identity
              </ChatActionButton>
            </FormBlock>
          );
        }
        if (msg.formType === "reason-insurance") {
          return (
            <FormBlock key={msg.id} title="Visit Details">
              <FormField label="Reason for Visit">
                <FormInput
                  value={appointment.reason}
                  onChange={(e) => setAppointment((a) => ({ ...a, reason: e.target.value }))}
                  placeholder="e.g. Annual checkup, headache..."
                />
              </FormField>
              <FormField label="Insurance Provider">
                <FormSelect
                  value={appointment.insurance}
                  onChange={(e) => setAppointment((a) => ({ ...a, insurance: e.target.value }))}
                >
                  <option value="">Select insurance...</option>
                  <option value="Blue Cross">Blue Cross Blue Shield</option>
                  <option value="Aetna">Aetna</option>
                  <option value="UnitedHealth">UnitedHealth</option>
                  <option value="Cigna">Cigna</option>
                  <option value="Medicare">Medicare</option>
                  <option value="Medicaid">Medicaid</option>
                  <option value="Self-Pay">Self-Pay</option>
                  <option value="Other">Other</option>
                </FormSelect>
              </FormField>
              <ChatActionButton onClick={handleReasonSubmit} disabled={!appointment.reason}>
                Continue
              </ChatActionButton>
            </FormBlock>
          );
        }
        return null;

      case "action-buttons":
        if (msg.formType === "select-action") {
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="self-start flex flex-wrap gap-2 max-w-[85%]"
            >
              <ChatActionButton onClick={() => handleActionSelect("schedule")}>
                <Calendar className="mr-1.5 h-4 w-4 inline" /> Schedule New Appointment
              </ChatActionButton>
              {isExistingPatient && (
                <>
                  <ChatActionButton variant="secondary" onClick={() => handleActionSelect("reschedule")}>
                    Reschedule Appointment
                  </ChatActionButton>
                  <ChatActionButton variant="secondary" onClick={() => handleActionSelect("cancel")}>
                    Cancel Appointment
                  </ChatActionButton>
                </>
              )}
            </motion.div>
          );
        }
        if (msg.formType === "visit-type") {
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="self-start flex flex-wrap gap-2 max-w-[85%]"
            >
              <ChatActionButton onClick={() => handleVisitType("telehealth")}>
                <Stethoscope className="mr-1.5 h-4 w-4 inline" /> Telehealth Visit
              </ChatActionButton>
              <ChatActionButton variant="secondary" onClick={() => handleVisitType("office")}>
                Office Visit
              </ChatActionButton>
            </motion.div>
          );
        }
        if (msg.formType === "urgency") {
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="self-start flex flex-wrap gap-2 max-w-[85%]"
            >
              <ChatActionButton onClick={() => handleUrgencySelect("urgent")}>
                Urgent — First Available
              </ChatActionButton>
              <ChatActionButton variant="secondary" onClick={() => handleUrgencySelect("routine")}>
                Routine — Can Wait
              </ChatActionButton>
            </motion.div>
          );
        }
        return null;

      case "slots":
        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="self-start grid gap-2 max-w-[85%] w-full"
          >
            {msg.slots?.map((slot) => (
              <ChatActionButton
                key={slot.id}
                variant="secondary"
                onClick={() => handleSlotSelect(slot)}
                className="justify-start text-left"
              >
                <Clock className="mr-2 h-4 w-4 inline shrink-0" />
                <span className="font-semibold">{format(parseISO(slot.date), "EEE, MMM d")}</span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span>{format(parseISO(`1970-01-01T${slot.time}`), "h:mm a")}</span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="text-muted-foreground">{slot.provider}</span>
              </ChatActionButton>
            ))}
          </motion.div>
        );

      case "confirmation":
        return (
          <FormBlock key={msg.id} title="Confirm Your Appointment">
            <div className="space-y-2 text-[15px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">{patientInfo.firstName} {patientInfo.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{appointment.visitType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-medium">
                  {selectedSlot && format(parseISO(selectedSlot.date), "MMM d")} at {selectedSlot && format(parseISO(`1970-01-01T${selectedSlot.time}`), "h:mm a")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">{selectedSlot?.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reason</span>
                <span className="font-medium">{appointment.reason}</span>
              </div>
              {appointment.insurance && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Insurance</span>
                  <span className="font-medium">{appointment.insurance}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <ChatActionButton onClick={handleConfirm}>Confirm & Schedule</ChatActionButton>
              <ChatActionButton variant="secondary" onClick={() => {
                addMessage({ type: "bot", content: "No problem. Let's pick a different time." });
                setStep("SELECT_SLOT");
                setTimeout(() => addMessage({ type: "slots", slots: availableSlots }), 400);
              }}>
                Pick a Different Time
              </ChatActionButton>
            </div>
          </FormBlock>
        );

      case "appointment-list":
        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="self-start grid gap-2 max-w-[85%] w-full"
          >
            {msg.appointments?.map((appt) => (
              <div key={appt.id} className="bg-background/80 backdrop-blur-md border border-border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-sm">{appt.reason}</div>
                    <div className="text-xs text-muted-foreground">
                      {appt.slot ? (
                        <>
                          {format(parseISO(appt.slot.date), "EEE, MMM d")} at {format(parseISO(`1970-01-01T${appt.slot.time}`), "h:mm a")}
                        </>
                      ) : "Time not set"}
                    </div>
                    <div className="text-xs text-muted-foreground">{appt.slot?.provider}</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {appt.visit_type}
                  </div>
                </div>
                <div className="flex gap-2">
                  {appointment.action === "cancel" ? (
                    <button
                      onClick={() => handleCancelAppt(appt)}
                      className="flex-1 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      Cancel Appointment
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRescheduleSelect(appt)}
                      className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      Reschedule Appointment
                    </button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        );

      default:
        return null;
    }
  };

  const { theme, setTheme } = useTheme();

  return (
    <div className="relative flex h-svh flex-col bg-background overflow-hidden transition-colors duration-500">
      {/* Premium Motion Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-1000">
        <AnimatePresence mode="wait">
          {theme === "dark" ? (
            <motion.div
              key="dark-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              {/* Optional Video Background - User should place file at public/videos/bg-dark.mp4 */}
              <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                onError={(e) => (e.currentTarget.style.display = "none")}
              >
                <source src="/videos/bg-dark.mp4" type="video/mp4" />
              </video>

              <motion.div
                animate={{
                  opacity: [0.3, 0.5, 0.4, 0.3],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] rounded-full bg-blue-900/40 blur-[120px]"
              />
              <motion.div
                animate={{
                  opacity: [0.2, 0.4, 0.3, 0.2],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-purple-900/30 blur-[140px]"
              />
            </motion.div>
          ) : (
            <motion.div
              key="light-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              {/* Optional Video Background - User should place file at public/videos/bg-light.mp4 */}
              <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-40"
                onError={(e) => (e.currentTarget.style.display = "none")}
              >
                <source src="/videos/bg-light.mp4" type="video/mp4" />
              </video>

              <motion.div
                animate={{
                  opacity: [0.2, 0.4, 0.3, 0.2],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[20%] -left-[20%] w-[100%] h-[100%] rounded-full bg-primary/30 blur-[100px]"
              />
              <motion.div
                animate={{
                  opacity: [0.15, 0.3, 0.2, 0.15],
                }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute top-[30%] -right-[20%] w-[90%] h-[90%] rounded-full bg-accent/25 blur-[120px]"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="bg-noise" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/60 backdrop-blur-xl px-4 py-4 md:px-6">
        <div className="mx-auto max-w-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Stethoscope className="text-primary-foreground h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">MedSchedule</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">AI Healthcare Assistant</p>
            </div>
          </div>
          
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:scale-110 transition-transform active:scale-95"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {messages.map(renderMessage)}
            {loading && <LoadingAnimation key="loading" />}
          </AnimatePresence>
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 mx-auto w-full max-w-xl pb-6 px-4">
        <div className="rounded-2xl bg-card/50 backdrop-blur-xl border border-border shadow-2xl">
          <ChatInput
            onSend={handleFreeText}
            disabled={loading || step === "CONFIRMED" || step === "CANCELLED"}
            placeholder={
              step === "CONFIRMED" || step === "CANCELLED"
                ? "Session complete"
                : "Type a message..."
            }
          />
        </div>
      </div>
    </div>
  );
}
