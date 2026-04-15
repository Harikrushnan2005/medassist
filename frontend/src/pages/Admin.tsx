import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Calendar, 
  Shield, 
  CreditCard, 
  Activity, 
  ArrowRight, 
  Search, 
  MoreHorizontal, 
  MessageSquare,
  TrendingUp,
  LayoutDashboard,
  CheckCircle2,
  XSquare,
  ShieldCheck,
  FileCheck,
  LogOut,
  ChevronDown
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ProviderRulesDashboard, BAAComplianceDashboard, ConsentFormDashboard } from "@/components/chat/AdminDashboards";
import { API_BASE } from "@/services/api";

const ADMIN_STORAGE_KEY = "medassist_admin_token";

function AdminPortal({ nested = false }: { nested?: boolean }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // LIVE CHAT STATES
  const [activeRooms, setActiveRooms] = useState<string[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{sender: string, content: string}[]>([]);
  const [draftMsg, setDraftMsg] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard-stats?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setIsAuthenticated(true);
        fetchAppointments(token);
      } else {
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
      }
    } catch (err) {
      console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Poll for live chat rooms
    useEffect(() => {
      if (activeTab === "live_chat" && isAuthenticated) {
        const fetchRooms = async () => {
          try {
            const res = await fetch(`${API_BASE}/chat/rooms`);
            if (res.ok) {
              const data = await res.json();
              setActiveRooms(data.rooms);
            }
          } catch(e) {}
        };
        fetchRooms();
        const interval = setInterval(fetchRooms, 3000);
        return () => clearInterval(interval);
      }
    }, [activeTab, isAuthenticated]);

    // Setup active room WebSocket
    useEffect(() => {
      if (currentRoom) {
        setChatMessages([]);
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const urlHost = API_BASE.startsWith('http') ? new URL(API_BASE).host : window.location.host;
        const wsUrl = `${protocol}//${urlHost}/api/chat/ws/${currentRoom}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setChatMessages(prev => [...prev, data]);
          } catch {
             if (typeof event.data === "string" && !event.data.includes('"sender":"staff"')) {
                setChatMessages(prev => [...prev, { sender: "patient", content: event.data }]);
             }
          }
        };
        
        return () => ws.close();
      }
    }, [currentRoom]);

    const sendStaffMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!draftMsg.trim() || !wsRef.current) return;
      
      wsRef.current.send(JSON.stringify({ sender: "staff", content: draftMsg }));
      setDraftMsg("");
    };

    const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, data.token);
        verifyToken(data.token);
      } else {
        setError("Invalid administrator password");
      }
    } catch (err) {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/appointments?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    const token = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    try {
      const res = await fetch(`${API_BASE}/admin/appointments/${id}/status?status=${status}&token=${token}`, {
        method: "POST"
      });
      if (res.ok) {
        fetchAppointments(token!);
        verifyToken(token!);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAppointments = appointments.filter(a => 
    a.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.provider_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0a0b0f] flex items-center justify-center">
        <Activity className="h-8 w-8 text-teal-500 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-slate-900/50 to-slate-950">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#16161e] border border-[#292e42] rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 bg-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-500/20">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Practice Administrator</h1>
            <p className="text-slate-500 text-sm">Sunrise Family Medical Security Gateway</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Access Token</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full bg-[#1c1c24] border border-[#292e42] rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 transition-all font-mono"
                placeholder="••••••••••••"
              />
            </div>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs font-semibold bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                {error}
              </motion.p>
            )}
            <button className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] flex items-center justify-center gap-2">
              Enter Administrative Portal <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-8 text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Protected by MedAssist Sentinel Security
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`${nested ? 'bg-transparent' : 'min-h-screen bg-[#0a0b0f]'} text-slate-300 font-sans flex`}>
      {/* Sidebar */}
      {!nested && (
        <aside className="w-64 border-r border-[#1c1c24] hidden lg:flex flex-col bg-[#0d0e14] p-6 shrink-0">
          <div className="flex items-center gap-3 mb-12 ml-2">
            <div className="h-8 w-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">MedAssist <span className="text-teal-500 text-xs uppercase ml-1">Admin</span></span>
          </div>

          <nav className="space-y-2 flex-1">
            <div 
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 ${activeTab === 'dashboard' ? 'bg-teal-500/10 text-teal-400' : 'hover:bg-[#16161e] text-slate-500 hover:text-slate-300'} rounded-xl flex items-center gap-3 font-semibold text-sm transition-colors cursor-pointer`}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </div>
            <div 
              onClick={() => setActiveTab("live_chat")}
              className={`px-4 py-2 ${activeTab === 'live_chat' ? 'bg-teal-500/10 text-teal-400' : 'hover:bg-[#16161e] text-slate-500 hover:text-slate-300'} rounded-xl flex items-center justify-between font-semibold text-sm transition-colors cursor-pointer`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4" /> Live Chats
              </div>
              {activeTab !== "live_chat" && activeRooms.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">{activeRooms.length}</span>
              )}
            </div>
            <div 
              onClick={() => setActiveTab("provider_rules")}
              className={`px-4 py-2 ${activeTab === 'provider_rules' ? 'bg-teal-500/10 text-teal-400' : 'hover:bg-[#16161e] text-slate-500 hover:text-slate-300'} rounded-xl flex items-center gap-3 font-semibold text-sm transition-colors cursor-pointer`}
            >
              <ShieldCheck className="h-4 w-4" /> Provider Rules
            </div>
            <div 
              onClick={() => setActiveTab("baa")}
              className={`px-4 py-2 ${activeTab === 'baa' ? 'bg-teal-500/10 text-teal-400' : 'hover:bg-[#16161e] text-slate-500 hover:text-slate-300'} rounded-xl flex items-center gap-3 font-semibold text-sm transition-colors cursor-pointer`}
            >
              <FileCheck className="h-4 w-4" /> BAA & Compliance
            </div>
            <div 
              onClick={() => setActiveTab("consent_forms")}
              className={`px-4 py-2 ${activeTab === 'consent_forms' ? 'bg-teal-500/10 text-teal-400' : 'hover:bg-[#16161e] text-slate-500 hover:text-slate-300'} rounded-xl flex items-center gap-3 font-semibold text-sm transition-colors cursor-pointer`}
            >
              <FileCheck className="h-4 w-4" /> Consent Forms
            </div>
            <div className="px-4 py-2 hover:bg-[#16161e] text-slate-500 hover:text-slate-300 rounded-xl flex items-center gap-3 font-semibold text-sm transition-colors cursor-pointer">
              <Calendar className="h-4 w-4" /> Schedule
            </div>
            <div className="px-4 py-2 hover:bg-[#16161e] text-slate-500 hover:text-slate-300 rounded-xl flex items-center gap-3 font-semibold text-sm transition-colors cursor-pointer">
              <Users className="h-4 w-4" /> Patients
            </div>
            <div className="px-4 py-2 hover:bg-[#16161e] text-slate-500 hover:text-slate-300 rounded-xl flex items-center gap-3 font-semibold text-sm transition-colors cursor-pointer">
              <CreditCard className="h-4 w-4" /> Billing
            </div>
          </nav>

          <button 
            onClick={() => { sessionStorage.removeItem(ADMIN_STORAGE_KEY); setIsAuthenticated(false); }}
            className="mt-auto px-4 py-3 flex items-center gap-3 text-slate-500 hover:text-red-400 transition-colors font-bold text-xs uppercase tracking-widest"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </aside>
      )}

      {/* Main Column */}
      <main className={`flex-1 ${nested ? 'p-0' : 'p-6 md:p-10'} overflow-y-auto max-h-screen`}>
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-teal-500 font-black uppercase tracking-[0.2em] mb-2">Practice Overview</div>
            <h1 className="text-4xl font-bold text-white tracking-tighter">Clinical Dashboard</h1>
          </div>
          <div className="flex bg-[#16161e] p-1.5 rounded-2xl border border-[#292e42] relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search appointments, patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:outline-none pl-11 pr-6 py-2 text-sm text-white w-full md:w-64"
            />
          </div>
        </header>

        {activeTab === "dashboard" ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard title="Total Bookings" value={stats?.stats.total_bookings} trend="+24%" icon={<Calendar className="text-teal-400" />} />
              <StatCard title="Intake Today" value={stats?.stats.today_bookings} trend="+12%" icon={<Users className="text-amber-400" />} />
              <StatCard title="Total Revenue" value={`$${stats?.stats.revenue?.toLocaleString() || 0}`} trend="+5.2%" icon={<CreditCard className="text-emerald-400" />} />
              <StatCard title="Unique Patients" value={stats?.stats.total_patients} trend="+8%" icon={<Shield className="text-indigo-400" />} />
            </div>

            {/* Appointments Table */}
            <div className="bg-[#16161e] border border-[#292e42] rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="p-6 border-b border-[#24242e] flex items-center justify-between bg-[#1a1a24]/50">
                <h3 className="font-bold text-white text-lg">Live Appointment Feed</h3>
                <button className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 hover:text-white transition-colors">
                  Filter By Provider <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-[#24242e] bg-[#0d0e14]/50">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visit Info</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24242e]">
                    <AnimatePresence>
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-medium">No records found matching your search.</td>
                        </tr>
                      ) : (
                        filteredAppointments.map((appt) => (
                          <motion.tr 
                            key={appt.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-white/[0.02] transition-colors group"
                          >
                            <td className="px-6 py-5">
                              <div className="font-bold text-white">{appt.patient_name}</div>
                              <div className="text-[11px] text-slate-500 font-medium">DOB: {format(parseISO(appt.patient_dob), "MMM d, yyyy")}</div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${appt.visit_type === 'telehealth' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                  {appt.visit_type}
                                </span>
                                <span className="text-[11px] font-bold text-teal-500">{appt.provider_name}</span>
                              </div>
                              <div className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{appt.reason}</div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="text-sm font-bold text-slate-300">{format(parseISO(appt.slot_date), "EEE, MMM d")}</div>
                              <div className="text-xs text-slate-500 font-medium">{format(parseISO(`1970-01-01T${appt.slot_time}`), "h:mm a")}</div>
                            </td>
                            <td className="px-6 py-5">
                              <StatusBadge status={appt.status} />
                            </td>
                            <td className="px-6 py-5">
                              <div className={`text-sm font-bold ${appt.payment_status === 'paid' ? 'text-green-400' : 'text-amber-400/70'}`}>
                                ${appt.price}
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-tighter opacity-50">{appt.payment_status}</div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {appt.status !== 'cancelled' && (
                                  <button 
                                    onClick={() => updateStatus(appt.id, 'cancelled')}
                                    className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors tooltip" title="Cancel Appointment"
                                  >
                                    <XSquare className="h-4 w-4" />
                                  </button>
                                )}
                                {appt.status === 'scheduled' && (
                                  <button 
                                    onClick={() => updateStatus(appt.id, 'completed')}
                                    className="p-2 hover:bg-teal-500/10 text-slate-500 hover:text-teal-400 rounded-lg transition-colors" title="Mark Completed"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                )}
                                <button className="p-2 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : activeTab === "live_chat" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
             {/* Left Panel: Queues */}
             <div className="md:col-span-1 bg-[#16161e] border border-[#292e42] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-[#24242e] flex items-center justify-between bg-[#1a1a24]/50">
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-teal-500" />
                    Waiting Queue
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                   {activeRooms.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                        <MessageSquare className="h-12 w-12 mb-4" />
                        <p className="text-sm font-semibold">No patients waiting</p>
                      </div>
                   ) : activeRooms.map(room => (
                      <div 
                         key={room} 
                         onClick={() => setCurrentRoom(room)}
                         className={`p-4 rounded-2xl cursor-pointer border transition-colors ${currentRoom === room ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-[#1c1c24] border-transparent text-slate-300 hover:border-[#292e42]'}`}
                      >
                         <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">Patient Session</span>
                            <span className="text-[10px] bg-red-500/20 text-red-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                         </div>
                         <div className="text-[11px] text-slate-500 mt-1 font-mono">{room}</div>
                      </div>
                   ))}
                </div>
             </div>
             
             {/* Right Panel: Chat Room */}
             <div className="md:col-span-2 bg-[#16161e] border border-[#292e42] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
                {currentRoom ? (
                   <>
                      <div className="p-6 border-b border-[#24242e] flex items-center justify-between bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-[#1a1a24] to-[#1a1a24]">
                        <h3 className="font-bold text-white text-lg">Direct Connection</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-teal-500 bg-teal-500/10 px-3 py-1 rounded-full flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span> Connected
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/20">
                         {chatMessages.length === 0 ? (
                            <div className="flex h-full items-center justify-center opacity-30 text-slate-400 font-medium text-sm">
                               Connection established. Waiting for messages...
                            </div>
                         ) : (
                            chatMessages.map((msg, i) => (
                               <div key={i} className={`flex ${msg.sender === 'staff' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[70%] p-4 rounded-3xl ${msg.sender === 'staff' ? 'bg-teal-500 text-slate-950 rounded-tr-none' : 'bg-[#24242e] text-white rounded-tl-none border border-[#292e42]'}`}>
                                     <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${msg.sender === 'staff' ? 'text-teal-950/50' : 'text-slate-500'}`}>
                                        {msg.sender === 'staff' ? 'You' : 'Patient'}
                                     </div>
                                     <p className="text-sm font-medium">{msg.content}</p>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                      <form onSubmit={sendStaffMessage} className="p-4 border-t border-[#292e42] bg-[#16161e]">
                         <div className="flex relative">
                            <input 
                               type="text" 
                               value={draftMsg}
                               onChange={(e) => setDraftMsg(e.target.value)}
                               placeholder="Type a message to the patient..."
                               className="w-full bg-[#1c1c24] border border-[#292e42] rounded-2xl py-4 pl-4 pr-16 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                            />
                            <button type="submit" className="absolute right-2 top-2 bottom-2 bg-teal-500 hover:bg-teal-400 text-teal-950 p-2 rounded-xl transition-colors">
                               <ArrowRight className="h-5 w-5" />
                            </button>
                         </div>
                      </form>
                   </>
                ) : (
                   <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <Shield className="h-16 w-16 mb-4 opacity-20" />
                      <p className="font-medium">Select a patient queue from the left to join.</p>
                   </div>
                )}
             </div>
          </div>
        ) : activeTab === "provider_rules" ? (
          <div className="bg-[#16161e] border border-[#292e42] rounded-3xl p-8 overflow-y-auto max-h-[80vh]">
             <ProviderRulesDashboard />
          </div>
        ) : activeTab === "consent_forms" ? (
          <div className="bg-[#16161e] border border-[#292e42] rounded-3xl p-8 overflow-y-auto max-h-[80vh]">
             <ConsentFormDashboard />
          </div>
        ) : (
          <div className="bg-[#16161e] border border-[#292e42] rounded-3xl p-8 overflow-y-auto max-h-[80vh]">
             <BAAComplianceDashboard />
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, trend, icon }: any) {
  return (
    <div className="bg-[#16161e] border border-[#292e42] rounded-3xl p-6 relative overflow-hidden group hover:border-[#383d52] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-[#1a1b26] rounded-2xl border border-[#292e42] group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/10">
          <TrendingUp className="h-3 w-3" /> {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-white tracking-tight">{value}</h4>
      </div>
      <div className="absolute -bottom-2 -right-2 opacity-[0.02] group-hover:opacity-10 transition-opacity">
        <LayoutDashboard className="h-32 w-32" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    scheduled: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
    rescheduled: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    completed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  
  return (
    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${styles[status] || styles.scheduled}`}>
      {status}
    </span>
  );
}

export default AdminPortal;
