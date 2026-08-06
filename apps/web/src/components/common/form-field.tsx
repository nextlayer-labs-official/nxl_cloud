interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  as?: "input" | "textarea";
  rows?: number;
}

/** Label + input pair — reused across Enterprise, Contact, Login, and Register forms. */
export function FormField({ id, label, type = "text", as = "input", rows }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink-700 text-[13px] font-semibold">
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          rows={rows}
          className="border-input resize-y rounded-lg border px-3.5 py-[11px] text-sm"
        />
      ) : (
        <input
          id={id}
          type={type}
          className="border-input rounded-lg border px-3.5 py-[11px] text-sm"
        />
      )}
    </div>
  );
}
