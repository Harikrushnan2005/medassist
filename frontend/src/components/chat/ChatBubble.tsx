import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";

interface ChatBubbleProps {
  variant: "bot" | "user";
  children: ReactNode;
  className?: string;
}

const bubbleVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 },
};

const spring = { type: "spring" as const, duration: 0.5, bounce: 0 };

export const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ variant, children, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={bubbleVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={spring}
        className={cn(
          "max-w-[85%] px-4 py-3 text-base leading-relaxed",
          "[text-wrap:pretty]",
          variant === "bot" && "self-start rounded-[18px] rounded-bl bg-muted text-foreground shadow-[var(--chat-shadow)]",
          variant === "user" && "self-end rounded-[18px] rounded-br bg-primary text-primary-foreground shadow-[var(--chat-shadow)]",
          className
        )}
      >
        {children}
      </motion.div>
    );
  }
);

ChatBubble.displayName = "ChatBubble";
