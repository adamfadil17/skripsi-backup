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

  // Streamlined save function
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

          await axios.put(
            `/api/workspace/${workspaceId}/document/${documentId}/content/`,
            {
              content: formattedContent,
              userEmail: userEmail,
              timestamp: Date.now(),
            }
          );
        } catch (error: any) {
          if (error.response?.status === 409) {
            await getDocumentContent();
          } else {
            toast.error("Failed to save document");
          }
        }
      }
    },
    [workspaceId, documentId, userEmail]
  );

  // Immediate save with minimal delay
  const debouncedSave = useCallback(
    debounce(() => {
      onSaveDocumentContent();
    }, 300),
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

  // Simplified update processing for immediate response
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

        const currentContent = await editorRef.current.save();
        const currentContentString = JSON.stringify(currentContent);
        const newContentString = JSON.stringify(latestUpdate);

        if (currentContentString !== newContentString) {
          await editorRef.current.render(latestUpdate);
          lastSavedContentRef.current = JSON.stringify(latestUpdate);
        }
      } catch (error) {
        console.error("Error processing update:", error);
      } finally {
        isProcessingExternalUpdateRef.current = false;
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

  // Streamlined Pusher integration for immediate updates
  useEffect(() => {
    if (!workspaceChannel || !userEmail || !editorReady) return;

    const handleDocumentContentUpdated = async (data: {
      content: OutputData;
      documentId: string;
      editorEmail: string;
    }) => {
      if (data.documentId === documentId && data.editorEmail !== userEmail) {
        pendingUpdatesRef.current.push(data.content);
        // Immediate processing for smooth updates
        setTimeout(() => {
          processPendingUpdates();
        }, 50);
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
