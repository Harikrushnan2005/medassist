import { motion } from "framer-motion";
import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FormBlockProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const FormBlock = forwardRef<HTMLDivElement, FormBlockProps>(
  ({ title, children, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0 }}
        className={cn(
          "self-start max-w-[85%] rounded-[18px] bg-card p-4 shadow-[var(--chat-form-shadow)]",
          className
        )}
      >
        {title && (
          <h3 className="mb-3 text-lg font-semibold text-foreground [text-wrap:balance]">
            {title}
          </h3>
        )}
        <div className="flex flex-col gap-3">{children}</div>
      </motion.div>
    );
  }
);

FormBlock.displayName = "FormBlock";

interface FormFieldProps {
  label: string;
  children: ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[15px] font-medium tracking-[0.01em] text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function FormInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground",
        "placeholder:text-muted-foreground",
        "focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-ring/40",
        "transition-all duration-150",
        className
      )}
      {...props}
    />
  );
}

export function FormSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground",
        "focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-ring/40",
        "transition-all duration-150",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
