"use client";

import type React from "react";
import { useSession } from "next-auth/react";
import { useRef, useEffect, useCallback, useState } from "react";
import EditorJS, {
  type ToolConstructable,
  type OutputData,
  type BlockToolData,
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
import { pusherClient } from "@/lib/pusher";

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
  activeBlockId?: string;
  selection?: {
    start: number;
    end: number;
  };
}

interface BlockChangeEvent {
  type: string;
  detail: {
    target: {
      id: string;
      name: string;
    };
    data: BlockToolData;
  };
}

// Define a consistent type for current editing block
interface CurrentEditingBlock {
  index: number;
  content: string;
  cursorPos: number;
  timestamp: number;
}

// Operational Transform untuk menangani konflik editing
class OperationalTransform {
  static transformContent(
    localContent: OutputData,
    remoteContent: OutputData,
    currentEditingBlock?: { index: number; content: string; cursorPos: number }
  ): OutputData {
    if (!currentEditingBlock) {
      return remoteContent;
    }

    const transformedBlocks = [...remoteContent.blocks];

    // Jika user sedang mengedit blok tertentu, prioritaskan konten lokal untuk blok tersebut
    if (
      currentEditingBlock.index < transformedBlocks.length &&
      transformedBlocks[currentEditingBlock.index]?.type === "paragraph"
    ) {
      const localBlock = localContent.blocks[currentEditingBlock.index];
      const remoteBlock = transformedBlocks[currentEditingBlock.index];

      if (
        localBlock &&
        remoteBlock &&
        localBlock.type === "paragraph" &&
        remoteBlock.type === "paragraph"
      ) {
        // Merge konten dengan prioritas pada teks yang sedang diketik
        const mergedText = this.mergeTextContent(
          localBlock.data.text || "",
          remoteBlock.data.text || "",
          currentEditingBlock.cursorPos
        );

        transformedBlocks[currentEditingBlock.index] = {
          ...remoteBlock,
          data: {
            ...remoteBlock.data,
            text: mergedText,
          },
        };
      }
    }

    return {
      ...remoteContent,
      blocks: transformedBlocks,
    };
  }

  private static mergeTextContent(
    localText: string,
    remoteText: string,
    cursorPos: number
  ): string {
    // Jika teks remote kosong atau sama dengan lokal, gunakan lokal
    if (!remoteText || remoteText === localText) {
      return localText;
    }

    // Jika teks lokal kosong, gunakan remote
    if (!localText) {
      return remoteText;
    }

    // Strategi merge: pertahankan perubahan di sekitar cursor position
    const beforeCursor = localText.substring(0, cursorPos);
    const afterCursor = localText.substring(cursorPos);

    // Cari common prefix dan suffix untuk mendeteksi perubahan
    let commonPrefix = "";
    let commonSuffix = "";

    const minLength = Math.min(localText.length, remoteText.length);

    // Find common prefix
    for (let i = 0; i < minLength; i++) {
      if (localText[i] === remoteText[i]) {
        commonPrefix += localText[i];
      } else {
        break;
      }
    }

    // Find common suffix
    for (let i = 0; i < minLength - commonPrefix.length; i++) {
      const localChar = localText[localText.length - 1 - i];
      const remoteChar = remoteText[remoteText.length - 1 - i];
      if (localChar === remoteChar) {
        commonSuffix = localChar + commonSuffix;
      } else {
        break;
      }
    }

    // Jika cursor berada di area yang berubah, prioritaskan konten lokal
    if (
      cursorPos > commonPrefix.length &&
      cursorPos < localText.length - commonSuffix.length
    ) {
      return localText;
    }

    return remoteText;
  }
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
  const [isUploading, setIsUploading] = useState(false);
  const pendingUpdatesRef = useRef<OutputData[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentEditingBlockRef = useRef<CurrentEditingBlock | null>(null);
  const lastServerTimestampRef = useRef<number>(0);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced debounce with priority handling
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

  // Helper function to convert CurrentEditingBlock to the format expected by OperationalTransform
  const getCurrentEditingBlockForTransform = useCallback((): { index: number; content: string; cursorPos: number } | undefined => {
    if (!currentEditingBlockRef.current) {
      return undefined;
    }
    
    const { index, content, cursorPos } = currentEditingBlockRef.current;
    return { index, content, cursorPos };
  }, []);

  // Capture current editor state dengan detail yang lebih lengkap
  const captureEditorState = useCallback((): EditorState | null => {
    if (!editorRef.current) return null;

    try {
      const currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();
      const currentBlock =
        editorRef.current.blocks.getBlockByIndex(currentBlockIndex);
      const editorElement = document.getElementById("editorjs");
      const scrollTop = editorElement?.scrollTop || window.scrollY;

      // Capture selection/cursor position
      const selection = window.getSelection();
      let selectionData = undefined;

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        selectionData = {
          start: range.startOffset,
          end: range.endOffset,
        };
      }

      // Update current editing block tracking
      if (currentBlock && currentBlock.holder) {
        const blockContent = currentBlock.holder.textContent || "";
        currentEditingBlockRef.current = {
          index: currentBlockIndex,
          content: blockContent,
          cursorPos: selectionData?.start || 0,
          timestamp: Date.now(),
        };
      }

      return {
        blockIndex: currentBlockIndex >= 0 ? currentBlockIndex : 0,
        caretPosition: "end" as const,
        blockContent: currentBlock?.holder?.textContent || "",
        scrollTop: scrollTop,
        activeBlockId: currentBlock?.id,
        selection: selectionData,
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

  // Restore editor state dengan preservasi yang lebih baik
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

            // Restore scroll position first
            const editorElement = document.getElementById("editorjs");
            if (editorElement && state.scrollTop > 0) {
              editorElement.scrollTop = state.scrollTop;
            }

            // Restore cursor position dengan lebih presisi
            if (targetIndex >= 0 && totalBlocks > 0) {
              const targetBlock =
                editorRef.current.blocks.getBlockByIndex(targetIndex);
              if (targetBlock && targetBlock.holder) {
                editorRef.current.caret.setToBlock(
                  targetIndex,
                  state.caretPosition
                );

                // Restore selection jika ada
                if (state.selection && targetBlock.holder.firstChild) {
                  setTimeout(() => {
                    try {
                      const textNode = targetBlock.holder.firstChild;
                      const range = document.createRange();
                      const selection = window.getSelection();

                      if (textNode && textNode.textContent) {
                        const maxPos = textNode.textContent.length;
                        const startPos = Math.min(
                          state.selection!.start,
                          maxPos
                        );
                        const endPos = Math.min(state.selection!.end, maxPos);

                        range.setStart(textNode, startPos);
                        range.setEnd(textNode, endPos);

                        selection?.removeAllRanges();
                        selection?.addRange(range);
                      }
                    } catch (selectionError) {
                      console.log(
                        "Could not restore selection:",
                        selectionError
                      );
                    }
                  }, 50);
                }
              }
            }
          } catch (error) {
            console.log("Could not restore editor state:", error);
          }
        }
      }, delay);
    },
    []
  );

  // Enhanced save dengan conflict resolution dan timestamp
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
              currentEditingBlock: currentEditingBlockRef.current,
            }
          );

          if (response.data?.status === "success") {
            lastServerTimestampRef.current =
              response.data.data.timestamp || Date.now();
          } else {
            toast.error(
              response.data?.message || "Failed to save document content"
            );
          }
        } catch (error: any) {
          if (error.response?.status === 409) {
            // Conflict detected - handle gracefully
            const conflictData = error.response.data.data;
            if (conflictData?.serverContent) {
              // Apply operational transform
              const currentContent = await editorRef.current.save();
              const transformedContent = OperationalTransform.transformContent(
                currentContent,
                conflictData.serverContent,
                getCurrentEditingBlockForTransform()
              );

              // Apply transformed content without disrupting current editing
              await handleContentUpdate(transformedContent, true);

              toast.error("Document synchronized with other changes", {
                duration: 2000,
              });
            }
          } else {
            toast.error(
              error.response?.data?.message || "An unexpected error occurred."
            );
          }
        }
      }
    },
    [workspaceId, documentId, userEmail, getCurrentEditingBlockForTransform]
  );

  // Typing detection
  const handleTypingStart = useCallback(() => {
    isTypingRef.current = true;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout untuk mendeteksi ketika user berhenti mengetik
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      currentEditingBlockRef.current = null;
    }, 2000); // 2 detik setelah berhenti mengetik
  }, []);

  // Optimized debounced save dengan typing detection
  const debouncedSave = useCallback(
    debounce(() => {
      if (!isTypingRef.current) {
        onSaveDocumentContent();
      }
    }, 1000),
    [onSaveDocumentContent]
  );

  // Immediate save untuk operasi penting
  const immediateSave = useCallback(
    debounce(
      () => {
        onSaveDocumentContent(true);
      },
      200,
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
          lastServerTimestampRef.current =
            response.data.data.timestamp || Date.now();

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

  // Enhanced content update handler
  const handleContentUpdate = useCallback(
    async (updateData: OutputData, skipStateCapture = false) => {
      if (!editorRef.current || isProcessingExternalUpdateRef.current) {
        return;
      }

      const currentState = skipStateCapture ? null : captureEditorState();

      try {
        isProcessingExternalUpdateRef.current = true;
        setIsCollaborating(true);

        // Get current content to compare
        const currentContent = await editorRef.current.save();

        // Apply operational transform jika user sedang mengetik
        const transformedContent = OperationalTransform.transformContent(
          currentContent,
          updateData,
          getCurrentEditingBlockForTransform()
        );

        const currentContentString = JSON.stringify(currentContent);
        const newContentString = JSON.stringify(transformedContent);

        // Only update if content is actually different
        if (currentContentString !== newContentString) {
          await editorRef.current.render(transformedContent);
          lastSavedContentRef.current = JSON.stringify(transformedContent);

          // Restore state dengan delay yang disesuaikan
          if (currentState && !skipStateCapture) {
            const delay = isTypingRef.current ? 50 : 150;
            restoreEditorState(currentState, delay);
          }
        }

        // Hide collaboration indicator
        setTimeout(() => {
          setIsCollaborating(false);
        }, 1000);
      } catch (error) {
        console.error("Error processing update:", error);
      } finally {
        setTimeout(() => {
          isProcessingExternalUpdateRef.current = false;
        }, 200);
      }
    },
    [captureEditorState, restoreEditorState, getCurrentEditingBlockForTransform]
  );

  // Process pending updates dengan prioritas
  const processPendingUpdates = useCallback(async () => {
    if (
      pendingUpdatesRef.current.length === 0 ||
      isProcessingExternalUpdateRef.current
    ) {
      return;
    }

    // Jika user sedang mengetik, tunda update
    if (isTypingRef.current) {
      setTimeout(() => processPendingUpdates(), 500);
      return;
    }

    const latestUpdate =
      pendingUpdatesRef.current[pendingUpdatesRef.current.length - 1];
    pendingUpdatesRef.current = [];

    await handleContentUpdate(latestUpdate);
  }, [handleContentUpdate]);

  // Setup Pusher untuk real-time collaboration
  useEffect(() => {
    if (!workspaceId || !session?.user?.email) return;

    const channel = pusherClient.subscribe(`workspace-${workspaceId}`);

    channel.bind("document-content-updated", (data: any) => {
      // Ignore updates from current user
      if (data.editorEmail === session.user?.email) {
        return;
      }

      // Check timestamp untuk menghindari update yang sudah outdated
      if (data.timestamp && lastServerTimestampRef.current) {
        const updateTime = new Date(data.timestamp).getTime();
        if (updateTime <= lastServerTimestampRef.current) {
          return; // Skip outdated update
        }
      }

      if (data.content && data.documentId === documentId) {
        pendingUpdatesRef.current.push(data.content);

        // Process update immediately jika user tidak sedang mengetik
        if (!isTypingRef.current) {
          processPendingUpdates();
        }
      }
    });

    return () => {
      channel.unbind("document-content-updated");
      pusherClient.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId, documentId, session, processPendingUpdates]);

  // Image upload handler
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
          // Detect typing
          handleTypingStart();

          // Handle different event types
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

          // Capture current editing state
          captureEditorState();

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
  }, [
    debouncedSave,
    immediateSave,
    getDocumentContent,
    placeholder,
    handleImageUploadSimple,
    handleTypingStart,
    captureEditorState,
  ]);

  // Enhanced model response appending
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

  // Cleanup function
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

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
      {/* Enhanced collaboration indicator */}
      {isCollaborating && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-2 rounded-md text-sm shadow-lg transition-all duration-300">
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
            <span>Syncing with collaborators...</span>
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

export default DocumentNoteEditor;
