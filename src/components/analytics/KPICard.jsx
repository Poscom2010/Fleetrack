import React from "react";

/**
 * KPICard component to display a single key performance indicator
 * @param {Object} props
 * @param {string} props.title - The KPI title
 * @param {string|number} props.value - The KPI value
 * @param {string} props.icon - Icon name or emoji
 * @param {string} props.color - Color theme ('green', 'red', 'blue', 'yellow')
 * @param {number} props.trend - Optional trend percentage (positive or negative)
 * @param {string} props.subtitle - Optional subtitle text
 */
const KPICard = ({
  title,
  value,
  icon,
  accent = "from-brand-500 to-indigo-500",
  subtitle,
}) => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className={`rounded-xl bg-gradient-to-br ${accent} px-3 py-2 text-lg text-white shadow-brand`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
