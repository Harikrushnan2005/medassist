import { motion } from "framer-motion";
import { forwardRef } from "react";

export const LoadingAnimation = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0 }}
      className="self-start flex items-center gap-2 px-4 py-3"
    >
      <svg width="32" height="32" viewBox="0 0 32 32" className="text-primary">
        <motion.circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, rotate: -90 }}
          animate={{ pathLength: [0, 1, 1], rotate: [-90, -90, 270] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.5, 1],
          }}
        />
        <motion.circle
          cx="16"
          cy="16"
          r="4"
          fill="currentColor"
          initial={{ scale: 0.8, opacity: 0.4 }}
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
      <span className="text-sm text-muted-foreground">Processing...</span>
    </motion.div>
  );
});

LoadingAnimation.displayName = "LoadingAnimation";
