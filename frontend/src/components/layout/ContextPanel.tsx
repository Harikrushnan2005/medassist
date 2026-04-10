import { 
  Building2, 
  Phone, 
  Mail, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Circle, 
  Smartphone, 
  Mail as MailIcon, 
  ShieldCheck,
  Check
} from "lucide-react";
import { type ConversationStep } from "@/types/chat";
import { motion, AnimatePresence } from "framer-motion";

interface ContextPanelProps {
  step: ConversationStep;
}

export function ContextPanel({ step }: ContextPanelProps) {
  // Map our chat steps to UI progress steps
  const getProgressIndex = () => {
    switch (step) {
      case "WELCOME":
      case "COLLECT_INFO":
      case "IDENTIFYING_PATIENT":
        return 0; // Patient Identification
      case "SELECT_ACTION":
      case "COLLECT_REASON":
      case "SELECT_VISIT_TYPE":
        return 1; // Reason for Visit
      case "SELECT_URGENCY":
        return 2; // Triage & Urgency
      case "SELECT_SLOT":
        return 3; // Select Appointment Slot
      case "UPLOAD_ID":
        return 4; // ID & Coverage Verification
      case "SIGN_CONSENT":
      case "CONSENT_FORMS":
      case "PAYMENT":
        return 5; // Consent & Financial Policy
      case "CONFIRMED":
      case "CANCELLED":
        return 6; // Appointment Confirmed
      case "SIDEBAR_ACTION":
        return Math.max(0, currentIndex); 
      default:
        return 0;
    }
  };

  const currentIndex = getProgressIndex();

  return (
    <div className="flex flex-col h-full w-[340px] bg-white border-l border-slate-200 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.05)] z-20 shrink-0 overflow-y-auto">
      <div className="p-8 space-y-10">
        
        {/* Practice Info */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Practice</h3>
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
          </div>
          
          <div className="flex items-start gap-4 mb-6">
             <div className="h-12 w-12 shrink-0 rounded-2xl bg-teal-500 text-white flex items-center justify-center p-2.5 shadow-lg shadow-teal-500/20 ring-4 ring-teal-500/5">
               <Building2 className="h-full w-full" />
             </div>
             <div className="pt-0.5">
               <h4 className="font-bold text-slate-900 text-base tracking-tight">Sunrise Family Medical</h4>
               <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                 <ShieldCheck className="h-3 w-3 text-teal-600" /> Primary Care · Pediatric
               </p>
             </div>
          </div>

          <div className="space-y-3.5 mt-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value="(555) 200-4400" />
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value="info@sunrisefamily.med" />
            <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Hours" value={<span className="text-teal-600 font-bold">24/7 Available</span>} />
            <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value="412 Maple St, San Jose" />
          </div>
        </section>

        {/* Session Progress */}
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Session Progress</h3>
          <div className="relative ml-2.5 border-l-2 border-slate-100 pl-8 space-y-10">
            <ProgressStep 
              label="Patient Identification" 
              status={currentIndex > 0 ? 'completed' : currentIndex === 0 ? 'active' : 'pending'} 
            />
            <ProgressStep 
              label="Reason for Visit" 
              status={currentIndex > 1 ? 'completed' : currentIndex === 1 ? 'active' : 'pending'} 
            />
            <ProgressStep 
              label="Triage & Urgency" 
              status={currentIndex > 2 ? 'completed' : currentIndex === 2 ? 'active' : 'pending'} 
            />
            <ProgressStep 
              label="Select Appointment Slot" 
              status={currentIndex > 3 ? 'completed' : currentIndex === 3 ? 'active' : 'pending'} 
            />
            <ProgressStep 
              label="ID & Coverage Verification" 
              status={currentIndex > 4 ? 'completed' : currentIndex === 4 ? 'active' : 'pending'} 
            />
            <ProgressStep 
              label="Consent & Financial Policy" 
              status={currentIndex > 5 ? 'completed' : currentIndex === 5 ? 'active' : 'pending'} 
            />
            <ProgressStep 
              label="Appointment Confirmed" 
              status={currentIndex > 6 ? 'completed' : currentIndex === 6 ? 'active' : 'pending'} 
            />
          </div>
        </section>

        {/* Channels Available */}
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Channels</h3>
          <div className="flex flex-wrap gap-2">
            <ChannelBadge icon={<Building2 className="h-3 w-3" />} label="Website" active />
            <ChannelBadge icon={<Smartphone className="h-3 w-3" />} label="WhatsApp" />
            <ChannelBadge icon={<Circle className="h-3 w-3" />} label="SMS" />
            <ChannelBadge icon={<MailIcon className="h-3 w-3" />} label="Email" />
          </div>
        </section>

        {/* Compliance */}
        <section className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-[9px] font-black text-teal-500 uppercase tracking-[0.2em] mb-4">Security Protocol</h3>
          <div className="space-y-3">
             <ComplianceRow label="HIPAA BAA" value="Signed" type="success" />
             <ComplianceRow label="Encryption" value="AES-256" type="success" />
             <ComplianceRow label="Transport" value="TLS 1.3" type="success" />
             <ComplianceRow label="Audit Log" value="Active" type="success" />
          </div>
        </section>

      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-[11px]">
      <div className="flex items-center gap-2 text-slate-400 font-semibold">
        {icon}
        <span className="uppercase tracking-wider opacity-60">{label}</span>
      </div>
      <div className="text-right text-slate-700 font-bold">
        {value}
      </div>
    </div>
  );
}

function ProgressStep({ label, status }: { label: string, status: 'completed' | 'active' | 'pending' }) {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  return (
    <div className="relative group flex items-start text-sm">
      {/* Indicator Circle */}
      <div className="absolute -left-[41.5px] mt-0.5 flex items-center justify-center">
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all duration-300
          ${isCompleted ? 'bg-teal-500 shadow-lg shadow-teal-500/30' : isActive ? 'bg-white border-2 border-teal-500 ring-4 ring-teal-500/10' : 'bg-white border-2 border-slate-200'}
        `}>
          {isCompleted && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
          {isActive && (
            <motion.div 
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1.5 h-1.5 rounded-full bg-teal-500" 
            />
          )}
          {!isCompleted && !isActive && <div className="w-1 h-1 rounded-full bg-slate-200" />}
        </div>
      </div>

      <div className="flex flex-col">
          <span className={`
            font-bold tracking-tight transition-all duration-300
            ${isCompleted ? 'text-slate-400 line-through decoration-slate-300/50' : isActive ? 'text-slate-900 text-[15px]' : 'text-slate-300'}
          `}>
            {label}
          </span>
          {isActive && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-black text-teal-500 uppercase tracking-widest mt-1"
            >
              In Progress
            </motion.span>
          )}
      </div>
    </div>
  );
}

function ChannelBadge({ icon, label, active }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all
      ${active ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20' : 'bg-slate-50 text-slate-400 border border-transparent'}`}>
      {icon}
      <span className="uppercase tracking-wider">{label}</span>
    </div>
  );
}

function ComplianceRow({ label, value, type }: { label: string, value: string, type: 'success' | 'blue' | 'warning' | 'neutral' }) {
  return (
    <div className="flex justify-between items-center text-[10px]">
      <span className="text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      <span className={`px-2 py-0.5 rounded-md font-black text-[9px] tracking-widest uppercase bg-teal-500/20 text-teal-400`}>
        {value}
      </span>
    </div>
  );
}
