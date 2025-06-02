"use client";

import { useCallback, useRef, useState } from "react";
import type { OutputData } from "@editorjs/editorjs";

interface EditorState {
  content: OutputData;
  timestamp: number;
  cursorPosition?: {
    blockIndex: number;
    caretPosition: "start" | "end" | "default";
  };
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  debounceMs?: number;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}) {
  const { maxHistorySize = 50, debounceMs = 1000 } = options;

  const [history, setHistory] = useState<EditorState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const lastSaveTime = useRef<number>(0);
  const isUndoRedoOperation = useRef(false);

  // Update undo/redo availability
  const updateAvailability = useCallback(
    (index: number, historyLength: number) => {
      setCanUndo(index > 0);
      setCanRedo(index < historyLength - 1);
    },
    []
  );

  // Save state to history
  const saveState = useCallback(
    (
      content: OutputData,
      cursorPosition?: {
        blockIndex: number;
        caretPosition: "start" | "end" | "default";
      }
    ) => {
      // Skip if this is an undo/redo operation
      if (isUndoRedoOperation.current) {
        return;
      }

      const now = Date.now();

      // Debounce rapid changes
      if (now - lastSaveTime.current < debounceMs) {
        return;
      }

      lastSaveTime.current = now;

      const newState: EditorState = {
        content: JSON.parse(JSON.stringify(content)), // Deep clone
        timestamp: now,
        cursorPosition,
      };

      setHistory((prevHistory) => {
        // Remove any future history if we're not at the end
        const newHistory = prevHistory.slice(0, currentIndex + 1);

        // Add new state
        newHistory.push(newState);

        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
          setCurrentIndex(newHistory.length - 1);
          updateAvailability(newHistory.length - 1, newHistory.length);
          return newHistory;
        }

        const newIndex = newHistory.length - 1;
        setCurrentIndex(newIndex);
        updateAvailability(newIndex, newHistory.length);
        return newHistory;
      });
    },
    [currentIndex, debounceMs, maxHistorySize, updateAvailability]
  );

  // Undo operation
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      updateAvailability(newIndex, history.length);
      isUndoRedoOperation.current = true;

      // Reset flag after a short delay
      setTimeout(() => {
        isUndoRedoOperation.current = false;
      }, 100);

      return history[newIndex];
    }
    return null;
  }, [currentIndex, history, updateAvailability]);

  // Redo operation
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      updateAvailability(newIndex, history.length);
      isUndoRedoOperation.current = true;

      // Reset flag after a short delay
      setTimeout(() => {
        isUndoRedoOperation.current = false;
      }, 100);

      return history[newIndex];
    }
    return null;
  }, [currentIndex, history, updateAvailability]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  // Get current state
  const getCurrentState = useCallback(() => {
    return currentIndex >= 0 ? history[currentIndex] : null;
  }, [currentIndex, history]);

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getCurrentState,
    historyLength: history.length,
    currentIndex,
    isUndoRedoOperation: isUndoRedoOperation.current,
  };
}
