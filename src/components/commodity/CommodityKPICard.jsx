import PropTypes from 'prop-types';

const CommodityKPICard = ({ title, value, unit, icon, trend, trendValue, color = 'baltic' }) => {
  const colorClasses = {
    baltic: 'from-baltic-500 to-baltic-600 border-baltic-300 dark:border-baltic-700',
    success: 'from-success to-emerald-600 border-success/30 dark:border-success/40',
    warning: 'from-warning to-orange-600 border-warning/30 dark:border-warning/40',
    danger: 'from-danger to-red-600 border-danger/30 dark:border-danger/40',
    info: 'from-info to-blue-600 border-info/30 dark:border-info/40',
  };

  const bgClasses = {
    baltic: 'bg-gradient-to-br from-baltic-50 to-white dark:from-slate-800 dark:to-slate-900',
    success: 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900',
    warning: 'bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-900',
    danger: 'bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-slate-900',
    info: 'bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900',
  };

  return (
    <div className={`relative overflow-hidden rounded-lg border-2 ${colorClasses[color]} ${bgClasses[color]}
                    hover:shadow-lg transition-all duration-300 group`}>
      <div className="relative p-3">
        {/* Title with icon on the right */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-[9px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider leading-tight">
            {title}
          </p>
          {icon && (
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${colorClasses[color]} 
                          flex items-center justify-center text-white text-base shadow-md
                          transform group-hover:scale-110 transition-all duration-300
                          relative`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
              <span className="relative z-10">{icon}</span>
            </div>
          )}
        </div>
        
        {/* Value and Trend in same row */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-baseline gap-1">
            <h3 className="text-xl font-black text-baltic-900 dark:text-white tracking-tight">
              {value.toLocaleString()}
            </h3>
            {unit && (
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                {unit}
              </span>
            )}
          </div>
          
          {/* Trend inline */}
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded ${
              trend === 'up' ? 'text-success bg-success/20' : 
              trend === 'down' ? 'text-danger bg-danger/20' : 
              'text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
              {trendValue && ` ${trendValue}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

CommodityKPICard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  unit: PropTypes.string,
  icon: PropTypes.string,
  trend: PropTypes.oneOf(['up', 'down', 'neutral']),
  trendValue: PropTypes.string,
  color: PropTypes.oneOf(['baltic', 'success', 'warning', 'danger', 'info']),
};

export default CommodityKPICard;
