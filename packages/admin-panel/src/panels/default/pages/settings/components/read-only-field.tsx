export const ReadOnlyField = ({
  label,
  prefix,
  value,
}: {
  label: string;
  prefix?: string;
  value: string;
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ap-foreground">
        {label}
      </label>
      <div className="flex">
        {prefix && (
          <span className="rounded-l-xl border border-r-0 border-ap-border bg-ap-field-background px-4 py-2.5 text-sm text-ap-muted">
            {prefix}
          </span>
        )}
        <div
          className={`w-full rounded-xl border border-ap-border bg-ap-field-background px-4 py-2.5 text-sm text-ap-field-foreground ${
            prefix ? "rounded-l-none" : ""
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
};
