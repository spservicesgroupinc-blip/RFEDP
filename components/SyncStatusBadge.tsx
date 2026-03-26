import React from 'react';
import { Clock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncStatusBadgeProps {
  status: 'idle' | 'pending' | 'syncing' | 'success' | 'error';
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const SYNC_CONFIG = {
  pending:  { label: 'Unsaved changes', color: 'text-amber-500',  bgColor: 'bg-amber-50', icon: Clock, animate: false },
  syncing:  { label: 'Saving...',       color: 'text-blue-500',   bgColor: 'bg-blue-50',  icon: RefreshCw, animate: true },
  success:  { label: 'Saved to Cloud',  color: 'text-emerald-500', bgColor: 'bg-emerald-50', icon: CheckCircle2, animate: false },
  error:    { label: 'Error',           color: 'text-red-500',    bgColor: 'bg-red-50',   icon: AlertCircle, animate: false },
  idle:     { label: '',                color: '',                bgColor: '',            icon: null, animate: false },
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ 
  status, 
  showLabel = true,
  size = 'sm'
}) => {
  const config = SYNC_CONFIG[status];
  
  // Don't render anything for idle state
  if (status === 'idle' || !config.icon) {
    return null;
  }

  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textClasses = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${config.bgColor}`}>
      <Icon className={`${sizeClasses} ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
      {showLabel && (
        <span className={`font-bold ${textClasses} ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );
};
