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

  // Get the Pusher channel from context
  const { channel: workspaceChannel } = usePusherChannelContext();

  // Debounce function to limit the frequency of function calls
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const saveDocument = useCallback(async () => {
    if (
      editorRef.current &&
      !isProcessingExternalUpdateRef.current &&
      userEmail
    ) {
      try {
        const outputData = await editorRef.current.save();
        // Convert inlineToolbar to <b> tags before saving
        const formattedContent = convertEditorDataToHtml(outputData);

        // Check if content has actually changed to avoid unnecessary saves
        const contentString = JSON.stringify(formattedContent);
        if (contentString === lastSavedContentRef.current) {
          return; // Skip save if content hasn't changed
        }

        lastSavedContentRef.current = contentString;

        const response = await axios.put(
          `/api/workspace/${workspaceId}/document/${documentId}/content/`,
          {
            content: formattedContent,
            userEmail: userEmail,
          }
        );

        if (response.data?.status !== "success") {
          toast.error(
            response.data?.message || "Failed to save document content"
          );
        }
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "An unexpected error occurred."
        );
      }
    }
  }, [workspaceId, documentId, userEmail]);

  // Add debounced save to prevent too many saves during typing
  const debouncedSave = useCallback(
    debounce(() => {
      saveDocument();
    }, 500),
    [saveDocument]
  );

  const getDocumentOutput = useCallback(async () => {
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
          // Store the initial content hash to avoid duplicate saves
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

  // Image upload handler
  const handleImageUpload = useCallback(
    async (file: File): Promise<{ success: number; file: { url: string } }> => {
      try {
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
      }
    },
    [workspaceId, documentId]
  );

  const initEditor = useCallback(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      editorRef.current = new EditorJS({
        onChange: () => {
          debouncedSave();
        },
        onReady: () => {
          getDocumentOutput();
        },
        holder: "editorjs",
        tools: {
          header: Header,
          delimiter: Delimiter,
          paragraph: {
            class: Paragraph as unknown as ToolConstructable,
            inlineToolbar: true,
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
              uploader: { uploadByFile: handleImageUpload },
              captionPlaceholder: "Add image caption...",
              withBorder: true,
              withBackground: false,
              stretched: false,
            },
          },
        },
      });
    }
  }, [debouncedSave, getDocumentOutput, handleImageUpload]);

  // Set up Pusher event listeners for real-time updates
  useEffect(() => {
    if (!workspaceChannel || !userEmail || !editorReady) return;

    console.log(
      "Setting up Pusher listeners for document content:",
      documentId
    );

    // Document content update event handler
    const handleDocumentContentUpdated = async (data: {
      content: OutputData;
      documentId: string;
      editorEmail: string;
    }) => {
      console.log("🔥 EVENT RECEIVED document-content-updated:", data);

      // Only update if it's the current document and not from the current user
      if (data.documentId === documentId && data.editorEmail !== userEmail) {
        if (editorRef.current) {
          try {
            // Set flag to prevent triggering another save
            isProcessingExternalUpdateRef.current = true;

            // Store cursor position
            const currentBlockIndex =
              editorRef.current.blocks.getCurrentBlockIndex();
            const cursorPosition = "end";

            // Update the editor content
            await editorRef.current.render(data.content);

            // Update the last saved content to prevent duplicate saves
            lastSavedContentRef.current = JSON.stringify(data.content);

            // Restore cursor position
            setTimeout(() => {
              if (editorRef.current && currentBlockIndex !== undefined) {
                try {
                  // Try to restore cursor to the same block if it still exists
                  if (
                    editorRef.current.blocks.getBlockByIndex(currentBlockIndex)
                  ) {
                    editorRef.current.caret.setToBlock(
                      currentBlockIndex,
                      cursorPosition
                    );
                  }
                } catch (e) {
                  console.log("Could not restore cursor position", e);
                }

                // Reset the flag after a short delay to ensure rendering is complete
                setTimeout(() => {
                  isProcessingExternalUpdateRef.current = false;
                }, 100);
              }
            }, 100);
          } catch (error) {
            console.error("Error updating editor content:", error);
            isProcessingExternalUpdateRef.current = false;
          }
        }
      }
    };

    // Subscribe to document content events
    workspaceChannel.bind(
      "document-content-updated",
      handleDocumentContentUpdated
    );

    // Cleanup
    return () => {
      console.log("Cleaning up Pusher listeners for document content");
      workspaceChannel.unbind(
        "document-content-updated",
        handleDocumentContentUpdated
      );
    };
  }, [workspaceChannel, documentId, userEmail, editorReady]);

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

              // Find bold sections using Markdown syntax (**bold text**)
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
                text = text.replace(`**${boldText}**`, boldText); // Remove the markdown bold characters
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

        setTimeout(() => {
          if (editorRef.current) {
            const lastBlockIndex = updatedContent.blocks.length - 1;
            editorRef.current.caret.setToBlock(lastBlockIndex, "end");
          }
        }, 300);

        saveDocument();
      } catch (error) {
        console.error("Error appending model response:", error);
      }
    },
    [saveDocument]
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

  // Function to convert Editor.js data to HTML with <b> tags
  function convertEditorDataToHtml(data: OutputData): OutputData {
    const newData = { ...data };
    newData.blocks = newData.blocks.map((block) => {
      if (block.type === "paragraph" && block.data.inlineToolbar) {
        let text = block.data.text;
        const inlineTools = [...block.data.inlineToolbar];

        // Sort inline tools by offset (descending) to apply them correctly
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
            // Remove inlineToolbar after conversion
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
      <div
        id="editorjs"
        className="prose max-w-none w-full"
        data-placeholder={placeholder}
      ></div>

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
