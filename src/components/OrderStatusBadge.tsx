import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, Pause } from 'lucide-react';
import { OrderStatus, getOrderStatusDisplay, isOrderInProgress } from '@/utils/orderStatus';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  animate?: boolean;
}

export function OrderStatusBadge({ 
  status, 
  className = '',
  showIcon = true,
  showLabel = true,
  animate = true
}: OrderStatusBadgeProps) {
  const displayInfo = getOrderStatusDisplay(status);
  
  if (!displayInfo) {
    return null;
  }

  // Get appropriate Lucide icon
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'signing':
      case 'submitted':
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'executed':
        return <CheckCircle className="w-3 h-3" />;
      case 'failed':
        return <XCircle className="w-3 h-3" />;
      case 'expired':
        return <Pause className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const badgeContent = (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${displayInfo.bgColor} ${displayInfo.color} ${className}`}
      role="status"
      aria-live={isOrderInProgress(status) ? "polite" : "off"}
      aria-label={`Order status: ${displayInfo.label}`}
    >
      {showIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {getStatusIcon()}
        </span>
      )}
      {showLabel && (
        <span className="whitespace-nowrap">{displayInfo.label}</span>
      )}
    </div>
  );

  if (!animate) {
    return badgeContent;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 10 }}
        transition={{ 
          duration: 0.3,
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
        {badgeContent}
      </motion.div>
    </AnimatePresence>
  );
}