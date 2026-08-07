interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  as?: "input" | "textarea";
  rows?: number;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}

/** Label + input pair — reused across Enterprise, Contact, Login, and Register forms. */
export function FormField({
  id,
  label,
  type = "text",
  as = "input",
  rows,
  name,
  value,
  onChange,
  required,
  autoComplete,
  placeholder,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink-700 text-[13px] font-semibold">
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          name={name ?? id}
          rows={rows}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className="border-input resize-y rounded-lg border px-3.5 py-[11px] text-sm"
        />
      ) : (
        <input
          id={id}
          name={name ?? id}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="border-input rounded-lg border px-3.5 py-[11px] text-sm"
        />
      )}
    </div>
  );
}
