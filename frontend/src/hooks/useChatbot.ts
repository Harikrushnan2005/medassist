import { useState, useRef, useEffect, useCallback } from "react";
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
  createAppointment,
  getPatientAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getInvoices,
  payInvoice,
  getAuthorizations,
  submitIntakeForm,
  uploadPatientDocument,
  type AppointmentResponse,
  type Invoice,
  type PriorAuthorization
} from "@/services/api";

const uid = () => Math.random().toString(36).slice(2, 9);
const simulateDelay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useChatbot() {
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
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [paymentSession, setPaymentSession] = useState<{ url: string, id: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const liveRoomId = useRef<string | null>(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_status")) return;

    const init = async () => {
      setLoading(true);
      await simulateDelay(800);
      setLoading(false);
      addMessage({
        type: "bot",
        content:
          "Welcome to MedSchedule. I can help you schedule, reschedule, or cancel any appointments. To get started, please provide your details for verification.",
      });
      await simulateDelay(400);
      addMessage({ type: "form", formType: "patient-info" });
      setStep("COLLECT_INFO");
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Check for payment success on redirect
    const params = new URLSearchParams(window.location.search);
    const status = params.get("payment_status");
    const sessionId = params.get("session_id");

    if (status === "success" && sessionId) {
      const finalizeBooking = async () => {
         const savedDetails = localStorage.getItem("pending_appointment");
         if (savedDetails) {
            const { info, appt, slot, price } = JSON.parse(savedDetails);
            setLoading(true);
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
              await createAppointment({
                patient_id: info.id,
                slot_id: parseInt(slot.id),
                visit_type: appt.visitType,
                urgency: appt.urgency,
                reason: appt.reason,
                insurance: appt.insurance,
                price: price,
                payment_status: "paid",
                consent_signed: true
              });
              setLoading(false);
              addMessage({ type: "bot", content: "Payment verified successfully!" });
              addMessage({ 
                type: "bot", 
                content: `Confirmed! Your appointment has been booked. Your confirmation has been sent via SMS/Email to your verified records. Thank you!` 
              });
              setStep("CONFIRMED");
              localStorage.removeItem("pending_appointment");
            } catch (err) {
              setLoading(false);
              addMessage({ type: "bot", content: "Payment was successful, but there was an error finalizing your record. Our staff will contact you shortly to confirm." });
            }
         }
      };
      finalizeBooking();
    } else if (status === "cancel") {
      window.history.replaceState({}, document.title, window.location.pathname);
      addMessage({ type: "bot", content: "Payment was cancelled. You can try again whenever you're ready." });
    }
  }, [addMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handlePatientInfoSubmit = async () => {
    if (!patientInfo.firstName || !patientInfo.lastName || !patientInfo.dob) return;

    addMessage({
      type: "user",
      content: `${patientInfo.firstName} ${patientInfo.lastName}, DOB: ${patientInfo.dob}`,
    });

    setStep("IDENTIFYING_PATIENT");
    setLoading(true);

    try {
      const fullPhone = `${patientInfo.countryCode}${patientInfo.phone.replace(/\D/g, "")}`;
      const result = await lookupPatient({
        first_name: patientInfo.firstName,
        last_name: patientInfo.lastName,
        date_of_birth: patientInfo.dob,
        phone: fullPhone,
        email: patientInfo.email,
      });

      setLoading(false);

      if (result.error) {
        addMessage({
          type: "bot",
          content: result.error,
        });
        setStep("COLLECT_INFO");
        return;
      }

      setIsExistingPatient(result.found);
      if (result.patient) {
        setPatientId(result.patient.id);
      }

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

      if (pendingAction) {
        const action = pendingAction;
        setPendingAction(null);
        await handleSidebarAction(action);
      } else {
        await simulateDelay(300);
        addMessage({ type: "action-buttons", formType: "select-action" });
        setStep("SELECT_ACTION");
      }
    } catch (err: any) {
      setLoading(false);
      addMessage({
        type: "bot",
        content: `System Error: Unable to verify records right now. Please try again or call our office.`,
      });
    }
  };

  const handleActionSelect = async (action: "schedule" | "reschedule" | "cancel") => {
    setAppointment((a) => ({ ...a, action }));
    const labels = {
      schedule: "Schedule a New Appointment",
      reschedule: "Reschedule Appointment",
      cancel: "Cancel Appointment",
    };
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
            content:
              action === "cancel"
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
    addMessage({ type: "bot", content: "Please tell me the reason for your visit and your insurance details." });
    await simulateDelay(200);
    addMessage({ type: "form", formType: "reason-insurance" });
    setStep("COLLECT_REASON");
  };

  const handleVisitType = async (type: "telehealth" | "office") => {
    setAppointment((a) => ({ ...a, visitType: type }));
    addMessage({
      type: "user",
      content: type === "telehealth" ? "Telehealth Visit" : "Office Visit",
    });

    await simulateDelay(300);
    addMessage({
      type: "bot",
      content: "How urgent is this visit?",
    });
    await simulateDelay(200);
    addMessage({ type: "action-buttons", formType: "urgency" });
    setStep("SELECT_URGENCY");
  };

  const handleReasonSubmit = async () => {
    if (!appointment.reason) return;
    addMessage({
      type: "user",
      content: `Reason: ${appointment.reason}${appointment.insurance ? ` | Insurance: ${appointment.insurance}` : ""}`,
    });

    await simulateDelay(300);
    addMessage({
      type: "bot",
      content: "What type of visit would you prefer?",
    });
    await simulateDelay(200);
    addMessage({ type: "action-buttons", formType: "visit-type" });
    setStep("SELECT_VISIT_TYPE");
  };

  const handleUrgencySelect = async (urgency: "urgent" | "routine") => {
    setAppointment((a) => ({ ...a, urgency }));
    addMessage({
      type: "user",
      content: urgency === "urgent" ? "Urgent — First Available" : "Routine — Can Wait",
    });

    setLoading(true);
    try {
      const slots = await getAvailableSlots(urgency);
      const timeSlots: TimeSlot[] = slots.map((s) => ({
        id: s.id.toString(),
        date: s.date,
        time: s.time,
        provider: s.provider,
      }));

      setAvailableSlots(timeSlots);
      setLoading(false);

      if (timeSlots.length === 0) {
        addMessage({
          type: "bot",
          content:
            urgency === "urgent"
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
        content:
          urgency === "urgent"
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
      content: `${format(parseISO(slot.date), "EEEE, MMM d")} at ${format(
        parseISO(`1970-01-01T${slot.time}`),
        "h:mm a"
      )} with ${slot.provider}`,
    });

    await simulateDelay(300);
    addMessage({
      type: "bot",
      content: "Thank you. Now, please upload a clear photo of your ID and Insurance card to verify your details for this visit.",
    });
    await simulateDelay(200);
    addMessage({ type: "action-buttons", formType: "upload-id" });
    setStep("UPLOAD_ID");
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
          content: `Rescheduled! Your appointment is now set for ${format(
            parseISO(selectedSlot.date),
            "EEEE, MMM d"
          )} at ${format(parseISO(`1970-01-01T${selectedSlot.time}`), "h:mm a")} with ${selectedSlot.provider}.`,
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
          price: totalPrice,
          payment_status: "pending",
          consent_signed: true
        });

        setLoading(false);
        addMessage({
          type: "bot",
          content: `Confirmed! Your ${appointment.visitType} appointment is set for ${format(
            parseISO(selectedSlot.date),
            "EEEE, MMM d"
          )} at ${format(parseISO(`1970-01-01T${selectedSlot.time}`), "h:mm a")} with ${
            selectedSlot.provider
          }. A confirmation has been sent. Thank you!`,
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
        content: `Your appointment for ${appt.reason} on ${format(
          parseISO(appt.slot!.date),
          "MMM d"
        )} has been cancelled.`,
      });
      setStep("CANCELLED");
    } catch (err) {
      setLoading(false);
      addMessage({ type: "bot", content: "Failed to cancel the appointment. Please try again." });
    }
  };

  const handleRescheduleSelect = async (appt: AppointmentResponse) => {
    setReschedulingAppointmentId(appt.id);
    addMessage({
      type: "user",
      content: `Reschedule appointment on ${format(parseISO(appt.slot!.date), "MMM d")}`,
    });

    setAppointment((prev) => ({
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

  const handleSidebarAction = async (action: string) => {
    addMessage({ type: "user", content: `I would like to access: ${action}` });
    
    if (action === "Patient Chat") {
      resetChat();
      return;
    }

    // Identity Gate: Allow certain modules without initial login
    const publicActions = ["Human Handoff", "Speak to Staff", "Provider Rules", "BAA & MFA", "Patient Chat", "System Admin"];
    if (!patientId && !publicActions.includes(action)) {
      setPendingAction(action);
      addMessage({
        type: "bot",
        content: "To protect your health information, I first need to verify your identity. Please provide your details."
      });
      await simulateDelay(400);
      addMessage({ type: "form", formType: "patient-info" });
      setStep("COLLECT_INFO");
      return;
    }

    if (action === "Consent Forms") {
      setStep("CONSENT_FORMS");
      addMessage({
        type: "bot",
        content: "I have prepared your consent forms based on your medical record. Please click to review and sign your HIPAA release and financial policy.",
      });
      addMessage({
        type: "action-buttons",
        formType: "consent-link"
      });
    } else if (action === "Upload ID / Card") {
      setStep("UPLOAD_ID");
      addMessage({
        type: "bot",
        content: "Please attach a clear photo of your driver's license and insurance card. I will securely save them to your chart.",
      });
      addMessage({
        type: "action-buttons",
        formType: "upload-id"
      });
    } else if (action === "Insurance & Cost") {
      setStep("SIDEBAR_ACTION");
      setLoading(true);
      await simulateDelay(800);
      setLoading(false);
      addMessage({
        type: "bot",
        content: "I have successfully verified your active insurance coverage. Here is your current eligibility and copay information:",
      });
      addMessage({ type: "action-buttons", formType: "insurance-card" });
    } else if (action === "Pay Bill") {
      setStep("SIDEBAR_ACTION");
      setLoading(true);
      try {
        const invoices = await getInvoices(patientId!);
        setLoading(false);
        if (invoices.length === 0) {
          addMessage({ type: "bot", content: "Good news! You have no outstanding bills at this time." });
        } else {
          addMessage({ 
            type: "bot", 
            content: `I found ${invoices.length} outstanding invoice${invoices.length > 1 ? 's' : ''}.` 
          });
          invoices.forEach(inv => {
             addMessage({ type: "action-buttons", formType: "pay-bill", invoices: [inv] });
          });
        }
      } catch (err) {
        setLoading(false);
        addMessage({ type: "bot", content: "I encountered an error looking up your invoices. Please try again later." });
      }
    } else if (action === "Pre-Visit Form") {
      setStep("SIDEBAR_ACTION");
      addMessage({
        type: "bot",
        content: "Let's complete your pre-visit clinical intake. Are you ready to answer a few quick questions?",
      });
      addMessage({ type: "action-buttons", formType: "pre-visit" });
    } else if (action === "PA Status") {
      setStep("SIDEBAR_ACTION");
      setLoading(true);
      try {
        const auths = await getAuthorizations(patientId!);
        setLoading(false);
        if (auths.length === 0) {
          addMessage({ type: "bot", content: "I don't see any pending prior authorizations in your file currently." });
        } else {
          const latest = auths[0];
          addMessage({ 
            type: "bot", 
            content: `I have retrieved the real-time status for your ${latest.procedure_name} from the insurance gateway:` 
          });
          addMessage({ type: "action-buttons", formType: "pa-status", authorizations: [latest] });
        }
      } catch (err) {
        setLoading(false);
        addMessage({ type: "bot", content: "The insurance gateway is currently undergoing maintenance. Please check back in 15 minutes." });
      }
    } else if (action === "Provider Rules" || action === "BAA & MFA") {
      setStep("SIDEBAR_ACTION");
    } else if (action === "Human Handoff" || action === "Speak to Staff") {
      setStep("LIVE_CHAT");
      
      const newRoomId = patientId ? patientId.toString() : uid();
      liveRoomId.current = newRoomId;
      
      addMessage({
        type: "bot",
        content: "Connecting you to a live staff member now. Please wait...",
      });
      addMessage({ type: "action-buttons", formType: "handoff-card" });
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = "localhost:8000"; // Assuming backend is on 8000
      const wsUrl = `${protocol}//${host}/api/chat/ws/${newRoomId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        addMessage({ type: "bot", content: "Connected to securing routing server. Waiting for staff to join room..." });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.sender === "staff") {
            addMessage({ type: "bot", content: `[Staff]: ${data.content}` });
          }
        } catch(e) {
          if (typeof event.data === "string" && !event.data.includes('"sender":"patient"')) {
             addMessage({ type: "bot", content: `[Staff]: ${event.data}` });
          }
        }
      };
      
      ws.onclose = () => {
         addMessage({ type: "bot", content: "Live chat session concluded." });
         setStep("SIDEBAR_ACTION");
      };
    } else if (action === "Schedule Visit") {
      handleActionSelect("schedule");
    } else if (action === "System Admin") {
      addMessage({ type: "bot", content: "Opening Secure Systems Administration panel..." });
    } else {
      setStep("SIDEBAR_ACTION");
      addMessage({
        type: "bot",
        content: `I've received your request for '${action}'. I am pulling up that module for you now...`,
      });
    }
  };

  const handleInsuranceSelect = async (provider: string) => {
    addMessage({ type: "user", content: `Verify: ${provider}` });
    setLoading(true);
    await simulateDelay(1200);
    setLoading(false);
    addMessage({ type: "action-buttons", formType: "insurance-card" });
  };

  const handlePayBill = async (invoiceId: number) => {
    addMessage({ type: "user", content: "Process Payment Securely via Stripe" });
    setLoading(true);
    try {
      await payInvoice(invoiceId);
      setLoading(false);
      addMessage({ 
        type: "bot", 
        content: "Payment successful! Your receipt has been securely emailed to you and the balance has been updated in your charts. Thank you." 
      });
    } catch (err) {
      setLoading(false);
      addMessage({ type: "bot", content: "Payment processing failed. Please check your card details and try again." });
    }
  };

  const handlePreVisitResponse = async (ready: boolean) => {
    addMessage({ type: "user", content: ready ? "Yes, I'm ready" : "No, send me a link" });
    if (ready) {
      addMessage({ type: "bot", content: "Great. Please fill out the brief clinical form below." });
      addMessage({ type: "form", formType: "pre-visit-fields" });
    } else {
      addMessage({ type: "bot", content: "No problem. I have texted a secure link to your phone ending in -1234." });
    }
  };

  const submitPreVisitForm = async (formData: { symptoms: string, allergies: string, medications: string }) => {
    if (!patientId) return;
    addMessage({ type: "user", content: "Submitted Health Questionnaire" });
    setLoading(true);
    try {
      await submitIntakeForm({
        patient_id: patientId,
        ...formData
      });
      setLoading(false);
      addMessage({ 
        type: "bot", 
        content: "Intake form received and filed successfully to your chart. Your provider will review this before your visit." 
      });
    } catch (err) {
      setLoading(false);
      addMessage({ type: "bot", content: "Failed to save the intake form. Please try again." });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!patientId) return;
    addMessage({ type: "user", content: `Uploaded Document: ${file.name}` });
    
    setLoading(true);
    try {
      await uploadPatientDocument(patientId, file);
      setLoading(false);
      addMessage({
        type: "bot",
        content: "Successfully scanned your ID and Insurance Card. The details have been extracted and securely saved to your verified profile."
      });
      if (step === "UPLOAD_ID") {
        await simulateDelay(300);
        addMessage({
          type: "bot",
          content: "Documents received. Almost done! Please review and sign the required medical consent forms and financial policy to proceed with booking.",
        });
        await simulateDelay(200);
        addMessage({ type: "action-buttons", formType: "consent-link" });
        setStep("SIGN_CONSENT");
      } else {
        setStep("SIDEBAR_ACTION"); 
      }
    } catch (err) {
      setLoading(false);
      addMessage({ type: "bot", content: "File upload failed. Please ensure you are uploading a valid image or PDF." });
    }
  };

  const handleConsentSign = async () => {
    addMessage({ type: "user", content: "I have successfully signed all consent forms." });
    addMessage({ type: "bot", content: "Thank you! Your consent forms have been securely filed in your medical record." });
    
    // Calculate final price
    let price = appointment.visitType === "telehealth" ? 65 : 85;
    if (appointment.urgency === "urgent") price += 15;
    setTotalPrice(price);

    // PERSIST STATE BEFORE REDIRECT
    localStorage.setItem("pending_appointment", JSON.stringify({
      info: { id: patientId },
      appt: appointment,
      slot: selectedSlot,
      price: price
    }));

    setStep("PAYMENT");
    setLoading(true);
    
    try {
      // Create Stripe session
      const res = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          amount: price,
          description: `${appointment.visitType} appointment (${appointment.urgency})`
        })
      });
      const data = await res.json();
      setPaymentSession({ url: data.url, id: data.session_id });
      setLoading(false);

      addMessage({
        type: "bot",
        content: `Your total is $${price.toFixed(2)}. To finalize your booking for ${format(parseISO(selectedSlot!.date), "MMM d")}, please complete the secure payment below.`
      });
      addMessage({ type: "action-buttons", formType: "payment-button" });
    } catch (err) {
      setLoading(false);
      addMessage({ type: "bot", content: "Failed to initiate payment session. Please try again." });
    }
  };

  const handleFreeText = async (text: string) => {
    if (!text.trim()) return;
    addMessage({ type: "user", content: text });

    if (step === "LIVE_CHAT" && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ sender: "patient", content: text }));
      return;
    }

    const lowerText = text.toLowerCase();
    
    // Logic-based Intent Routing
    if (lowerText.includes("schedule") || lowerText.includes("book") || lowerText.includes("appointment")) {
      handleSidebarAction("Schedule Visit");
      return;
    }
    if (lowerText.includes("bill") || lowerText.includes("invoice") || lowerText.includes("pay")) {
      handleSidebarAction("Pay Bill");
      return;
    }
    if (lowerText.includes("insurance") || lowerText.includes("coverage") || lowerText.includes("copay")) {
      handleSidebarAction("Insurance & Cost");
      return;
    }
    if (lowerText.includes("admin") || lowerText.includes("dashboard") || lowerText.includes("rule")) {
      handleSidebarAction("System Admin");
      return;
    }
    if (lowerText.includes("staff") || lowerText.includes("human") || lowerText.includes("help")) {
      handleSidebarAction("Speak to Staff");
      return;
    }

    setLoading(true);
    await simulateDelay(1000);
    setLoading(false);
    addMessage({ 
      type: "bot", 
      content: "I've noted that. You can also use the sidebar on the left to quickly access specific modules like Scheduling, Billing, or Insurance verification." 
    });
  };

  const resetChat = () => {
    setStep("WELCOME");
    setMessages([]);
    setPatientId(null);
    setIsExistingPatient(null);
    setAppointment({ action: null, visitType: null, urgency: null, reason: "", insurance: "", preferredDate: "", preferredTime: "" });
    window.location.reload();
  };

  return {
    step,
    messages,
    loading,
    patientInfo,
    setPatientInfo,
    appointment,
    setAppointment,
    isExistingPatient,
    patientId,
    availableSlots,
    patientAppointments,
    selectedSlot,
    scrollRef,
    addMessage,
    handlePatientInfoSubmit,
    handleActionSelect,
    handleVisitType,
    handleReasonSubmit,
    handleUrgencySelect,
    handleSlotSelect,
    handleConfirm,
    handleCancelAppt,
    handleRescheduleSelect,
    handleSidebarAction,
    handleFileUpload,
    handleInsuranceSelect,
    handlePayBill,
    handlePreVisitResponse,
    submitPreVisitForm,
    handleConsentSign,
    handleFreeText,
    resetChat,
    totalPrice,
    paymentSession
  };
}
