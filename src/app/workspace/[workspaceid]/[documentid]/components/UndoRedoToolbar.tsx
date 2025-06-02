"use client";

import { Button } from "@/components/ui/button";
import { Undo2, Redo2, RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UndoRedoToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearHistory?: () => void;
  historyLength: number;
  currentIndex: number;
}

export function UndoRedoToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearHistory,
  historyLength,
  currentIndex,
}: UndoRedoToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 bg-white border rounded-lg shadow-md">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className={`h-8 w-8 p-0 ${
                !canUndo ? "opacity-50" : "hover:bg-gray-100"
              }`}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="text-xs">
              <p>Undo</p>
              <p className="text-gray-500 mt-1">Ctrl+Z</p>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className={`h-8 w-8 p-0 ${
                !canRedo ? "opacity-50" : "hover:bg-gray-100"
              }`}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="text-xs">
              <p>Redo</p>
              <p className="text-gray-500 mt-1">Ctrl+Y or Ctrl+Shift+Z</p>
            </div>
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <div className="text-xs text-gray-500 px-2 font-mono">
          {currentIndex + 1}/{historyLength}
        </div>

        {onClearHistory && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearHistory}
                className="h-8 w-8 p-0 hover:bg-gray-100"
                aria-label="Clear History"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Clear History</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
