"use client";

import {
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SaveStatusIndicatorProps {
  status: "saved" | "saving" | "unsaved" | "error" | "retrying";
  lastSaved: Date | null;
  queuedSaves: number;
  isOnline: boolean;
  onRetry: () => void;
}

export function SaveStatusIndicator({
  status,
  lastSaved,
  queuedSaves,
  isOnline,
  onRetry,
}: SaveStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "saved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "saving":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "unsaved":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "retrying":
        return <RotateCcw className="h-4 w-4 text-orange-500 animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "saved":
        return lastSaved
          ? `Saved at ${lastSaved.toLocaleTimeString()}`
          : "Saved";
      case "saving":
        return "Saving...";
      case "unsaved":
        return "Unsaved changes";
      case "retrying":
        return "Retrying save...";
      case "error":
        return "Save failed";
      default:
        return "Unknown status";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "saved":
        return "text-green-600";
      case "saving":
        return "text-blue-600";
      case "unsaved":
        return "text-yellow-600";
      case "retrying":
        return "text-orange-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <Tooltip>
          <TooltipTrigger>
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {isOnline
              ? "Online"
              : "Offline - changes will be saved when connection is restored"}
          </TooltipContent>
        </Tooltip>

        {/* Save Status */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={getStatusColor()}>{getStatusText()}</span>
        </div>

        {/* Queued Saves Badge */}
        {queuedSaves > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="text-xs">
                {queuedSaves} queued
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {queuedSaves} save operation{queuedSaves > 1 ? "s" : ""} in queue
            </TooltipContent>
          </Tooltip>
        )}

        {/* Retry Button */}
        {status === "error" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-6 px-2 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}
