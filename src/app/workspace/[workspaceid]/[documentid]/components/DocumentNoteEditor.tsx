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
}

// Add proper type for Editor.js events
interface BlockMutationEvent {
  type: string;
  detail: {
    target: {
      name: string;
    };
    index?: number;
  };
}

interface EditorChangeEvent {
  type?: string;
  detail?: any;
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
  const [editorReady, setEditorReady] = useState(false);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const pendingUpdatesRef = useRef<OutputData[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { channel: workspaceChannel } = usePusherChannelContext();

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
              timestamp: Date.now(), // Add timestamp for conflict resolution
            }
          );

          if (response.data?.status !== "success") {
            toast.error(
              response.data?.message || "Failed to save document content"
            );
          }
        } catch (error: any) {
          if (error.response?.status === 409) {
            // Conflict detected - refresh content
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

  // Optimized debounced save
  const debouncedSave = useCallback(
    debounce(() => {
      onSaveDocumentContent();
    }, 800), // Increased delay to reduce server load
    [onSaveDocumentContent]
  );

  // Immediate save for critical updates
  const immediateSave = useCallback(
    debounce(
      () => {
        onSaveDocumentContent(true);
      },
      100,
      true
    ),
    [onSaveDocumentContent]
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
          editorRef.current?.render(content);
          lastSavedContentRef.current = JSON.stringify(content);
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
  }, [workspaceId, documentId]);

  // Batch process pending updates with better state preservation
  const processPendingUpdates = useCallback(async () => {
    if (
      pendingUpdatesRef.current.length === 0 ||
      isProcessingExternalUpdateRef.current
    ) {
      return;
    }

    const latestUpdate =
      pendingUpdatesRef.current[pendingUpdatesRef.current.length - 1];
    pendingUpdatesRef.current = [];

    if (editorRef.current) {
      const currentState = captureEditorState();

      try {
        isProcessingExternalUpdateRef.current = true;

        // Show collaboration indicator
        setIsCollaborating(true);

        // Get current content to compare
        const currentContent = await editorRef.current.save();
        const currentContentString = JSON.stringify(currentContent);
        const newContentString = JSON.stringify(latestUpdate);

        // Only update if content is actually different
        if (currentContentString !== newContentString) {
          await editorRef.current.render(latestUpdate);
          lastSavedContentRef.current = JSON.stringify(latestUpdate);

          // Restore state with longer delay to ensure render is complete
          restoreEditorState(currentState, 200);
        }

        // Hide collaboration indicator after animation
        setTimeout(() => {
          setIsCollaborating(false);
        }, 800);
      } catch (error) {
        console.error("Error processing update:", error);
      } finally {
        setTimeout(() => {
          isProcessingExternalUpdateRef.current = false;
        }, 300);
      }
    }
  }, [captureEditorState, restoreEditorState]);

  const initEditor = useCallback(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      editorRef.current = new EditorJS({
        placeholder: placeholder,
        onChange: (api, event) => {
          // Handle different event types safely
          let eventType = "";

          if (Array.isArray(event)) {
            // If event is an array, get the first event's type
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
        },
      });
    }
  }, [debouncedSave, immediateSave, getDocumentContent, placeholder]);

  useEffect(() => {
    if (!workspaceChannel || !userEmail || !editorReady) return;

    console.log(
      "Setting up Pusher listeners for document content:",
      documentId
    );

    const handleDocumentContentUpdated = async (data: {
      content: OutputData;
      documentId: string;
      editorEmail: string;
      timestamp?: number;
    }) => {
      console.log("🔥 EVENT RECEIVED document-content-updated:", data);

      if (data.documentId === documentId && data.editorEmail !== userEmail) {
        // Add to pending updates queue
        pendingUpdatesRef.current.push(data.content);

        // Clear existing timeout and set new one
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        // Process updates with a slightly longer delay to reduce flicker
        updateTimeoutRef.current = setTimeout(() => {
          processPendingUpdates();
        }, 150);
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

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [
    workspaceChannel,
    documentId,
    userEmail,
    editorReady,
    processPendingUpdates,
  ]);

  // Enhanced model response appending with smooth scrolling
  const appendModelResponse = useCallback(
    async (response: any) => {
      if (!editorRef.current) return;

      try {
        const currentContent = await editorRef.current.save();
        let newBlock;

        if (response && response.blocks) {
          newBlock = response.blocks.map((block: any) => {
            if (block.type === "paragraph" && block.data.text) {
              let text = block.data.text;
              const inlineTools = [];

              const boldRegex = /\*\*(.*?)\*\*/g;
              let match;

              while ((match = boldRegex.exec(text)) !== null) {
                const boldText = match[1];
                const startIndex = match.index;
                inlineTools.push({
                  offset: startIndex,
                  length: boldText.length,
                  type: "bold",
                });
                text = text.replace(`**${boldText}**`, boldText);
              }

              return {
                ...block,
                data: {
                  ...block.data,
                  text: text,
                  inlineToolbar: inlineTools,
                },
              };
            }
            return block;
          });
        } else {
          newBlock = [
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
          time: new Date().getTime(),
          blocks: [...(currentContent.blocks || []), ...newBlock],
          version: currentContent.version || "2.30.8",
        };

        await editorRef.current.render(updatedContent);

        // Smooth scroll to new content
        setTimeout(() => {
          if (editorRef.current) {
            const lastBlockIndex = updatedContent.blocks.length - 1;
            editorRef.current.caret.setToBlock(lastBlockIndex, "end");

            // Smooth scroll into view
            const editorElement = document.getElementById("editorjs");
            if (editorElement) {
              const lastBlock = editorElement.lastElementChild;
              lastBlock?.scrollIntoView({
                behavior: "smooth",
                block: "end",
              });
            }
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
      {/* Collaboration indicator - moved to left */}
      {isCollaborating && (
        <div className="fixed top-4 left-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-md text-sm shadow-lg">
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
      `}</style>
    </div>
  );
};

export default DocumentNoteEditor;
