"use client";

import { CheckCircle, AlertCircle, Clock } from "lucide-react";

type SaveStatusType = "saved" | "saving" | "unsaved" | "error";

interface SaveStatusProps {
  status: SaveStatusType;
  lastSaved: Date | null;
}

export function SaveStatus({ status, lastSaved }: SaveStatusProps) {
  return (
    <div className="flex items-center gap-2">
      {status === "saved" && (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-600">
            {lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : "Saved"}
          </span>
        </>
      )}

      {status === "saving" && (
        <>
          <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
          <span className="text-yellow-600">Saving...</span>
        </>
      )}

      {status === "unsaved" && (
        <>
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-blue-600">Unsaved changes</span>
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-600">Save failed</span>
        </>
      )}
    </div>
  );
}
