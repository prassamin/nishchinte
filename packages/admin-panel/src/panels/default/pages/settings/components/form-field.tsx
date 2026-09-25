import { SettingFormData } from "../view";

export const FormField = ({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  options,
  prefix,
}: {
  label: string;
  name: keyof SettingFormData;
  value: string;
  onChange: (field: keyof SettingFormData, value: string) => void;
  error?: string;
  type?: "text" | "email" | "select";
  options?: string[];
  prefix?: string;
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ap-foreground">
        {label}
      </label>
      {type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full rounded-xl border border-ap-border bg-ap-field-background px-4 py-2.5 text-sm text-ap-field-foreground outline-none transition-colors focus:border-ap-focus"
        >
          <option value="">Select an option</option>
          {options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex">
          {prefix && (
            <span className="rounded-l-xl border border-r-0 border-ap-border bg-ap-field-background px-4 py-2.5 text-sm text-ap-muted">
              {prefix}
            </span>
          )}
          <input
            name={name}
            type={type}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            className={`w-full rounded-xl border bg-ap-field-background px-4 py-2.5 text-sm text-ap-field-foreground placeholder:text-ap-field-placeholder outline-none transition-colors focus:border-ap-focus ${
              prefix ? "rounded-l-none" : "rounded-xl"
            } ${error ? "border-ap-danger" : "border-ap-border"} ${prefix ? "" : ""}`}
          />
        </div>
      )}
      {error && <p className="mt-1 text-xs text-ap-danger">{error}</p>}
    </div>
  );
};
