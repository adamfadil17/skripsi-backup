"use client";

import type React from "react";
import { useSession } from "next-auth/react";
import { useRef, useEffect, useCallback, useState } from "react";
import EditorJS, {
  type ToolConstructable,
  type OutputData,
} from "@editorjs/editorjs";
import Header from "@editorjs/header";
import Delimiter from "@editorjs/delimiter";
import Paragraph from "@editorjs/paragraph";
import Table from "@editorjs/table";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import CodeTool from "@editorjs/code";
import ImageTool from "@editorjs/image";
import axios from "axios";
import toast from "react-hot-toast";
import { usePusherChannelContext } from "../../components/PusherChannelProvider";

interface DocumentNoteEditorProps {
  workspaceId: string;
  documentId: string;
  modelResponse?: any;
  placeholder?: string;
}

interface EditorState {
  blockIndex: number;
  caretPosition: "end" | "start" | "default";
  blockContent?: string;
  scrollTop: number;
}

interface DocumentVersion {
  documentId: string;
  content: OutputData;
  version: number;
  timestamp: number;
  userEmail: string;
}

const DocumentNoteEditor: React.FC<DocumentNoteEditorProps> = ({
  workspaceId,
  documentId,
  modelResponse,
  placeholder = "Start writing your notes here...",
}) => {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const editorRef = useRef<EditorJS | null>(null);
  const isFetchedRef = useRef(false);
  const hasInitialized = useRef(false);
  const prevModelResponseRef = useRef<any>(null);
  const lastSavedContentRef = useRef<string>("");
  const isProcessingExternalUpdateRef = useRef(false);
  const isSavingRef = useRef(false);
  const saveQueueRef = useRef<(() => Promise<void>)[]>([]);
  const currentVersionRef = useRef<number>(0);
  const lastKnownVersionRef = useRef<number>(0);

  const [editorReady, setEditorReady] = useState(false);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [conflictResolutionInProgress, setConflictResolutionInProgress] =
    useState(false);

  const pendingUpdatesRef = useRef<DocumentVersion[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { channel: workspaceChannel } = usePusherChannelContext();

  // Enhanced debounce with queue management
  function debounce(func: Function, wait: number, immediate = false) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  // Process save queue to prevent race conditions
  const processSaveQueue = useCallback(async () => {
    if (isSavingRef.current || saveQueueRef.current.length === 0) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      // Process only the latest save operation
      const latestSave = saveQueueRef.current.pop();
      saveQueueRef.current = []; // Clear the queue

      if (latestSave) {
        await latestSave();
      }
    } catch (error) {
      console.error("Error processing save queue:", error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);

      // Process remaining items in queue if any
      if (saveQueueRef.current.length > 0) {
        setTimeout(processSaveQueue, 100);
      }
    }
  }, []);

  // Capture current editor state with enhanced error handling
  const captureEditorState = useCallback((): EditorState | null => {
    if (!editorRef.current) return null;

    try {
      const currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();
      const editorElement = document.getElementById("editorjs");
      const scrollTop = editorElement?.scrollTop || window.scrollY;

      return {
        blockIndex: Math.max(currentBlockIndex, 0),
        caretPosition: "end" as const,
        scrollTop: scrollTop,
      };
    } catch (error) {
      console.log("Could not capture editor state:", error);
      return {
        blockIndex: 0,
        caretPosition: "end" as const,
        scrollTop: window.scrollY,
      };
    }
  }, []);

  // Restore editor state with improved reliability
  const restoreEditorState = useCallback(
    (state: EditorState | null, delay = 100) => {
      if (!state || !editorRef.current) return;

      setTimeout(() => {
        if (editorRef.current) {
          try {
            const totalBlocks = editorRef.current.blocks.getBlocksCount();
            const targetIndex = Math.min(
              Math.max(state.blockIndex, 0),
              totalBlocks - 1
            );

            // Restore scroll position
            const editorElement = document.getElementById("editorjs");
            if (editorElement && state.scrollTop > 0) {
              editorElement.scrollTop = state.scrollTop;
            }

            // Restore cursor position
            if (targetIndex >= 0 && totalBlocks > 0) {
              editorRef.current.caret.setToBlock(
                targetIndex,
                state.caretPosition
              );
            }
          } catch (error) {
            console.log("Could not restore editor state:", error);
          }
        }
      }, delay);
    },
    []
  );

  // Enhanced save with version control and conflict resolution
  const onSaveDocumentContent = useCallback(
    async (force = false) => {
      if (
        !editorRef.current ||
        !userEmail ||
        isProcessingExternalUpdateRef.current
      ) {
        return;
      }

      const saveOperation = async () => {
        try {
          const outputData = await editorRef.current!.save();
          const contentString = JSON.stringify(outputData);

          // Skip save if content hasn't changed and not forced
          if (!force && contentString === lastSavedContentRef.current) {
            return;
          }

          // Prepare save payload with version information
          const savePayload = {
            content: outputData,
            userEmail: userEmail,
            timestamp: Date.now(),
            version: currentVersionRef.current + 1,
            lastKnownVersion: lastKnownVersionRef.current,
          };

          const response = await axios.put(
            `/api/workspace/${workspaceId}/document/${documentId}/content/`,
            savePayload
          );

          if (response.data?.status === "success") {
            lastSavedContentRef.current = contentString;
            currentVersionRef.current =
              response.data.version || currentVersionRef.current + 1;
            lastKnownVersionRef.current = currentVersionRef.current;

            // Broadcast the update to other users
            if (workspaceChannel) {
              workspaceChannel.trigger("client-document-content-updated", {
                content: outputData,
                documentId: documentId,
                editorEmail: userEmail,
                version: currentVersionRef.current,
                timestamp: Date.now(),
              });
            }
          } else {
            toast.error(
              response.data?.message || "Failed to save document content"
            );
          }
        } catch (error: any) {
          if (error.response?.status === 409) {
            // Conflict detected - handle merge
            setConflictResolutionInProgress(true);
            await handleConflictResolution(error.response.data);
          } else {
            toast.error(
              error.response?.data?.message ||
                "An unexpected error occurred while saving."
            );
          }
        }
      };

      // Add to save queue
      saveQueueRef.current.push(saveOperation);
      processSaveQueue();
    },
    [workspaceId, documentId, userEmail, workspaceChannel, processSaveQueue]
  );

  // Handle conflict resolution with three-way merge
  const handleConflictResolution = useCallback(async (conflictData: any) => {
    try {
      const currentContent = await editorRef.current!.save();
      const serverContent = conflictData.serverContent;
      const baseContent = conflictData.baseContent;

      // Simple merge strategy: prefer server content but preserve user's latest changes
      const mergedContent = mergeDocumentContent(
        currentContent,
        serverContent,
        baseContent
      );

      // Update editor with merged content
      await editorRef.current!.render(mergedContent);

      // Update version tracking
      currentVersionRef.current = conflictData.serverVersion;
      lastKnownVersionRef.current = conflictData.serverVersion;
      lastSavedContentRef.current = JSON.stringify(mergedContent);

      toast.success("Document conflicts resolved automatically");
    } catch (error) {
      console.error("Error resolving conflicts:", error);
      toast.error(
        "Failed to resolve document conflicts. Please refresh the page."
      );
    } finally {
      setConflictResolutionInProgress(false);
    }
  }, []);

  // Simple three-way merge for document content
  const mergeDocumentContent = (
    current: OutputData,
    server: OutputData,
    base: OutputData
  ): OutputData => {
    // For now, implement a simple strategy: use server content as base and append unique blocks from current
    const serverBlockIds = new Set(
      server.blocks.map(
        (block, index) =>
          `${block.type}-${index}-${JSON.stringify(block.data).slice(0, 50)}`
      )
    );
    const uniqueCurrentBlocks = current.blocks.filter((block, index) => {
      const blockId = `${block.type}-${index}-${JSON.stringify(
        block.data
      ).slice(0, 50)}`;
      return !serverBlockIds.has(blockId);
    });

    return {
      time: Math.max(current.time || 0, server.time || 0),
      blocks: [...server.blocks, ...uniqueCurrentBlocks],
      version: server.version || "2.30.8",
    };
  };

  // Optimized debounced save with typing indicators
  const debouncedSave = useCallback(
    debounce(() => {
      onSaveDocumentContent();

      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (workspaceChannel && userEmail) {
        workspaceChannel.trigger("client-user-typing", {
          documentId: documentId,
          userEmail: userEmail,
          isTyping: false,
        });
      }
    }, 1000),
    [onSaveDocumentContent, workspaceChannel, userEmail, documentId]
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    debounce(() => {
      if (workspaceChannel && userEmail) {
        workspaceChannel.trigger("client-user-typing", {
          documentId: documentId,
          userEmail: userEmail,
          isTyping: true,
        });

        // Auto-clear typing indicator after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          workspaceChannel.trigger("client-user-typing", {
            documentId: documentId,
            userEmail: userEmail,
            isTyping: false,
          });
        }, 3000);
      }
    }, 300),
    [workspaceChannel, userEmail, documentId]
  );

  // Get document content with version tracking
  const getDocumentContent = useCallback(async () => {
    if (!isFetchedRef.current) {
      try {
        const response = await axios.get(
          `/api/workspace/${workspaceId}/document/${documentId}/content/`
        );

        if (
          response.data?.status === "success" &&
          response.data.data?.content
        ) {
          const content = response.data.data.content;
          const version = response.data.data.version || 0;

          await editorRef.current?.render(content);
          lastSavedContentRef.current = JSON.stringify(content);
          currentVersionRef.current = version;
          lastKnownVersionRef.current = version;
        } else {
          toast.error(
            response.data?.message || "Failed to load document content."
          );
        }

        isFetchedRef.current = true;
        setEditorReady(true);
      } catch (error: any) {
        toast.error(
          error.response?.data?.message ||
            "An unexpected error occurred while loading."
        );
      }
    }
  }, [workspaceId, documentId]);

  // Process pending updates with improved conflict handling
  const processPendingUpdates = useCallback(async () => {
    if (
      pendingUpdatesRef.current.length === 0 ||
      isProcessingExternalUpdateRef.current
    ) {
      return;
    }

    // Get the latest update
    const latestUpdate = pendingUpdatesRef.current.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );

    pendingUpdatesRef.current = [];

    if (
      editorRef.current &&
      latestUpdate.version > lastKnownVersionRef.current
    ) {
      const currentState = captureEditorState();

      try {
        isProcessingExternalUpdateRef.current = true;
        setIsCollaborating(true);

        // Check if we need to merge changes
        const currentContent = await editorRef.current.save();
        const hasLocalChanges =
          JSON.stringify(currentContent) !== lastSavedContentRef.current;

        if (hasLocalChanges) {
          // Merge the changes
          const mergedContent = mergeDocumentContent(
            currentContent,
            latestUpdate.content,
            JSON.parse(lastSavedContentRef.current || '{"blocks":[],"time":0}')
          );
          await editorRef.current.render(mergedContent);
        } else {
          // No local changes, safe to update
          await editorRef.current.render(latestUpdate.content);
        }

        // Update version tracking
        lastKnownVersionRef.current = latestUpdate.version;
        lastSavedContentRef.current = JSON.stringify(latestUpdate.content);

        // Restore editor state
        restoreEditorState(currentState, 150);

        setTimeout(() => setIsCollaborating(false), 1000);
      } catch (error) {
        console.error("Error processing update:", error);
      } finally {
        setTimeout(() => {
          isProcessingExternalUpdateRef.current = false;
        }, 200);
      }
    }
  }, [captureEditorState, restoreEditorState]);

  // Image upload with better error handling
  const handleImageUploadSimple = useCallback(
    async (file: File): Promise<{ success: number; file: { url: string } }> => {
      try {
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append(
          "upload_preset",
          process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
        );
        formData.append("folder", `documents/${workspaceId}/${documentId}`);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (data.secure_url) {
          toast.success("Image uploaded successfully!");
          return { success: 1, file: { url: data.secure_url } };
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        console.error("Image upload error:", error);
        toast.error("Failed to upload image. Please try again.");
        return { success: 0, file: { url: "" } };
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId, documentId]
  );

  // Initialize editor with enhanced change handling
  const initEditor = useCallback(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      editorRef.current = new EditorJS({
        placeholder: placeholder,
        onChange: (api, event) => {
          // Send typing indicator
          sendTypingIndicator();

          // Handle saves based on event type
          let eventType = "";
          if (Array.isArray(event) && event.length > 0) {
            eventType = event[0]?.type || "";
          } else if (event && typeof event === "object" && "type" in event) {
            eventType = (event as any).type;
          }

          // Immediate save for structural changes
          if (
            ["block-added", "block-removed", "block-moved"].includes(eventType)
          ) {
            onSaveDocumentContent(true);
          } else {
            debouncedSave();
          }
        },
        onReady: () => {
          getDocumentContent();
        },
        holder: "editorjs",
        tools: {
          header: Header,
          delimiter: Delimiter,
          paragraph: {
            class: Paragraph as unknown as ToolConstructable,
            inlineToolbar: true,
            config: { placeholder: placeholder },
          },
          table: Table,
          list: {
            class: List as unknown as ToolConstructable,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+L",
            config: { defaultStyle: "unordered" },
          },
          checklist: {
            class: Checklist,
            shortcut: "CMD+SHIFT+C",
            inlineToolbar: true,
          },
          code: { class: CodeTool, shortcut: "CMD+SHIFT+P" },
          image: {
            class: ImageTool,
            config: {
              uploader: { uploadByFile: handleImageUploadSimple },
              captionPlaceholder: "Add image caption...",
              withBorder: true,
              withBackground: false,
              stretched: false,
            },
          },
        },
      });
    }
  }, [
    debouncedSave,
    sendTypingIndicator,
    onSaveDocumentContent,
    getDocumentContent,
    placeholder,
    handleImageUploadSimple,
  ]);

  // Enhanced Pusher event handling
  useEffect(() => {
    if (!workspaceChannel || !userEmail || !editorReady) return;

    const handleDocumentContentUpdated = async (data: DocumentVersion) => {
      if (data.documentId === documentId && data.userEmail !== userEmail) {
        pendingUpdatesRef.current.push(data);

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(processPendingUpdates, 200);
      }
    };

    const handleUserTyping = (data: {
      documentId: string;
      userEmail: string;
      isTyping: boolean;
    }) => {
      if (data.documentId === documentId && data.userEmail !== userEmail) {
        setIsCollaborating(data.isTyping);
      }
    };

    workspaceChannel.bind(
      "document-content-updated",
      handleDocumentContentUpdated
    );
    workspaceChannel.bind("user-typing", handleUserTyping);

    return () => {
      workspaceChannel.unbind(
        "document-content-updated",
        handleDocumentContentUpdated
      );
      workspaceChannel.unbind("user-typing", handleUserTyping);

      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [
    workspaceChannel,
    documentId,
    userEmail,
    editorReady,
    processPendingUpdates,
  ]);

  // Model response handling
  const appendModelResponse = useCallback(
    async (response: any) => {
      if (!editorRef.current) return;

      try {
        const currentContent = await editorRef.current.save();
        let newBlocks;

        if (response?.blocks) {
          newBlocks = response.blocks.map((block: any) => {
            if (block.type === "paragraph" && block.data.text) {
              let text = block.data.text;
              const boldRegex = /\*\*(.*?)\*\*/g;
              text = text.replace(boldRegex, "<b>$1</b>");
              return { ...block, data: { ...block.data, text } };
            }
            return block;
          });
        } else {
          newBlocks = [
            {
              type: "paragraph",
              data: {
                text:
                  typeof response === "string"
                    ? response
                    : JSON.stringify(response),
              },
            },
          ];
        }

        const updatedContent: OutputData = {
          time: Date.now(),
          blocks: [...(currentContent.blocks || []), ...newBlocks],
          version: currentContent.version || "2.30.8",
        };

        await editorRef.current.render(updatedContent);

        setTimeout(() => {
          if (editorRef.current) {
            const lastBlockIndex = updatedContent.blocks.length - 1;
            editorRef.current.caret.setToBlock(lastBlockIndex, "end");
          }
        }, 200);

        onSaveDocumentContent(true);
      } catch (error) {
        console.error("Error appending model response:", error);
      }
    },
    [onSaveDocumentContent]
  );

  useEffect(() => {
    if (session) {
      initEditor();
    }
  }, [session, initEditor]);

  useEffect(() => {
    if (
      modelResponse &&
      modelResponse !== prevModelResponseRef.current &&
      editorRef.current
    ) {
      appendModelResponse(modelResponse);
      prevModelResponseRef.current = modelResponse;
    }
  }, [modelResponse, appendModelResponse]);

  return (
    <div className="w-full relative">
      {/* Status indicators removed as requested */}

      <div
        id="editorjs"
        className="prose max-w-none w-full transition-opacity duration-200"
      ></div>

      <style jsx>{`
        :global(.codex-editor__redactor) {
          padding-bottom: 300px !important;
          transition: all 0.2s ease-in-out;
        }

        :global(.ce-paragraph[data-placeholder]:empty::before) {
          content: attr(data-placeholder);
          color: #a1a1aa;
          font-style: italic;
          opacity: 0.7;
        }

        :global(.ce-paragraph:empty:focus::before) {
          opacity: 0.5;
        }

        :global(
            .codex-editor--empty .ce-paragraph[data-placeholder]:empty::before
          ) {
          content: "${placeholder}";
          color: #a1a1aa;
          font-style: italic;
          opacity: 0.7;
        }

        :global(.ce-block) {
          transition: all 0.15s ease-in-out;
        }

        :global(.ce-block:hover) {
          transform: translateX(2px);
        }

        :global(.ce-block--selected) {
          background-color: rgba(59, 130, 246, 0.05);
          border-left: 3px solid #3b82f6;
          padding-left: 12px;
        }

        .transition-opacity {
          transition-property: opacity;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 200ms;
        }

        :global(.image-tool) {
          margin: 1.5rem 0;
        }

        :global(.image-tool__image) {
          border-radius: 0.5rem;
          overflow: hidden;
        }

        :global(.image-tool__caption) {
          font-size: 0.875rem;
          color: #6b7280;
          text-align: center;
          margin-top: 0.5rem;
        }

        :global(.image-tool--withBorder .image-tool__image) {
          border: 1px solid #e5e7eb;
        }

        :global(.image-tool--withBackground .image-tool__image) {
          background-color: #f3f4f6;
          padding: 1rem;
        }

        :global(.image-tool--stretched .image-tool__image img) {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default DocumentNoteEditor;
