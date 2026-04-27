import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import React, { useEffect, useRef, forwardRef } from "react";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  size?: "sm" | "md" | "lg";
}

const FormModal = forwardRef<HTMLDivElement, FormModalProps>(({ open, onClose, title, children, onSubmit, submitLabel = "Save", size = "md" }, _ref) => {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const widthClass = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
          <motion.div
            ref={innerRef}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`relative ${widthClass} w-full bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[85vh] flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-card-foreground">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors touch-manipulation">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
              {children}
            </div>

            {/* Footer */}
            {onSubmit && (
              <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-border pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
                <button onClick={onClose} className="px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors touch-manipulation">
                  Cancel
                </button>
                <button onClick={onSubmit} className="px-5 py-2.5 sm:py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity touch-manipulation">
                  {submitLabel}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

FormModal.displayName = "FormModal";
export default FormModal;

/* Reusable form field components */
export function FormField({ label, children, error, required }: { label: string; children: React.ReactNode; error?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-destructive mt-1 flex items-center gap-1" role="alert">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

export function FormInput({ value, onChange, placeholder, type = "text", error, required, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: string; required?: boolean; autoFocus?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoFocus={autoFocus}
      aria-invalid={!!error}
      className={`w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 transition-shadow placeholder:text-muted-foreground ${error ? 'ring-2 ring-destructive/50 focus:ring-destructive/50' : 'focus:ring-primary/30'}`}
    />
  );
}

export function FormTextarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const autoResize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => { autoResize(); }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={autoResize}
      placeholder={placeholder}
      rows={rows}
      style={{ overflow: "hidden" }}
      className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none placeholder:text-muted-foreground"
    />
  );
}

export function FormSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function FormTagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = (e.target as HTMLInputElement).value.trim();
      if (v && !value.includes(v)) {
        onChange([...value, v]);
        (e.target as HTMLInputElement).value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <input
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type and press Enter"}
        className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
              {t}
              <button onClick={() => onChange(value.filter((x) => x !== t))} className="hover:text-destructive">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
