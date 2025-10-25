
import { Badge } from "./ui/badge";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  LockIcon 
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    PENDING: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: Clock
    },
    APPROVED: {
      label: "Approved",
      color: "bg-green-100 text-green-800 border-green-300",
      icon: CheckCircle
    },
    DENIED: {
      label: "Denied",
      color: "bg-red-100 text-red-800 border-red-300",
      icon: XCircle
    },
    AMENDMENT_REQUESTED: {
      label: "Amendment Requested",
      color: "bg-orange-100 text-orange-800 border-orange-300",
      icon: AlertCircle
    },
    CLOSED: {
      label: "Closed",
      color: "bg-gray-100 text-gray-800 border-gray-300",
      icon: LockIcon
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1.5 ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
