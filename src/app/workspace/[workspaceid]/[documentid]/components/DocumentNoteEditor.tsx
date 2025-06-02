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
import InlineCode from "@editorjs/inline-code";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { UndoRedoToolbar } from "./UndoRedoToolbar";

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
}

const DocumentNoteEditorWithUndoRedo: React.FC<DocumentNoteEditorProps> = ({
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
  const [editorReady, setEditorReady] = useState(false);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize undo/redo hook
  const {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getCurrentState,
    historyLength,
    currentIndex,
    isUndoRedoOperation,
  } = useUndoRedo({
    maxHistorySize: 50,
    debounceMs: 1000,
  });

  // Debug logging for undo/redo operations
  useEffect(() => {
    console.log("History state updated:", {
      historyLength,
      currentIndex,
      canUndo,
      canRedo,
    });
  }, [historyLength, currentIndex, canUndo, canRedo]);

  // Enhanced debounce with immediate execution option
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

  // Capture current editor state including scroll position
  const captureEditorState = useCallback(():
    | (EditorState & { scrollTop: number })
    | null => {
    if (!editorRef.current) return null;

    try {
      const currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();
      const currentBlock =
        editorRef.current.blocks.getBlockByIndex(currentBlockIndex);
      const editorElement = document.getElementById("editorjs");
      const scrollTop = editorElement?.scrollTop || window.scrollY;

      return {
        blockIndex: currentBlockIndex >= 0 ? currentBlockIndex : 0,
        caretPosition: "end" as const,
        blockContent: currentBlock?.holder?.textContent || "",
        scrollTop: scrollTop,
      };
    } catch (error) {
      console.log("Could not capture editor state:", error);
      return {
        blockIndex: 0,
        caretPosition: "end" as const,
        blockContent: "",
        scrollTop: window.scrollY,
      };
    }
  }, []);

  // Restore editor state with smooth transition and scroll position
  const restoreEditorState = useCallback(
    (state: (EditorState & { scrollTop: number }) | null, delay = 50) => {
      if (!state || !editorRef.current) return;

      setTimeout(() => {
        if (editorRef.current) {
          try {
            const totalBlocks = editorRef.current.blocks.getBlocksCount();
            const targetIndex = Math.min(
              Math.max(state.blockIndex, 0),
              totalBlocks - 1
            );

            // Restore scroll position first
            const editorElement = document.getElementById("editorjs");
            if (editorElement && state.scrollTop > 0) {
              editorElement.scrollTop = state.scrollTop;
            } else if (state.scrollTop > 0) {
              window.scrollTo({ top: state.scrollTop, behavior: "auto" });
            }

            // Then restore cursor position
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

  // Enhanced save with conflict resolution
  const onSaveDocumentContent = useCallback(
    async (force = false) => {
      if (
        editorRef.current &&
        !isProcessingExternalUpdateRef.current &&
        userEmail
      ) {
        try {
          const outputData = await editorRef.current.save();
          const formattedContent = convertEditorDataToHtml(outputData);
          const contentString = JSON.stringify(formattedContent);

          if (!force && contentString === lastSavedContentRef.current) {
            return;
          }

          lastSavedContentRef.current = contentString;

          const response = await axios.put(
            `/api/workspace/${workspaceId}/document/${documentId}/content/`,
            {
              content: formattedContent,
              userEmail: userEmail,
              timestamp: Date.now(),
            }
          );

          if (response.data?.status !== "success") {
            toast.error(
              response.data?.message || "Failed to save document content"
            );
          }
        } catch (error: any) {
          if (error.response?.status === 409) {
            toast.error("Document was updated by another user. Refreshing...");
            await getDocumentContent();
          } else {
            toast.error(
              error.response?.data?.message || "An unexpected error occurred."
            );
          }
        }
      }
    },
    [workspaceId, documentId, userEmail]
  );

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

          // Render content to editor
          await editorRef.current?.render(content);
          lastSavedContentRef.current = JSON.stringify(content);

          // Clear history and save initial state
          clearHistory();

          // Add a small delay to ensure editor is fully rendered
          setTimeout(() => {
            // Save initial state to history
            saveState(content);
            console.log("Initial state saved to history");
          }, 300);
        } else {
          toast.error(
            response.data?.message || "Failed to load document content."
          );
        }
        isFetchedRef.current = true;
        setEditorReady(true);
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "An unexpected error occurred."
        );
      }
    }
  }, [workspaceId, documentId, saveState, clearHistory]);

  // Alternative simpler upload method using next-cloudinary
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
        formData.append(
          "tags",
          `workspace:${workspaceId},document:${documentId}`
        );

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
          return {
            success: 1,
            file: { url: data.secure_url },
          };
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        console.error("Image upload error:", error);
        toast.error("Failed to upload image. Please try again.");
        return {
          success: 0,
          file: { url: "" },
        };
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId, documentId]
  );

  const initEditor = useCallback(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      editorRef.current = new EditorJS({
        placeholder: placeholder,
        onChange: (api, event) => {
          // Handle different event types safely
          let eventType = "";

          if (Array.isArray(event)) {
            eventType =
              event.length > 0 &&
              event[0] &&
              typeof event[0] === "object" &&
              "type" in event[0]
                ? (event[0] as any).type
                : "";
          } else if (event && typeof event === "object" && "type" in event) {
            eventType = (event as any).type;
          }

          // Use different save strategies based on event type
          if (
            eventType === "block-added" ||
            eventType === "block-removed" ||
            eventType === "block-moved"
          ) {
            immediateSave();
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
            config: {
              placeholder: placeholder,
            },
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
          inlineCode: {
            class: InlineCode,
            shortcut: "CMD+SHIFT+M",
          },
          image: {
            class: ImageTool,
            config: {
              uploader: {
                uploadByFile: handleImageUploadSimple,
              },
              captionPlaceholder: "Add image caption...",
              withBorder: true,
              withBackground: false,
              stretched: false,
            },
          },
        },
      });
    }
  }, [getDocumentContent, placeholder, handleImageUploadSimple]);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  useEffect(() => {
    if (session) {
      initEditor();
    }
  }, [session, initEditor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field or contentEditable element
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Only handle shortcuts if we're in the editor
      if (isInput && (event.ctrlKey || event.metaKey)) {
        if (!event.shiftKey && event.key.toLowerCase() === "z") {
          event.preventDefault();
          event.stopPropagation();
          handleUndo();
          console.log("Undo shortcut triggered");
        } else if (
          (event.shiftKey && event.key.toLowerCase() === "z") ||
          event.key.toLowerCase() === "y"
        ) {
          event.preventDefault();
          event.stopPropagation();
          handleRedo();
          console.log("Redo shortcut triggered");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Optimized debounced save with undo/redo state tracking
  const debouncedSave = useCallback(
    debounce(async () => {
      if (!isUndoRedoOperation && editorRef.current) {
        const outputData = await editorRef.current.save();
        const currentState = captureEditorState();

        // Save to undo/redo history
        saveState(
          outputData,
          currentState
            ? {
                blockIndex: currentState.blockIndex,
                caretPosition: currentState.caretPosition,
              }
            : undefined
        );

        // Save to server
        onSaveDocumentContent();
      }
    }, 800),
    [onSaveDocumentContent, saveState, captureEditorState, isUndoRedoOperation]
  );

  // Immediate save for critical updates
  const immediateSave = useCallback(
    debounce(
      async () => {
        if (!isUndoRedoOperation && editorRef.current) {
          const outputData = await editorRef.current.save();
          const currentState = captureEditorState();

          // Save to undo/redo history
          saveState(
            outputData,
            currentState
              ? {
                  blockIndex: currentState.blockIndex,
                  caretPosition: currentState.caretPosition,
                }
              : undefined
          );

          // Save to server
          onSaveDocumentContent(true);
        }
      },
      100,
      true
    ),
    [onSaveDocumentContent, saveState, captureEditorState, isUndoRedoOperation]
  );

  function convertEditorDataToHtml(data: OutputData): OutputData {
    const newData = { ...data };
    newData.blocks = newData.blocks.map((block) => {
      if (block.type === "paragraph" && block.data.inlineToolbar) {
        let text = block.data.text;
        const inlineTools = [...block.data.inlineToolbar];

        inlineTools.sort((a: any, b: any) => b.offset - a.offset);

        inlineTools.forEach((tool: any) => {
          if (tool.type === "bold") {
            const startTag = "<b>";
            const endTag = "</b>";
            text =
              text.slice(0, tool.offset) +
              startTag +
              text.slice(tool.offset, tool.offset + tool.length) +
              endTag +
              text.slice(tool.offset + tool.length);
          }
        });

        return {
          ...block,
          data: {
            ...block.data,
            text: text,
            inlineToolbar: undefined,
          },
        };
      }
      return block;
    });
    return newData;
  }

  return (
    <div className="w-full relative">
      {/* Undo/Redo Toolbar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <UndoRedoToolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearHistory={clearHistory}
          historyLength={historyLength}
          currentIndex={currentIndex}
        />
      </div>

      {/* Collaboration indicator */}
      {isCollaborating && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-2 rounded-md text-sm shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-white rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-white rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <span>Someone is editing...</span>
          </div>
        </div>
      )}

      {/* Image upload indicator */}
      {isUploading && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-md text-sm shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
            <span>Uploading image...</span>
          </div>
        </div>
      )}

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

        /* Smooth transitions for collaborative editing */
        :global(.ce-block) {
          transition: all 0.15s ease-in-out;
        }

        :global(.ce-block:hover) {
          transform: translateX(2px);
        }

        /* Collaboration highlight effect */
        :global(.ce-block--selected) {
          background-color: rgba(59, 130, 246, 0.05);
          border-left: 3px solid #3b82f6;
          padding-left: 12px;
        }

        /* Loading state for content updates */
        .transition-opacity {
          transition-property: opacity;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 200ms;
        }

        /* Image block styling */
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

export default DocumentNoteEditorWithUndoRedo;
