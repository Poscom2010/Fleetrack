/**
 * Tabs component renders a horizontal list of pill-shaped buttons.
 * @param {Object} props
 * @param {Array<{value: string, label: string, badge?: string | number, description?: string}>} props.options
 * @param {string} props.value - Current active tab value
 * @param {(value: string) => void} props.onChange - Callback when a tab is clicked
 * @param {string} [props.variant="pill"] - Visual style variant
 * @param {string} [props.className] - Optional additional container classes
 */
const Tabs = ({
  options = [],
  value,
  onChange,
  variant = "pill",
  className = "",
}) => {
  const isPillVariant = variant === "pill";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-3xl border border-white/10 bg-white/5 p-2 shadow-soft ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange?.(option.value)}
            className={`group relative flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition duration-200 ${
              active
                ? "bg-brand-gradient text-white shadow-brand"
                : isPillVariant
                ? "text-slate-200 hover:bg-white/10 hover:text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>{option.label}</span>
            {option.badge !== undefined && option.badge !== null && (
              <span
                className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-slate-200"
                }`}
              >
                {option.badge}
              </span>
            )}
            {option.description && (
              <span className="hidden text-xs text-slate-300/80 lg:inline">
                {option.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;

