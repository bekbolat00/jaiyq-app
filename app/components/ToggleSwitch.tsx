"use client";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: Props) {
  return (
    <label className="glass flex cursor-pointer items-center justify-between gap-4 rounded-2xl px-4 py-3">
      <span className="flex-1">
        <span className="block text-[14px] font-medium text-foreground">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-[12px] text-muted">
            {description}
          </span>
        )}
      </span>

      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          checked
            ? "bg-accent/80 shadow-[0_0_12px_rgba(0,240,255,0.45)]"
            : "bg-white/10"
        }`}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-[#04111a] shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </label>
  );
}
