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
import Pusher from "pusher-js";
import { Badge } from "@/components/ui/badge";
import { Check, Wifi, WifiOff } from "lucide-react";

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

interface ActiveUser {
  email: string;
  lastActive: number;
}

const DocumentNoteEditor: React.FC<DocumentNoteEditorProps> = ({
  workspaceId,
  documentId,
  modelResponse,
  placeholder = "Start writing your notes here...",
}) => {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  // Core refs
  const editorRef = useRef<EditorJS | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevModelResponseRef = useRef<any>(null);

  // State
  const [editorReady, setEditorReady] = useState(false);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("connecting");
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  // Pusher refs
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const isExternalUpdateRef = useRef(false);

  // Enhanced debounce function
  const debounce = useCallback((func: Function, wait: number) => {
    return function executedFunction(...args: any[]) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }, []);

  // Save document content with optimized conflict resolution
  const saveDocumentContent = useCallback(async () => {
    if (!editorRef.current || !userEmail || isExternalUpdateRef.current) return;

    try {
      const outputData = await editorRef.current.save();
      const contentString = JSON.stringify(outputData);

      // Don't save if content hasn't changed
      if (contentString === lastSavedContentRef.current) return;

      lastSavedContentRef.current = contentString;

      const response = await axios.put(
        `/api/workspace/${workspaceId}/document/${documentId}/content/`,
        {
          content: outputData,
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
      console.error("Save error:", error);
      toast.error("Failed to save changes. Please try again.");
    }
  }, [workspaceId, documentId, userEmail]);

  // Optimized debounced save
  const debouncedSave = useCallback(
    debounce(() => saveDocumentContent(), 800),
    [saveDocumentContent, debounce]
  );

  // Fetch document content
  const getDocumentContent = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/workspace/${workspaceId}/document/${documentId}/content/`
      );

      if (response.data?.status === "success" && response.data.data?.content) {
        const content = response.data.data.content;

        if (editorRef.current) {
          await editorRef.current.render(content);
          lastSavedContentRef.current = JSON.stringify(content);
        }
      } else {
        toast.error(
          response.data?.message || "Failed to load document content."
        );
      }

      setEditorReady(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "An unexpected error occurred."
      );
    }
  }, [workspaceId, documentId]);

  // Handle external updates from Pusher
  const handleExternalUpdate = useCallback(
    async (data: any) => {
      if (!editorRef.current || data.userEmail === userEmail) return;

      try {
        // Show collaboration indicator
        setIsCollaborating(true);

        // Mark that we're processing an external update
        isExternalUpdateRef.current = true;

        // Get current cursor position
        const currentBlockIndex =
          editorRef.current.blocks.getCurrentBlockIndex();
        const scrollPosition = window.scrollY;

        // Update editor content
        await editorRef.current.render(data.content);
        lastSavedContentRef.current = JSON.stringify(data.content);

        // Restore cursor position if possible
        setTimeout(() => {
          if (editorRef.current) {
            const totalBlocks = editorRef.current.blocks.getBlocksCount();
            if (currentBlockIndex >= 0 && currentBlockIndex < totalBlocks) {
              editorRef.current.caret.setToBlock(currentBlockIndex, "end");
            }
            window.scrollTo(0, scrollPosition);
          }

          // Reset flags
          isExternalUpdateRef.current = false;

          // Hide collaboration indicator after animation
          setTimeout(() => {
            setIsCollaborating(false);
          }, 800);
        }, 100);
      } catch (error) {
        console.error("Error handling external update:", error);
        isExternalUpdateRef.current = false;
        setIsCollaborating(false);
      }
    },
    [userEmail]
  );

  // Handle user presence
  const handleUserPresence = useCallback((data: any) => {
    setActiveUsers((prev) => {
      // Filter out old entries for this user
      const filtered = prev.filter((user) => user.email !== data.userEmail);

      // Add the new entry
      return [
        ...filtered,
        {
          email: data.userEmail,
          lastActive: Date.now(),
        },
      ];
    });
  }, []);

  // Clean up stale users
  const cleanupStaleUsers = useCallback(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    setActiveUsers((prev) =>
      prev.filter((user) => user.lastActive > fiveMinutesAgo)
    );
  }, []);

  // Initialize Pusher
  const initializePusher = useCallback(() => {
    if (!userEmail) return;

    // Clean up existing connection if any
    if (pusherRef.current) {
      pusherRef.current.disconnect();
    }

    // Create new Pusher instance
    pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      forceTLS: true,
    });

    // Subscribe to document channel
    const channelName = `document-${documentId}`;
    channelRef.current = pusherRef.current.subscribe(channelName);

    // Set up event handlers
    channelRef.current.bind("content-update", handleExternalUpdate);
    channelRef.current.bind("user-presence", handleUserPresence);

    // Handle connection states
    pusherRef.current.connection.bind("connected", () => {
      setConnectionStatus("connected");

      // Broadcast presence when connected
      broadcastPresence();
    });

    pusherRef.current.connection.bind("connecting", () => {
      setConnectionStatus("connecting");
    });

    pusherRef.current.connection.bind("disconnected", () => {
      setConnectionStatus("disconnected");
    });

    pusherRef.current.connection.bind("failed", () => {
      setConnectionStatus("disconnected");
      toast.error(
        "Real-time connection failed. Some changes may not sync automatically."
      );
    });

    // Set up interval to clean up stale users
    const interval = setInterval(cleanupStaleUsers, 60000);

    return () => {
      clearInterval(interval);
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [
    documentId,
    userEmail,
    handleExternalUpdate,
    handleUserPresence,
    cleanupStaleUsers,
  ]);

  // Broadcast user presence
  const broadcastPresence = useCallback(async () => {
    if (!userEmail) return;

    try {
      await axios.post(
        `/api/workspace/${workspaceId}/document/${documentId}/presence`,
        {
          userEmail,
          timestamp: Date.now(),
        }
      );
    } catch (error) {
      console.error("Failed to broadcast presence:", error);
    }
  }, [workspaceId, documentId, userEmail]);

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

  // Initialize editor
  const initEditor = useCallback(() => {
    if (editorRef.current) return;

    editorRef.current = new EditorJS({
      placeholder: placeholder,
      onChange: () => {
        if (!isExternalUpdateRef.current) {
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
  }, [debouncedSave, getDocumentContent, placeholder, handleImageUploadSimple]);

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

        saveDocumentContent();
      } catch (error) {
        console.error("Error appending model response:", error);
      }
    },
    [saveDocumentContent]
  );

  // Initialize editor when session is available
  useEffect(() => {
    if (session) {
      initEditor();
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [session, initEditor]);

  // Initialize Pusher when user is authenticated
  useEffect(() => {
    if (userEmail) {
      const cleanup = initializePusher();
      return cleanup;
    }
  }, [userEmail, initializePusher]);

  // Broadcast presence periodically
  useEffect(() => {
    if (!userEmail) return;

    // Broadcast presence immediately
    broadcastPresence();

    // Then broadcast every minute
    const interval = setInterval(broadcastPresence, 60000);

    return () => clearInterval(interval);
  }, [userEmail, broadcastPresence]);

  // Handle model response changes
  useEffect(() => {
    if (
      modelResponse &&
      JSON.stringify(modelResponse) !==
        JSON.stringify(prevModelResponseRef.current) &&
      editorRef.current
    ) {
      appendModelResponse(modelResponse);
      prevModelResponseRef.current = modelResponse;
    }
  }, [modelResponse, appendModelResponse]);

  return (
    <div className="w-full relative">
      {/* Status indicators */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {connectionStatus === "connected" ? (
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
            >
              <Wifi className="h-3 w-3" />
              <span>Connected</span>
            </Badge>
          ) : connectionStatus === "connecting" ? (
            <Badge
              variant="outline"
              className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1"
            >
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <span>Connecting...</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1"
            >
              <WifiOff className="h-3 w-3" />
              <span>Disconnected</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {activeUsers.length > 0 && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              {activeUsers.length} active{" "}
              {activeUsers.length === 1 ? "user" : "users"}
            </Badge>
          )}
        </div>
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

      {/* Save status indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        {saveTimeoutRef.current ? (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"
          >
            <div className="animate-spin h-3 w-3 border border-blue-700 rounded-full border-t-transparent"></div>
            <span>Saving...</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 opacity-70"
          >
            <Check className="h-3 w-3" />
            <span>Saved</span>
          </Badge>
        )}
      </div>

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
