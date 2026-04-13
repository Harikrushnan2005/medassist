import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Stethoscope, Sun, Moon, Shield, Lock, FileText, Upload, CheckCircle2, AlertCircle, CreditCard, Activity, FileCheck, Users, Search, ChevronRight, ChevronLeft, Signature, ExternalLink, Menu, Columns } from "lucide-react";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { FormBlock, FormField, FormInput, FormSelect } from "@/components/chat/FormBlock";
import { ChatActionButton } from "@/components/chat/ChatActionButton";
import { ChatInput } from "@/components/chat/ChatInput";
import { LoadingAnimation } from "@/components/chat/LoadingAnimation";
import { PatientSidebar } from "@/components/layout/PatientSidebar";
import { ContextPanel } from "@/components/layout/ContextPanel";
import { ConsentModal } from "@/components/chat/ConsentModal";
import { ProviderRulesDashboard, BAAComplianceDashboard } from "@/components/chat/AdminDashboards";
import { useNavigate } from "react-router-dom";
import { type Message } from "@/types/chat";
import { useChatbot } from "@/hooks/useChatbot";
import { API_BASE } from "@/services/api";

function SchedulingChat() {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [currentView, setCurrentView] = useState<"chat" | "Provider Rules" | "BAA & MFA" | "Doctor Availability">("chat");
  const navigate = useNavigate();
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const {
    step,
    messages,
    loading,
    patientInfo,
    setPatientInfo,
    appointment,
    setAppointment,
    isExistingPatient,
    availableSlots,
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
    totalPrice,
    paymentSession,
    handleFreeText,
  } = useChatbot();

  const [preVisitData, setPreVisitData] = useState({ symptoms: "", allergies: "No new allergies (Same as last visit)", medications: "No changes to medication" });

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
                  <option value="Self-Pay">Self-Pay</option>
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
        if (msg.formType === "consent-link") {
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="self-start flex flex-wrap gap-2 max-w-[85%]"
            >
              <ChatActionButton onClick={() => setShowConsentModal(true)}>
                <FileText className="mr-1.5 h-4 w-4 inline" /> View & Sign Consent Forms
              </ChatActionButton>
            </motion.div>
          );
        }
        if (msg.formType === "upload-id") {
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="self-start flex flex-wrap gap-2 max-w-[85%]"
            >
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <div className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/20 transition-all text-sm">
                  <Upload className="h-4 w-4" /> Upload Document
                </div>
              </label>
            </motion.div>
          );
        }
        if (msg.formType === "insurance-check") {
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start flex flex-wrap gap-2 max-w-[85%]">
              <ChatActionButton onClick={() => handleInsuranceSelect("Blue Cross Blue Shield")}>
                <Shield className="mr-1.5 h-4 w-4 inline" /> Blue Cross
              </ChatActionButton>
              <ChatActionButton onClick={() => handleInsuranceSelect("Aetna")}>
                <Shield className="mr-1.5 h-4 w-4 inline" /> Aetna
              </ChatActionButton>
              <ChatActionButton onClick={() => handleInsuranceSelect("UnitedHealthcare")}>
                <Shield className="mr-1.5 h-4 w-4 inline" /> UnitedHealthcare
              </ChatActionButton>
              <ChatActionButton variant="secondary" onClick={() => handleInsuranceSelect("Other")}>
                Other / Self-Pay
              </ChatActionButton>
            </motion.div>
          );
        }
        if (msg.formType === "insurance-card") {
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start bg-white border border-slate-200 rounded-2xl p-5 shadow-sm w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Active Coverage</h4>
                  <p className="text-xs text-slate-500">Verified just now</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500">Primary Care Copay</span>
                  <span className="font-semibold text-slate-800">$25.00</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500">Specialist Copay</span>
                  <span className="font-semibold text-slate-800">$50.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deductible Met</span>
                  <span className="font-semibold text-slate-800">$1,250 <span className="text-xs text-slate-400 font-normal">/ $3,000</span></span>
                </div>
              </div>
            </motion.div>
          );
        }
        if (msg.formType === "pay-bill") {
          const inv = msg.invoices?.[0];
          if (!inv) return null;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start bg-white border border-slate-200 rounded-2xl p-5 shadow-sm w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Invoice #{inv.id}</h4>
                  <p className="text-xs text-slate-500">{inv.description}</p>
                </div>
              </div>
              <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Due</p>
                <p className="text-3xl font-serif text-slate-800">${inv.amount.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => handlePayBill(inv.id)} 
                disabled={inv.status === "paid"}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm disabled:bg-slate-400"
              >
                <CreditCard className="w-4 h-4" /> {inv.status === "paid" ? "Paid" : "Pay Securely via Stripe"}
              </button>
            </motion.div>
          );
        }
        if (msg.formType === "pa-status") {
          const auth = msg.authorizations?.[0];
          if (!auth) return null;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start bg-white border border-slate-200 rounded-2xl p-5 shadow-sm w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Auth #{auth.auth_number || "Pending"}</h4>
                  <p className="text-xs text-slate-500">{auth.procedure_name}</p>
                </div>
              </div>
              <div className="space-y-4 text-sm mt-4">
                 <div className={`flex items-center gap-3 p-3 rounded-xl font-medium border ${
                   auth.status === 'Approved' ? 'bg-green-50 border-green-100 text-green-700' : 
                   auth.status === 'Denied' ? 'bg-red-50 border-red-100 text-red-700' : 
                   'bg-amber-50 border-amber-100 text-amber-700'
                 }`}>
                   {auth.status === 'Approved' ? <CheckCircle2 className="w-5 h-5 text-green-500"/> : <AlertCircle className="w-5 h-5"/>}
                   {auth.status === 'Approved' ? 'Successfully Approved' : auth.status}
                 </div>
                 {auth.valid_until && (
                   <div className="flex justify-between pl-1">
                     <span className="text-slate-500">Valid Until</span>
                     <span className="font-semibold">{format(parseISO(auth.valid_until as any), "MMM d, yyyy")}</span>
                   </div>
                 )}
                 <div className="flex justify-between pl-1">
                   <span className="text-slate-500">Facility</span>
                   <span className="font-semibold text-right">{auth.facility || "To be determined"}</span>
                 </div>
              </div>
            </motion.div>
          );
        }
        if (msg.formType === "pre-visit") {
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start flex flex-wrap gap-2 max-w-[85%]">
              <ChatActionButton onClick={() => handlePreVisitResponse(true)}>
                Yes, I'm ready
              </ChatActionButton>
              <ChatActionButton variant="secondary" onClick={() => handlePreVisitResponse(false)}>
                No, send me a link
              </ChatActionButton>
            </motion.div>
          );
        }
        if (msg.formType === "pre-visit-fields") {
          return (
            <FormBlock key={msg.id} title="Clinical Intake (Short)">
              <FormField label="Current Symptoms">
                <FormInput 
                  value={preVisitData.symptoms}
                  onChange={(e) => setPreVisitData(prev => ({ ...prev, symptoms: e.target.value }))}
                  placeholder="e.g. Mild cough, headache..." 
                />
              </FormField>
              <FormField label="Any new allergies discovered?">
                <FormSelect 
                  value={preVisitData.allergies}
                  onChange={(e) => setPreVisitData(prev => ({ ...prev, allergies: e.target.value }))}
                >
                  <option>No new allergies (Same as last visit)</option>
                  <option>Yes, I have new allergies</option>
                </FormSelect>
              </FormField>
              <FormField label="Current Medication Changes?">
                <FormSelect
                  value={preVisitData.medications}
                  onChange={(e) => setPreVisitData(prev => ({ ...prev, medications: e.target.value }))}
                >
                  <option>No changes to medication</option>
                  <option>Yes, medication changed</option>
                </FormSelect>
              </FormField>
              <ChatActionButton onClick={() => submitPreVisitForm(preVisitData)}>Submit Intake Securely</ChatActionButton>
            </FormBlock>
          );
        }
        if (msg.formType === "consent-link") {
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="self-start bg-slate-900 text-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-700">
               <div className="flex items-center gap-3 mb-5">
                 <div className="bg-teal-500/20 p-2 rounded-xl text-teal-400">
                   <Signature className="w-6 h-6" />
                 </div>
                 <div>
                   <h4 className="font-bold text-lg">Sign Consent</h4>
                   <p className="text-xs text-slate-400">Review & finalize your intake</p>
                 </div>
               </div>
               <div className="space-y-4 mb-6">
                 <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto thin-scrollbar">
                   <p className="font-bold text-slate-200 mb-2">Patient Financial Responsibility</p>
                   I authorize MedSchedule Healthcare to provide treatment and understand I am financially responsible for all charges.
                   <br/><br/>
                   <p className="font-bold text-slate-200 mb-2">HIPAA Acknowledgement</p>
                   I acknowledge receipt of the Notice of Privacy Practices and give consent for the use and disclosure of my protected health information.
                 </div>
                 <div className="bg-white rounded-2xl p-4 border-2 border-slate-700 h-24 relative group">
                    <div className="absolute inset-x-8 bottom-8 border-b border-slate-200"></div>
                    <span className="absolute bottom-2 left-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">X Sign Above The Line</span>
                    <Signature className="w-12 h-12 text-slate-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity" />
                 </div>
               </div>
               <button 
                 onClick={handleConsentSign}
                 className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 font-black py-4 rounded-2xl transition-all shadow-lg shadow-teal-500/20 active:scale-95 flex items-center justify-center gap-2"
               >
                 I Consent & Agree <ChevronRight className="w-5 h-5" />
               </button>
            </motion.div>
          );
        }
        if (msg.formType === "payment-button") {
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start bg-teal-50 border border-teal-200 rounded-3xl p-6 shadow-xl w-full max-w-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-teal-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">Secure Checkout</span>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-5 bg-slate-200 rounded border border-white"></div>
                    <div className="w-8 h-5 bg-slate-300 rounded border border-white"></div>
                  </div>
                </div>
                <div className="text-center mb-6">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Final Amount</p>
                  <p className="text-4xl font-serif text-slate-900 font-black">${totalPrice.toFixed(2)}</p>
                </div>
                {paymentSession ? (
                  <a 
                    href={paymentSession.url}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-lg shadow-slate-900/10"
                  >
                    <CreditCard className="w-5 h-5" /> Pay Now to Book <ExternalLink className="w-4 h-4 opacity-50" />
                  </a>
                ) : (
                   <div className="text-center text-slate-400 animate-pulse text-xs font-bold py-4">Generating session...</div>
                )}
                <p className="text-center text-[10px] text-slate-400 mt-4 px-4 leading-tight">
                  Redirecting to Stripe's 256-bit encrypted secure portal. Your slot is reserved for 10 minutes.
                </p>
            </motion.div>
          );
        }
        if (msg.formType === "handoff-card") {
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner w-full max-w-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden text-slate-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-400 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Finding available staff...</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Search className="w-3 h-3"/> Estimated wait: ~2 mins</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 border border-slate-200 rounded-lg">
                  <span className="text-slate-400 block mb-0.5">Urgency</span>
                  <span className="font-bold text-slate-700">NORMAL</span>
                </div>
                <div className="bg-white p-2 border border-slate-200 rounded-lg">
                  <span className="text-slate-400 block mb-0.5">Reference ID</span>
                  <span className="font-mono font-bold text-slate-700">HO-2649</span>
                </div>
              </div>
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

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* Left Sidebar */}
      <AnimatePresence>
        {isLeftSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            className="shrink-0 border-r border-slate-100 bg-[#0d0e14] overflow-hidden"
          >
            <div className="w-[280px]">
              <PatientSidebar onAction={(action) => {
                if (action === "Provider Rules" || action === "BAA & MFA" || action === "System Admin" || action === "Doctor Availability") {
                  if (action === "System Admin") {
                    navigate("/admin");
                  } else {
                    setCurrentView(action as any);
                  }
                } else {
                  setCurrentView("chat");
                  handleSidebarAction(action);
                }
              }} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 bg-white relative max-h-screen">
        {/* Header Security Banner */}
        <header className="flex-shrink-0 border-b border-slate-100 bg-white px-6 py-3 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 text-[11px] font-bold uppercase tracking-widest">
              <Lock className="h-3 w-3"/> HIPAA · AES 256 · TLS 1.3
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            <nav className="hidden lg:flex items-center gap-4">
              <button onClick={() => navigate("/admin")} className="text-[11px] font-black transition-colors uppercase tracking-[0.15em] text-slate-400 hover:text-slate-800">Admin</button>
            </nav>
            
            <button onClick={() => { setCurrentView("chat"); handleSidebarAction("Speak to Staff"); }} className="text-[11px] font-bold bg-[#1a1b26] text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm ml-2">Speak to Staff</button>
            
            <button 
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              <Columns className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col relative overflow-hidden h-full">
          {currentView === "chat" ? (
            <>
              {/* Date Separator */}
              <div className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white z-10 border-b border-slate-50">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10 scroll-smooth"
                aria-live="polite"
              >
                <div className="mx-auto flex max-w-3xl flex-col gap-10 pb-24">
                  <AnimatePresence mode="popLayout">
                    {messages.map(renderMessage)}
                    {loading && <LoadingAnimation key="loading" />}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex-shrink-0 p-4 pb-6 bg-white z-20">
                <div className="mx-auto w-full max-w-4xl px-2 lg:px-8">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all overflow-hidden">
                    <ChatInput
                      onSend={handleFreeText}
                      disabled={loading || step === "CONFIRMED" || step === "CANCELLED"}
                      placeholder={
                        step === "CONFIRMED" || step === "CANCELLED"
                          ? "Session complete"
                          : "Type a message — scheduling, insurance, forms, billing..."
                      }
                    />
                  </div>
                  <div className="text-center md:pb-2 pt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
                    <Shield className="h-3 w-3" /> End-to-end encrypted · TLS 1.3 · AES-256 at rest · HIPAA BAA signed · Audit logged
                  </div>
                </div>
              </div>
            </>
          ) : currentView === "Doctor Availability" ? (
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
              <DoctorAvailabilityView />
            </div>
          ) : null}
        </div>
      </main>

      {/* Right Sidebar */}
      <AnimatePresence>
        {isRightSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            className="shrink-0 border-l border-slate-100 bg-[#f9fafb] overflow-hidden"
          >
            <div className="w-[340px] h-full">
              <ContextPanel step={step} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onComplete={() => {
          handleConsentSign();
        }}
        patientName={patientInfo.firstName ? `${patientInfo.firstName} ${patientInfo.lastName}` : ""}
      />
    </div>
  );
}

function DoctorAvailabilityView() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/providers/status`);
        if (res.ok) {
          const data = await res.json();
          setDoctors(data);
        }
      } catch (e) {} finally { setLoading(false); }
    };
    fetchStatus();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Checking Clinical Staff Status...</div>;

  return (
    <div className="p-10 max-w-5xl mx-auto w-full">
      <div className="mb-12">
        <h1 className="text-3xl font-serif text-slate-900 tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-teal-600" />
          Clinical Staff Directory
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Real-time availability of our medical providers. Active doctors are currently available for scheduling and live consultations.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doc) => (
          <div key={doc.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-teal-200 transition-all group">
            <div className="flex gap-4 items-center mb-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${doc.is_active ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-400'}`}>
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 leading-tight">{doc.name}</h3>
                <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">{doc.specialty || "Provider"}</p>
              </div>
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit ${doc.is_active ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${doc.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
              {doc.is_active ? 'Active / In Clinic' : 'Currently Offline'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SchedulingChat;
