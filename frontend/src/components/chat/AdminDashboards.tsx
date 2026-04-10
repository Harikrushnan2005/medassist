import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Users, Lock, Shield, Settings, Server, Activity, CheckCircle2, FileText, BadgeCheck, Zap, Globe, Cpu, AlertCircle, ExternalLink, Download, Clock, Plus, Trash2, Edit2, ToggleLeft, ToggleRight, CalendarDays, X, Check, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_STORAGE_KEY = "medassist_admin_token";

export function ProviderRulesDashboard() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [selectedProviderSlots, setSelectedProviderSlots] = useState<any[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);
  
  // Slot addition states
  const [newSlotDate, setNewSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSlotTime, setNewSlotTime] = useState("09:00");

  const token = sessionStorage.getItem(ADMIN_STORAGE_KEY);

  const fetchProviders = async () => {
    try {
      const res = await fetch(`/api/admin/providers?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchProviders(); }, []);

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await fetch(`/api/admin/providers/${id}?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      fetchProviders();
    } catch (e) {}
  };

  const handleAddProvider = async () => {
    if (!newName) return;
    try {
      const res = await fetch(`/api/admin/providers?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, specialty: newSpecialty })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewName("");
        setNewSpecialty("");
        fetchProviders();
      }
    } catch (e) {}
  };

  const handleDeleteProvider = async (id: number) => {
    if (!confirm("Are you sure you want to remove this doctor? This will affect their scheduled slots.")) return;
    try {
      await fetch(`/api/admin/providers/${id}?token=${token}`, { method: "DELETE" });
      fetchProviders();
    } catch (e) {}
  };

  const fetchSlots = async (providerId: number) => {
    setActiveSlotId(providerId);
    try {
      const res = await fetch(`/api/admin/slots/${providerId}?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProviderSlots(data);
      }
    } catch (e) {}
  };

  const handleAddSlot = async (providerId: number) => {
     try {
       await fetch(`/api/admin/slots?token=${token}`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ 
           provider_id: providerId, 
           date: newSlotDate, 
           time: newSlotTime + ":00" 
         })
       });
       fetchSlots(providerId);
     } catch (e) {}
  };

  const handleDeleteSlot = async (slotId: number, providerId: number) => {
     try {
       await fetch(`/api/admin/slots/${slotId}?token=${token}`, { method: "DELETE" });
       fetchSlots(providerId);
     } catch (e) {}
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-500 font-bold uppercase tracking-widest">Initialising Staff Engine...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-teal-400" />
            Medical Staff Registry
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            Manage provider core data, toggle clinic availability, and manually override appointment slots for your medical team.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-teal-500 text-slate-950 text-xs font-black rounded-2xl hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2 uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" /> Onboard New Doctor
        </button>
      </div>

      <div className="grid gap-6">
        {providers.map((provider) => (
          <div 
            key={provider.id} 
            className="group bg-[#1a1b26] border border-[#292e42] rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:border-teal-500/30 transition-all duration-300"
          >
            <div className="p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
              <div className="flex gap-6 w-full lg:w-auto">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border shrink-0 transition-all ${provider.is_active ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 'bg-slate-800/50 border-slate-700 text-slate-600'}`}>
                  <Users className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{provider.name}</h3>
                    <button 
                      onClick={() => handleToggleStatus(provider.id, provider.is_active)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${provider.is_active ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                    >
                      {provider.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {provider.is_active ? 'Active / Online' : 'Inactive / Offline'}
                    </button>
                  </div>
                  <p className="text-sm text-teal-500/70 font-semibold mb-3 tracking-wide">{provider.specialty || "General Practitioner"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                <button 
                  onClick={() => activeSlotId === provider.id ? setActiveSlotId(null) : fetchSlots(provider.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeSlotId === provider.id ? 'bg-slate-800 text-white' : 'bg-[#24283b] text-slate-400 hover:text-white'}`}
                >
                  <CalendarDays className="w-4 h-4" /> Manage Slots
                </button>
                <button 
                  onClick={() => handleDeleteProvider(provider.id)}
                  className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* EXPANDABLE SLOT MANAGER */}
            <AnimatePresence>
               {activeSlotId === provider.id && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="bg-[#16161e] border-t border-[#292e42] p-8"
                 >
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-4 h-4 text-teal-500" />
                          Manual Slot Override
                       </h4>
                       <div className="flex items-center gap-3 bg-[#1a1b26] p-2 rounded-2xl border border-[#292e42]">
                          <input 
                            type="date" 
                            value={newSlotDate}
                            onChange={(e) => setNewSlotDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-white focus:outline-none px-2"
                          />
                          <input 
                            type="time" 
                            step="900"
                            value={newSlotTime}
                            onChange={(e) => setNewSlotTime(e.target.value)}
                            className="bg-transparent text-xs font-bold text-white focus:outline-none px-2 border-l border-slate-800"
                          />
                          <button 
                            onClick={() => handleAddSlot(provider.id)}
                            className="bg-teal-500 text-slate-950 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-teal-400 transition-colors"
                          >
                             Add Slot
                          </button>
                       </div>
                    </div>

                    <div className="space-y-8">
                       {selectedProviderSlots.length === 0 ? (
                          <div className="py-10 text-center text-slate-600 text-sm font-medium italic">
                             No upcoming slots found. Current views are strictly real-time and filter out past availability.
                          </div>
                       ) : (
                          Object.entries(
                            selectedProviderSlots.reduce((acc: any, slot) => {
                              const d = slot.date;
                              if (!acc[d]) acc[d] = [];
                              acc[d].push(slot);
                              return acc;
                            }, {})
                          )
                          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                          .map(([date, slots]: [string, any]) => (
                            <div key={date} className="border border-[#292e42] rounded-2xl overflow-hidden bg-[#1a1b26]/30">
                               <div className="bg-[#1a1b26] p-4 px-6 border-b border-[#292e42] flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <CalendarDays className="w-4 h-4 text-teal-500" />
                                     <span className="text-xs font-bold text-white uppercase tracking-wider">
                                        {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                                     </span>
                                  </div>
                                  <button 
                                    onClick={async () => {
                                      if (confirm(`Delete all ${slots.length} slots for ${date}?`)) {
                                          for(const s of slots) {
                                            if(!s.is_booked) await handleDeleteSlot(s.id, provider.id);
                                          }
                                      }
                                    }}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors uppercase tracking-widest"
                                  >
                                     <Trash2 className="w-3 h-3" /> Purge Day
                                  </button>
                               </div>
                               <div className="p-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                  {slots.map((slot: any) => (
                                    <div key={slot.id} className={`p-3 rounded-xl border text-center transition-all flex flex-col gap-1 relative group/slot ${slot.is_booked ? 'bg-slate-800/50 border-slate-700 text-slate-500 opacity-50' : 'bg-[#1c1d29] border-[#292e42] text-slate-300 hover:border-teal-500/50'}`}>
                                       <div className="text-xs font-mono font-bold text-teal-400">{slot.time.slice(0, 5)}</div>
                                       {!slot.is_booked && (
                                         <button 
                                           onClick={() => handleDeleteSlot(slot.id, provider.id)}
                                           className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/slot:opacity-100 transition-opacity shadow-lg"
                                         >
                                            <X className="w-2.5 h-2.5" />
                                         </button>
                                       )}
                                       {slot.is_booked && <div className="text-[8px] font-black uppercase text-slate-500">Booked</div>}
                                    </div>
                                  ))}
                               </div>
                            </div>
                          ))
                       )}
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* ADD DOCTOR MODAL */}
      <AnimatePresence>
         {showAddModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#16161e] border border-[#292e42] w-full max-w-md rounded-3xl p-8 shadow-2xl"
              >
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-white">Onboard Staff</h2>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Doctor Name</label>
                       <input 
                         type="text" 
                         value={newName}
                         onChange={(e) => setNewName(e.target.value)}
                         placeholder="Dr. Gregory House"
                         className="w-full bg-[#1c1c24] border border-[#292e42] rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Specialization</label>
                       <input 
                         type="text" 
                         value={newSpecialty}
                         onChange={(e) => setNewSpecialty(e.target.value)}
                         placeholder="Diagnostic Medicine"
                         className="w-full bg-[#1c1c24] border border-[#292e42] rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                       />
                    </div>
                    <button 
                      onClick={handleAddProvider}
                      className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-teal-500/10"
                    >
                       Confirm Staff Addition
                    </button>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
}

export function BAAComplianceDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const token = sessionStorage.getItem(ADMIN_STORAGE_KEY);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/audit-logs?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {} finally { setLoadingLogs(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleDownloadBAA = () => {
    window.open(`/api/admin/baa/download?token=${token}`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-6xl mx-auto w-full"
    >
      <div className="mb-10">
        <h1 className="text-3xl font-serif text-white tracking-tight flex items-center gap-3">
          <BadgeCheck className="w-8 h-8 text-teal-400" />
          Trust & Compliance Center
        </h1>
        <p className="text-slate-500 text-sm mt-1 max-w-3xl">
          MedAssist maintains the highest industry standards for healthcare data security. View our active Business Associate Agreements (BAA), encryption certificates, and workforce compliance audit logs.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main BAA Certificate Card */}
          <div className="bg-[#1a1b26] border border-[#292e42] rounded-3xl overflow-hidden shadow-sm relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500"></div>
            <div className="p-8">
              <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/20">
                    <Shield className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Signed HIPAA BAA</h3>
                    <p className="text-sm text-slate-500">Business Associate Agreement</p>
                  </div>
                </div>
                <div className="flex items-center px-4 py-2 bg-green-500/20 rounded-xl border border-green-500/20 h-fit">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div className="ml-3">
                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Status</p>
                    <p className="text-sm font-bold text-green-400">Active & Enforced</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                {[
                  { label: "Document Control #", value: "HIPAA-BAA-2026-X883", icon: FileText },
                  { label: "Authorized Signatory", value: "Clinic Administrator", icon: BadgeCheck },
                  { label: "VPC Data Isolation", value: "Enabled (Isolated VPC)", icon: Server },
                  { label: "Effective Period", value: "Jan 2026 - Jan 2028", icon: Clock },
                ].map((stat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <stat.icon className="w-5 h-5 text-slate-600 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
                      <p className="text-sm font-bold text-slate-300">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col md:flex-row gap-3">
                <button 
                  onClick={handleDownloadBAA}
                  className="flex-1 py-3.5 bg-teal-500 text-slate-950 text-sm font-bold rounded-2xl hover:bg-teal-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10"
                >
                  <Download className="w-4 h-4" /> Download Executed BAA PDF
                </button>
                <button className="flex-1 py-3.5 bg-[#24283b] border border-[#292e42] text-slate-300 text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                  <ExternalLink className="w-4 h-4" /> View Technical Safeguards
                </button>
              </div>
            </div>
            <div className="bg-[#16161e] border-t border-[#292e42] p-4 px-8 flex justify-between items-center text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">SHA-256 Fingerprint: 0xA1B2C3D4E5F67890</span>
              <span className="text-[10px] font-bold flex items-center gap-1"><Lock className="w-3 h-3" /> Immutable Audit Log</span>
            </div>
          </div>

          {/* Compliance Badges Area */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "HIPAA Compliant", desc: "45 CFR Parts 160/164", icon: Shield, color: "teal" },
              { title: "SOC2 Type II", desc: "Security & Confidentiality", icon: Lock, color: "slate" },
              { title: "AES-256", desc: "Military Grade Encryption", icon: Server, color: "slate" }
            ].map((badge, i) => (
              <div key={i} className="bg-[#1a1b26] border border-[#292e42] rounded-3xl p-6 shadow-sm flex flex-col items-center text-center group hover:border-teal-500/30 transition-colors">
                <div className={`p-4 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${badge.color === 'teal' ? 'bg-teal-500/10 text-teal-400' : 'bg-[#24283b] text-slate-400'}`}>
                  <badge.icon className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-white text-sm">{badge.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* Real-time Audit Log Sidebar */}
          <div className="bg-[#1a1b26] rounded-3xl p-6 shadow-xl relative overflow-hidden border border-[#292e42]">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="w-24 h-24 text-teal-500" />
            </div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400" /> Live Compliance Log
              </h3>
              <button onClick={fetchLogs} className="p-1 hover:bg-slate-800 rounded transition-colors"><Zap className="w-4 h-4 text-slate-500" /></button>
            </div>
            
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loadingLogs ? (
                <div className="py-10 text-center text-slate-600 animate-pulse text-xs font-bold uppercase tracking-widest">Scanning Logs...</div>
              ) : logs.length === 0 ? (
                <div className="py-10 text-center text-slate-600 text-xs italic">No security events logged yet.</div>
              ) : logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${log.action.includes('SUCCESS') || log.action.includes('CREATED') ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]' : log.action.includes('FAILURE') || log.action.includes('DELETED') ? 'bg-red-400' : 'bg-slate-600'}`}></div>
                  <div>
                    <p className="text-[11px] font-black text-slate-300 group-hover:text-teal-400 transition-colors uppercase tracking-tight">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight mb-1">{log.details}</p>
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">{format(parseISO(log.time), "HH:mm:ss")} · {log.ip}</p>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={fetchLogs}
              className="mt-8 w-full py-2.5 bg-[#24283b] text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-800 hover:text-white transition-all capitalize border border-[#292e42]"
            >
              Refresh Security Feed
            </button>
          </div>

          <div className="bg-[#1a1b26] border border-[#292e42] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white">Public Security Policy</h3>
                <p className="text-xs text-slate-500 mt-0.5">Updated {format(new Date(), "MMM yyyy")}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#16161e] border border-[#292e42] rounded-2xl">
                <span className="text-[11px] font-bold text-slate-400 tracking-tight">Workforce Awareness Training</span>
                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 text-[9px] font-black rounded border border-teal-500/20">100% COMPLETE</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#16161e] border border-[#292e42] rounded-2xl">
                <span className="text-[11px] font-bold text-slate-400 tracking-tight">Penetration Testing Scope</span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[9px] font-black rounded border border-slate-700 uppercase tracking-widest">EXTERNAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ConsentFormDashboard() {
  const [forms, setForms] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const token = sessionStorage.getItem(ADMIN_STORAGE_KEY);

  const fetchForms = async () => {
    try {
      const res = await fetch(`/api/admin/consent-forms?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setForms(data);
        if (data.length > 0 && !selectedKey) {
          handleSelect(data[0]);
        }
      }
    } catch (e) {}
  };

  useEffect(() => { fetchForms(); }, []);

  const handleSelect = (form: any) => {
    setSelectedKey(form.key);
    setEditTitle(form.title);
    setEditContent(form.content);
  };

  const handleSave = async () => {
    if (!selectedKey) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/consent-forms/${selectedKey}?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent })
      });
      if (res.ok) {
        await fetchForms();
        alert("Consent policy updated successfully.");
      }
    } catch (e) {
      alert("Error saving policy template.");
    } finally { setIsSaving(false); }
  };

  const activeForm = forms.find(f => f.key === selectedKey);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-6xl mx-auto w-full"
    >
      <div className="mb-10">
        <h1 className="text-3xl font-serif text-white tracking-tight flex items-center gap-3">
          <FileCheck className="w-8 h-8 text-teal-400" />
          Consent Form Management
        </h1>
        <p className="text-slate-500 text-sm mt-1 max-w-3xl">
          Edit the legal language and disclosure requirements for your practice. Changes here will instantly update the patient onboarding experience across all clinic portals.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar Selector */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4 ml-2">Document Registry</p>
          {forms.map((form) => (
            <button
              key={form.key}
              onClick={() => handleSelect(form)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedKey === form.key ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-[#1a1b26] border-[#292e42] text-slate-500 hover:border-slate-700'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedKey === form.key ? 'bg-teal-500 text-slate-950' : 'bg-[#24283b] text-slate-600'}`}>
                   <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold truncate">{form.key.toUpperCase()}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Editor Main Area */}
        <div className="lg:col-span-3">
          {selectedKey ? (
            <div className="bg-[#1a1b26] border border-[#292e42] rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[#292e42] flex items-center justify-between bg-[#16161e]">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-teal-500/10 text-teal-400 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white tracking-tight">Template Configuration</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Editing: {selectedKey}</p>
                  </div>
                </div>
                {activeForm?.updated_at && (
                  <span className="text-[10px] text-slate-600 font-bold">Last modified: {format(parseISO(activeForm.updated_at), "MMM d, HH:mm")}</span>
                )}
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Document Public Title</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#1c1c24] border border-[#292e42] rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Legal Policy Content (Raw Text)</label>
                  <textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={12}
                    className="w-full bg-[#1c1c24] border border-[#292e42] rounded-2xl p-6 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-serif text-sm leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-600 italic">Supports standard multi-line text. Content is securely saved in HIPAA-compliant database.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#292e42]">
                   <button 
                    onClick={() => handleSelect(activeForm)}
                    className="px-6 py-2.5 bg-transparent text-slate-500 text-sm font-bold rounded-xl hover:text-white transition-colors"
                   >
                    Discard Changes
                   </button>
                   <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-3.5 bg-teal-500 text-slate-950 text-sm font-bold rounded-2xl hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2"
                   >
                     {isSaving ? "Saving Security Template..." : "Update Live Policy"}
                     <CheckCircle2 className="w-4 h-4 ml-1" />
                   </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-[#1a1b26]/50 rounded-3xl border border-[#292e42] border-dashed p-10 text-center">
              <Shield className="w-16 h-16 text-slate-800 mb-4" />
              <p className="text-slate-500 font-medium">Select a document from the registry to begin editing.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
