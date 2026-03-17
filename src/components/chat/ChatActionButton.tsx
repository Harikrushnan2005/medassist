import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatActionButtonProps {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export function ChatActionButton({
  variant = "primary",
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: ChatActionButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", duration: 0.4, bounce: 0 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-[44px] rounded-[10px] px-4 py-2.5 text-[15px] font-medium tracking-[0.01em]",
        "transition-[box-shadow,background-color] duration-150 ease-out",
        "will-change-transform",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:shadow-[0_4px_8px_-2px_rgba(0,0,0,.1),0_2px_4px_-2px_rgba(0,0,0,.06)]",
        variant === "secondary" &&
          "bg-muted text-muted-foreground hover:shadow-[0_4px_8px_-2px_rgba(0,0,0,.1),0_2px_4px_-2px_rgba(0,0,0,.06)]",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
