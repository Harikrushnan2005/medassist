import { Calendar, FileText, Shield, CreditCard, Image as ImageIcon, FilePlus, Activity, ShieldCheck, Users, MessageSquare } from "lucide-react";

export function PatientSidebar({ onAction }: { onAction?: (action: string) => void }) {
  return (
    <div className="flex flex-col h-full w-[280px] bg-[#1a1b26] text-slate-300 shadow-xl z-20 shrink-0 border-r border-[#24283b] overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center gap-3 p-6 mb-2">
        <div className="bg-teal-500 rounded-lg p-2 flex items-center justify-center">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-lg text-white">MedAssist</span>
          <span className="text-[10px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">24/7</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button onClick={() => onAction && onAction("Patient Chat")} className="w-full bg-[#16161e] border border-[#292e42] text-teal-400 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#292e42]/50 transition-colors shadow-inner text-sm">
          Patient Chat
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 py-6 px-4">
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">Patient Services</h3>
          <nav className="space-y-1">
            <NavItem icon={<Calendar className="h-4 w-4" />} label="Schedule Visit" active onClick={() => onAction && onAction("Schedule Visit")} />
            <NavItem icon={<FileText className="h-4 w-4" />} label="Consent Forms" badge="3" badgeColor="bg-red-500" onClick={() => onAction && onAction("Consent Forms")} />
            <NavItem icon={<Shield className="h-4 w-4" />} label="Insurance & Cost" onClick={() => onAction && onAction("Insurance & Cost")} />
            <NavItem icon={<Users className="h-4 w-4" />} label="Doctor Availability" onClick={() => onAction && onAction("Doctor Availability")} />
            <NavItem icon={<CreditCard className="h-4 w-4" />} label="Pay Bill" onClick={() => onAction && onAction("Pay Bill")} />
            <NavItem icon={<ImageIcon className="h-4 w-4" />} label="Upload ID / Card" onClick={() => onAction && onAction("Upload ID / Card")} />
            <NavItem icon={<FilePlus className="h-4 w-4" />} label="Pre-Visit Form" onClick={() => onAction && onAction("Pre-Visit Form")} />
            <NavItem icon={<Activity className="h-4 w-4" />} label="PA Status" onClick={() => onAction && onAction("PA Status")} />
          </nav>
        </div>
      </div>

      {/* Footer Profile */}
      <div className="p-4 mt-auto border-t border-[#292e42]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#16161e] border border-[#292e42] hover:bg-[#292e42]/50 transition-colors cursor-pointer">
          <div className="h-8 w-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center relative">
            <Users className="h-4 w-4" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-[#16161e]"></span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">Guest Patient</p>
            <p className="text-xs text-slate-500 truncate">Sunrise Family Medical</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, badge, badgeColor = "bg-teal-500", onClick }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string, badgeColor?: string, onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${active ? 'bg-teal-500/10 text-teal-400 font-medium' : 'hover:bg-[#292e42]/40 hover:text-white'}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {badge && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
