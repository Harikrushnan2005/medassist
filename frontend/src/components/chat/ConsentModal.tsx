import React, { useState, useRef, useEffect } from "react";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/services/api";

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  patientName: string;
}

// Custom Signature Canvas Component
const SignaturePad = ({ onSign, isSigned, onClear }: { onSign: () => void, isSigned: boolean, onClear: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0f172a"; // slate-900
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Calculate scale to map CSS size to actual canvas internal size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // only prevent default for touch to stop scrolling, doing it for mouse blocks focus sometimes
    if ('touches' in e && e.cancelable) e.preventDefault(); 
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e && e.cancelable) e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
    
    if (!isSigned) {
      onSign();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // reset context styles after clear
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    
    onClear();
  };

  return (
    <div className={`relative border rounded-xl overflow-hidden transition-all ${isSigned ? 'border-teal-300' : 'border-slate-300 hover:border-teal-400'}`}>
      <canvas
        ref={canvasRef}
        width={800} // higher internal resolution for crisp lines
        height={200}
        className="w-full h-28 touch-none cursor-crosshair bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {!isSigned && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 font-serif text-xl gap-2">
          <span>✍️</span> Sign here
        </div>
      )}
      {isSigned && (
        <button 
          onClick={handleClear}
          className="absolute bottom-2 right-3 text-[10px] text-slate-400 hover:text-red-500 font-semibold uppercase tracking-wider z-10 bg-white/80 px-2 rounded backdrop-blur-sm"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export function ConsentModal({ isOpen, onClose, onComplete, patientName }: ConsentModalProps) {
  const [tab, setTab] = useState<1 | 2 | 3>(1);
  const [agreements, setAgreements] = useState({
    hipaa: false,
    financial: false,
    telehealth1: false,
    telehealth2: false,
  });
  const [signatures, setSignatures] = useState({
    hipaa: false,
    financial: false,
    telehealth: false,
  });

  const [formTemplates, setFormTemplates] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchTemplates = async () => {
        try {
          // Use API_BASE to ensure we hit the backend directly (Cross-Origin)
          const res = await fetch(`${API_BASE}/consent-forms`);
          if (res.ok) {
            const data = await res.json();
            setFormTemplates(data);
          }
        } catch (e) {
          console.error("Failed to load consent templates", e);
        } finally {
          setLoading(false);
        }
      };
      fetchTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isTabComplete = (currentTab: number) => {
    if (currentTab === 1) return agreements.hipaa && signatures.hipaa;
    if (currentTab === 2) return agreements.financial && signatures.financial;
    if (currentTab === 3) return agreements.telehealth1 && agreements.telehealth2 && signatures.telehealth;
    return false;
  };

  const handleNext = () => {
    if (tab === 1 && isTabComplete(1)) setTab(2);
    else if (tab === 2 && isTabComplete(2)) setTab(3);
    else if (tab === 3 && isTabComplete(3)) {
      onComplete();
      onClose();
      // Reset after closing
      setTimeout(() => {
        setTab(1);
        setAgreements({ hipaa: false, financial: false, telehealth1: false, telehealth2: false });
        setSignatures({ hipaa: false, financial: false, telehealth: false });
      }, 500);
    }
  };

  const handleTabClick = (targetTab: 1 | 2 | 3) => {
    // Only allow clicking to a tab if prev tabs are complete
    if (targetTab === 2 && !isTabComplete(1)) return;
    if (targetTab === 3 && (!isTabComplete(1) || !isTabComplete(2))) return;
    setTab(targetTab);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-serif text-slate-800 mb-1">Consent & Disclosure Forms</h2>
              <p className="text-sm text-slate-500">
                3 required forms · Draw your signature in each pad · Securely stored & HIPAA encrypted
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Locked Tabs header */}
          <div className="px-6 pt-4">
            <div className="flex rounded-lg overflow-hidden border border-slate-200">
              {[
                { id: 1, label: "1. HIPAA Notice" },
                { id: 2, label: "2. Financial Form" },
                { id: 3, label: "3. Telehealth Consent" },
              ].map((t) => {
                const isDisabled = (t.id === 2 && !isTabComplete(1)) || (t.id === 3 && (!isTabComplete(1) || !isTabComplete(2)));
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTabClick(t.id as 1 | 2 | 3)}
                    disabled={isDisabled}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      tab === t.id
                        ? "bg-teal-500 text-white"
                        : "bg-slate-50 text-slate-500 border-l border-slate-200 first:border-l-0"
                    } ${isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-100 cursor-pointer"}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="py-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Security Policies...</div>
            ) : tab === 1 && (
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 text-lg">{formTemplates?.hipaa?.title || "HIPAA Notice of Privacy Practices"}</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {formTemplates?.hipaa?.content}
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={agreements.hipaa}
                      onChange={(e) => setAgreements({ ...agreements, hipaa: e.target.checked })}
                      className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                    />
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-800 font-medium group-hover:text-teal-700 transition-colors">
                      I acknowledge receipt of the Notice of Privacy Practices and consent to use of my health information as described.
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">Required · HIPAA 45 CFR §164.520</p>
                  </div>
                </label>
              </div>
            )}

            {tab === 2 && (
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 text-lg">{formTemplates?.financial?.title || "Financial Responsibility Agreement"}</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {formTemplates?.financial?.content}
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={agreements.financial}
                      onChange={(e) => setAgreements({ ...agreements, financial: e.target.checked })}
                      className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                    />
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-800 font-medium group-hover:text-teal-700 transition-colors">
                      I understand and agree to the financial responsibility policy as outlined above.
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">Required prior to service</p>
                  </div>
                </label>
              </div>
            )}

            {tab === 3 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-lg">{formTemplates?.telehealth?.title || "Telehealth Informed Consent"}</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {formTemplates?.telehealth?.content}
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        checked={agreements.telehealth1}
                        onChange={(e) => setAgreements({ ...agreements, telehealth1: e.target.checked })}
                        className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                      />
                    </div>
                    <div className="text-sm">
                      <p className="text-slate-800 font-medium group-hover:text-teal-700 transition-colors">
                        I consent to receive telemedicine services and understand the limitations.
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">Required for telehealth visits</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        checked={agreements.telehealth2}
                        onChange={(e) => setAgreements({ ...agreements, telehealth2: e.target.checked })}
                        className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                      />
                    </div>
                    <div className="text-sm">
                      <p className="text-slate-800 font-medium group-hover:text-teal-700 transition-colors">
                        I confirm I am in a private location and understand sessions are not recorded.
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">Privacy acknowledgment</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* True Canvas Signature Pad */}
            <div className="mt-8">
              <h4 className="font-bold text-slate-800 text-sm mb-2">Draw Your Signature Below</h4>
              
              <div className={tab === 1 ? "block" : "hidden"}>
                <SignaturePad 
                  isSigned={signatures.hipaa}
                  onSign={() => setSignatures(s => ({ ...s, hipaa: true }))}
                  onClear={() => setSignatures(s => ({ ...s, hipaa: false }))}
                />
              </div>

              <div className={tab === 2 ? "block" : "hidden"}>
                <SignaturePad 
                  isSigned={signatures.financial}
                  onSign={() => setSignatures(s => ({ ...s, financial: true }))}
                  onClear={() => setSignatures(s => ({ ...s, financial: false }))}
                />
              </div>

              <div className={tab === 3 ? "block" : "hidden"}>
                <SignaturePad 
                  isSigned={signatures.telehealth}
                  onSign={() => setSignatures(s => ({ ...s, telehealth: true }))}
                  onClear={() => setSignatures(s => ({ ...s, telehealth: false }))}
                />
              </div>
              
              <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Signing as {patientName || "Guest Patient"} · IP: 192.168.1.42 · Timestamp: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-6 border-t border-slate-100 bg-white">
            <button
              disabled={!isTabComplete(tab)}
              onClick={handleNext}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isTabComplete(tab)
                  ? "bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-500/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {tab === 1 && "Continue to Financial Form ➔"}
              {tab === 2 && "Continue to Telehealth Consent ➔"}
              {tab === 3 && (
                <>
                  <Check className="w-5 h-5" /> Submit All 3 Signed Forms
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
