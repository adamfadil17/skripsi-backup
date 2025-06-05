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
import { usePusherChannelContext } from "../../components/PusherChannelProvider";

interface DocumentNoteEditorProps {
  workspaceId: string;
  documentId: string;
  modelResponse?: any;
  placeholder?: string;
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
  const [isUploading, setIsUploading] = useState(false);
  const pendingUpdatesRef = useRef<OutputData[]>([]);

  const { channel: workspaceChannel } = usePusherChannelContext();

  // Simplified debounce for immediate response
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Enhanced save with better conflict resolution and retry logic
  const onSaveDocumentContent = useCallback(
    async (force = false, retryCount = 0) => {
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
              version: outputData.version || "2.30.8", // Add version for conflict detection
            }
          );

          if (response.data?.status === "success") {
            // Update last saved content only on successful save
            lastSavedContentRef.current = contentString;
          }
        } catch (error: any) {
          if (error.response?.status === 409) {
            // Conflict detected - implement retry with exponential backoff
            if (retryCount < 3) {
              console.log(
                `Conflict detected, retrying... (${retryCount + 1}/3)`
              );

              // Wait before retry with exponential backoff
              const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
              setTimeout(() => {
                // Refresh content first, then retry save
                getDocumentContent().then(() => {
                  onSaveDocumentContent(true, retryCount + 1);
                });
              }, delay);
            } else {
              // Max retries reached, show user-friendly message
              toast.error(
                "Document updated by another user. Please refresh the page."
              );
            }
          } else {
            // Only show error for non-conflict issues
            console.error("Save error:", error);
            if (retryCount === 0) {
              // Only show toast on first attempt
              toast.error("Failed to save document");
            }
          }
        }
      }
    },
    [workspaceId, documentId, userEmail]
  );

  // Longer debounce to reduce conflicts
  const debouncedSave = useCallback(
    debounce(() => {
      onSaveDocumentContent();
    }, 1000), // Increased from 300ms to 1000ms
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
        }
        isFetchedRef.current = true;
        setEditorReady(true);
      } catch (error: any) {
        toast.error("Failed to load document content");
      }
    }
  }, [workspaceId, documentId]);

  // Improved update processing with conflict prevention
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
      try {
        isProcessingExternalUpdateRef.current = true;

        // Get current content hash for comparison
        const currentContent = await editorRef.current.save();
        const currentHash = JSON.stringify(currentContent);
        const newHash = JSON.stringify(latestUpdate);

        // Only update if content is actually different
        if (currentHash !== newHash) {
          // Store current cursor position
          let currentBlockIndex = 0;
          try {
            currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();
          } catch (e) {
            // Ignore cursor position errors
          }

          await editorRef.current.render(latestUpdate);
          lastSavedContentRef.current = JSON.stringify(latestUpdate);

          // Restore cursor position after a short delay
          setTimeout(() => {
            if (editorRef.current && currentBlockIndex >= 0) {
              try {
                const totalBlocks = editorRef.current.blocks.getBlocksCount();
                const targetIndex = Math.min(
                  currentBlockIndex,
                  totalBlocks - 1
                );
                if (targetIndex >= 0) {
                  editorRef.current.caret.setToBlock(targetIndex, "end");
                }
              } catch (e) {
                // Ignore cursor restoration errors
              }
            }
          }, 100);
        }
      } catch (error) {
        console.error("Error processing update:", error);
      } finally {
        // Reset flag after a short delay to prevent race conditions
        setTimeout(() => {
          isProcessingExternalUpdateRef.current = false;
        }, 200);
      }
    }
  }, []);

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
          return { success: 1, file: { url: data.secure_url } };
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        toast.error("Failed to upload image");
        return { success: 0, file: { url: "" } };
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
        onChange: () => {
          debouncedSave();
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
          inlineCode: { class: InlineCode, shortcut: "CMD+SHIFT+M" },
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
  }, [debouncedSave, getDocumentContent, placeholder, handleImageUploadSimple]);

  const appendModelResponse = useCallback(
    async (response: any) => {
      if (!editorRef.current) return;

      try {
        const currentContent = await editorRef.current.save();
        let newBlock;

        if (response && response.blocks) {
          newBlock = response.blocks;
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

  // Optimized Pusher integration with reduced update frequency
  useEffect(() => {
    if (!workspaceChannel || !userEmail || !editorReady) return;

    let updateTimeout: NodeJS.Timeout;

    const handleDocumentContentUpdated = async (data: {
      content: OutputData;
      documentId: string;
      editorEmail: string;
      timestamp?: number;
    }) => {
      if (data.documentId === documentId && data.editorEmail !== userEmail) {
        // Clear existing timeout
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }

        // Add to pending updates
        pendingUpdatesRef.current.push(data.content);

        // Process updates with slight delay to batch multiple rapid changes
        updateTimeout = setTimeout(() => {
          processPendingUpdates();
        }, 200); // Increased delay to batch updates
      }
    };

    workspaceChannel.bind(
      "document-content-updated",
      handleDocumentContentUpdated
    );

    return () => {
      workspaceChannel.unbind(
        "document-content-updated",
        handleDocumentContentUpdated
      );
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  }, [
    workspaceChannel,
    documentId,
    userEmail,
    editorReady,
    processPendingUpdates,
  ]);

  function convertEditorDataToHtml(data: OutputData): OutputData {
    return data; // Simplified - no complex transformations
  }

  return (
    <div className="w-full relative">
      {/* Only keep image upload indicator */}
      {isUploading && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-3 py-2 rounded text-sm shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-3 w-3 border-2 border-white rounded-full border-t-transparent"></div>
            <span>Uploading...</span>
          </div>
        </div>
      )}

      <div id="editorjs" className="prose max-w-none w-full"></div>

      <style jsx>{`
        :global(.codex-editor__redactor) {
          padding-bottom: 300px !important;
        }
        :global(.ce-paragraph[data-placeholder]:empty::before) {
          content: attr(data-placeholder);
          color: #a1a1aa;
          font-style: italic;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

export default DocumentNoteEditor;
