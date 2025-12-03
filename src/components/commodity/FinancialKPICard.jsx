import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/calculations';

/**
 * Modern Financial KPI Card with trend indicators
 */
const FinancialKPICard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'baltic',
  trend,
  trendValue,
  currency = 'USD',
  format = 'currency' // 'currency', 'percentage', 'number'
}) => {
  const currencySymbol = getCurrencySymbol(currency);
  
  const formatValue = (val) => {
    if (format === 'currency') {
      return `${currencySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (format === 'percentage') {
      return `${val.toFixed(1)}%`;
    } else {
      return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp className="w-3 h-3" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    // For revenue/positive metrics, up is good
    if (trend === 'up') return 'text-success';
    if (trend === 'down') return 'text-danger';
    return 'text-gray-500';
  };

  const colorClasses = {
    baltic: 'from-baltic-500 to-baltic-600',
    success: 'from-green-500 to-emerald-600',
    warning: 'from-amber-500 to-orange-600',
    danger: 'from-red-500 to-rose-600',
    info: 'from-blue-500 to-indigo-600',
    purple: 'from-purple-500 to-violet-600'
  };

  return (
    <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Icon and Title */}
      <div className="flex items-start justify-between mb-1 sm:mb-2">
        <div className="flex-1">
          <p className="text-[9px] sm:text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
            {title}
          </p>
        </div>
        {Icon && (
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-sm`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
        )}
      </div>

      {/* Value and Trend in same row */}
      <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
        <p className="text-base sm:text-xl font-bold text-gray-900">
          {formatValue(value)}
        </p>
        
        {trend && trendValue !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(trendValue).toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-[10px] text-gray-600">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default FinancialKPICard;
