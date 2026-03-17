import { useState } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ onSend, placeholder = "Type your message...", disabled }: ChatInputProps) {
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
      className="sticky bottom-0 border-t border-border bg-card/80 backdrop-blur-sm p-2"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground",
            "placeholder:text-muted-foreground",
            "focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-ring/40",
            "transition-all duration-150",
            "disabled:opacity-50"
          )}
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={!value.trim() || disabled}
          className={cn(
            "flex h-[44px] w-[44px] items-center justify-center rounded-[10px]",
            "bg-primary text-primary-foreground",
            "transition-[box-shadow] duration-150 ease-out",
            "hover:shadow-[0_4px_8px_-2px_rgba(0,0,0,.1)]",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <Send className="h-5 w-5" />
        </motion.button>
      </div>
    </form>
  );
}
