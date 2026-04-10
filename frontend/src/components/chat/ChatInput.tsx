import { useState } from "react";
import { Send, Paperclip, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ onSend, placeholder = "Type a message...", disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-1.5"
    >
      <div className="flex items-center gap-1.5 px-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent px-3 py-3.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
          )}
        />
        
        {/* Prototype visual elements */}
        <button type="button" className="p-2.5 text-slate-400 hover:text-teal-600 transition-colors disabled:opacity-50">
          <Paperclip className="h-[18px] w-[18px]" />
        </button>
        <button type="button" className="p-2.5 text-slate-400 hover:text-teal-600 transition-colors disabled:opacity-50 mr-1">
          <Mic className="h-[18px] w-[18px]" />
        </button>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={!value.trim() || disabled}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            "bg-teal-500 text-white shadow-md shadow-teal-500/20",
            "transition-all duration-150 ease-out",
            "hover:bg-teal-600",
            "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:bg-slate-100 disabled:text-slate-400"
          )}
        >
          <Send className="h-4 w-4 ml-0.5" />
        </motion.button>
      </div>
    </form>
  );
}
