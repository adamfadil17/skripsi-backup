"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { debounce } from "lodash";

interface SaveOperation {
  id: string;
  content: any;
  timestamp: number;
  retryCount: number;
  priority: "high" | "normal";
  source: "ai-generated" | "user-edit" | "auto-save";
}

interface UseRobustSaveProps {
  workspaceId: string;
  documentId: string;
  userEmail: string;
  maxRetries?: number;
  retryDelay?: number;
}

export function useRobustSave({
  workspaceId,
  documentId,
  userEmail,
  maxRetries = 5,
  retryDelay = 2000,
}: UseRobustSaveProps) {
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | "error" | "retrying"
  >("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveQueue, setSaveQueue] = useState<SaveOperation[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const saveQueueRef = useRef<SaveOperation[]>([]);
  const isOnlineRef = useRef(navigator.onLine);
  const lastSuccessfulSaveRef = useRef<any>(null);

  // Local storage keys
  const BACKUP_KEY = `doc_backup_${documentId}`;
  const QUEUE_KEY = `save_queue_${documentId}`;
  const AI_CONTENT_KEY = `ai_content_${documentId}`;

  // Save to localStorage as backup
  const saveToLocalStorage = useCallback(
    (content: any, key: string) => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            content,
            timestamp: Date.now(),
            documentId,
            workspaceId,
          })
        );
      } catch (error) {
        console.warn("Failed to save to localStorage:", error);
      }
    },
    [documentId, workspaceId]
  );

  // Load from localStorage
  const loadFromLocalStorage = useCallback((key: string) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if backup is recent (within 24 hours)
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.content;
        }
      }
    } catch (error) {
      console.warn("Failed to load from localStorage:", error);
    }
    return null;
  }, []);

  // Clear localStorage backup after successful save
  const clearLocalStorageBackup = useCallback((key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      // Process queued saves when coming back online
      if (saveQueueRef.current.length > 0) {
        processQueue();
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      toast.error(
        "You are offline. Changes will be saved when connection is restored."
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load queued saves from localStorage on mount
  useEffect(() => {
    const savedQueue = loadFromLocalStorage(QUEUE_KEY);
    if (savedQueue && Array.isArray(savedQueue)) {
      setSaveQueue(savedQueue);
      saveQueueRef.current = savedQueue;
    }
  }, [loadFromLocalStorage]);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    if (saveQueue.length > 0) {
      saveToLocalStorage(saveQueue, QUEUE_KEY);
    } else {
      clearLocalStorageBackup(QUEUE_KEY);
    }
  }, [saveQueue, saveToLocalStorage, clearLocalStorageBackup]);

  // Actual save function with retry logic
  const performSave = useCallback(
    async (operation: SaveOperation): Promise<boolean> => {
      try {
        const response = await axios.put(
          `/api/workspace/${workspaceId}/document/${documentId}/content`,
          {
            content: operation.content,
            userEmail,
            saveId: operation.id,
            source: operation.source,
          },
          {
            timeout: 30000, // 30 second timeout
            headers: {
              "X-Save-Priority": operation.priority,
              "X-Save-Source": operation.source,
            },
          }
        );

        if (response.data.status === "success") {
          lastSuccessfulSaveRef.current = operation.content;
          setLastSaved(new Date());

          // Clear backups for successful saves
          if (operation.source === "ai-generated") {
            clearLocalStorageBackup(AI_CONTENT_KEY);
          }
          clearLocalStorageBackup(BACKUP_KEY);

          return true;
        }

        throw new Error(response.data.message || "Save failed");
      } catch (error: any) {
        console.error("Save failed:", error);

        // Save to localStorage as backup on failure
        if (operation.source === "ai-generated") {
          saveToLocalStorage(operation.content, AI_CONTENT_KEY);
          toast.error("AI content saved locally due to connection issues");
        } else {
          saveToLocalStorage(operation.content, BACKUP_KEY);
        }

        return false;
      }
    },
    [
      workspaceId,
      documentId,
      userEmail,
      saveToLocalStorage,
      clearLocalStorageBackup,
    ]
  );

  // Process save queue
  const processQueue = useCallback(async () => {
    if (
      isProcessingQueue ||
      saveQueueRef.current.length === 0 ||
      !isOnlineRef.current
    ) {
      return;
    }

    setIsProcessingQueue(true);
    setSaveStatus("saving");

    // Sort queue by priority and timestamp
    const sortedQueue = [...saveQueueRef.current].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === "high" ? -1 : 1;
      }
      return a.timestamp - b.timestamp;
    });

    const remainingQueue: SaveOperation[] = [];

    for (const operation of sortedQueue) {
      const success = await performSave(operation);

      if (success) {
        // Remove from queue on success
        toast.success(
          operation.source === "ai-generated"
            ? "AI content saved successfully!"
            : "Document saved successfully!"
        );
      } else {
        // Retry logic
        if (operation.retryCount < maxRetries) {
          const updatedOperation = {
            ...operation,
            retryCount: operation.retryCount + 1,
            timestamp: Date.now() + retryDelay * operation.retryCount, // Exponential backoff
          };
          remainingQueue.push(updatedOperation);

          setSaveStatus("retrying");
          toast.error(
            `Save failed, retrying... (${
              operation.retryCount + 1
            }/${maxRetries})`
          );
        } else {
          // Max retries reached
          remainingQueue.push(operation); // Keep in queue for manual retry
          setSaveStatus("error");
          toast.error(
            operation.source === "ai-generated"
              ? "Failed to save AI content. It has been backed up locally."
              : "Failed to save document. Please try again."
          );
        }
      }

      // Small delay between saves to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Update queue
    saveQueueRef.current = remainingQueue;
    setSaveQueue(remainingQueue);

    if (remainingQueue.length === 0) {
      setSaveStatus("saved");
    }

    setIsProcessingQueue(false);
  }, [isProcessingQueue, performSave, maxRetries, retryDelay]);

  // Add save operation to queue
  const queueSave = useCallback(
    (
      content: any,
      source: "ai-generated" | "user-edit" | "auto-save" = "user-edit"
    ) => {
      const operation: SaveOperation = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content,
        timestamp: Date.now(),
        retryCount: 0,
        priority: source === "ai-generated" ? "high" : "normal",
        source,
      };

      // Add to queue
      const newQueue = [...saveQueueRef.current, operation];
      saveQueueRef.current = newQueue;
      setSaveQueue(newQueue);
      setSaveStatus("unsaved");

      // Immediate backup for AI content
      if (source === "ai-generated") {
        saveToLocalStorage(content, AI_CONTENT_KEY);
      }

      // Process queue
      processQueue();
    },
    [processQueue, saveToLocalStorage]
  );

  // Debounced save for user edits
  const debouncedSave = useCallback(
    debounce((content: any) => {
      queueSave(content, "user-edit");
    }, 2000),
    [queueSave]
  );

  // Immediate save for AI content
  const saveAIContent = useCallback(
    (content: any) => {
      queueSave(content, "ai-generated");
    },
    [queueSave]
  );

  // Manual save
  const manualSave = useCallback(
    (content: any) => {
      queueSave(content, "user-edit");
    },
    [queueSave]
  );

  // Retry failed saves
  const retryFailedSaves = useCallback(() => {
    if (saveQueueRef.current.length > 0) {
      // Reset retry counts for manual retry
      const resetQueue = saveQueueRef.current.map((op) => ({
        ...op,
        retryCount: 0,
        timestamp: Date.now(),
      }));

      saveQueueRef.current = resetQueue;
      setSaveQueue(resetQueue);
      processQueue();
    }
  }, [processQueue]);

  // Get recovery data
  const getRecoveryData = useCallback(() => {
    const aiContent = loadFromLocalStorage(AI_CONTENT_KEY);
    const backupContent = loadFromLocalStorage(BACKUP_KEY);
    const queuedSaves = saveQueueRef.current;

    return {
      aiContent,
      backupContent,
      queuedSaves,
      hasRecoveryData: !!(aiContent || backupContent || queuedSaves.length > 0),
    };
  }, [loadFromLocalStorage]);

  // Clear all recovery data
  const clearRecoveryData = useCallback(() => {
    clearLocalStorageBackup(AI_CONTENT_KEY);
    clearLocalStorageBackup(BACKUP_KEY);
    clearLocalStorageBackup(QUEUE_KEY);
    saveQueueRef.current = [];
    setSaveQueue([]);
  }, [clearLocalStorageBackup]);

  return {
    saveStatus,
    lastSaved,
    saveQueue: saveQueue.length,
    isProcessingQueue,
    debouncedSave,
    saveAIContent,
    manualSave,
    retryFailedSaves,
    getRecoveryData,
    clearRecoveryData,
    isOnline: isOnlineRef.current,
  };
}
