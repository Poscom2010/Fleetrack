/**
 * ReconciliationBadge Component
 * Displays reconciliation status with color-coded badges
 */

import PropTypes from 'prop-types';

const STATUS_CONFIG = {
  matched: {
    color: 'bg-success text-white dark:bg-success-dark',
    icon: '✓',
    label: 'Matched'
  },
  very_minor: {
    color: 'bg-info text-white dark:bg-info-dark',
    icon: 'ℹ️',
    label: 'Very Minor (≤3L)'
  },
  minor_variance: {
    color: 'bg-warning text-white dark:bg-warning-dark',
    icon: '⚠',
    label: 'Minor Variance'
  },
  major_variance: {
    color: 'bg-danger text-white dark:bg-danger-dark',
    icon: '🔴',
    label: 'Major Discrepancy'
  },
  pending: {
    color: 'bg-baltic-400 text-white dark:bg-baltic-600',
    icon: '⏳',
    label: 'Pending'
  }
};

export const ReconciliationBadge = ({ status, showLabel = true, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${config.color}
        ${sizeClasses[size]}
      `}
      role="status"
      aria-label={config.label}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

ReconciliationBadge.propTypes = {
  status: PropTypes.oneOf(['matched', 'very_minor', 'minor_variance', 'major_variance', 'pending']).isRequired,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export default ReconciliationBadge;
