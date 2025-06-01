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

  const { channel: workspaceChannel } = usePusherChannelContext();

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

  const onSaveDocumentContent = useCallback(async () => {
    if (
      editorRef.current &&
      !isProcessingExternalUpdateRef.current &&
      userEmail
    ) {
      try {
        const outputData = await editorRef.current.save();
        const formattedContent = convertEditorDataToHtml(outputData);

        const contentString = JSON.stringify(formattedContent);
        if (contentString === lastSavedContentRef.current) {
          return;
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

  const debouncedSave = useCallback(
    debounce(() => {
      onSaveDocumentContent();
    }, 500),
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
  }, [debouncedSave, getDocumentContent, placeholder]);

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
    }) => {
      console.log("🔥 EVENT RECEIVED document-content-updated:", data);

      if (data.documentId === documentId && data.editorEmail !== userEmail) {
        if (editorRef.current) {
          try {
            isProcessingExternalUpdateRef.current = true;

            const currentBlockIndex =
              editorRef.current.blocks.getCurrentBlockIndex();
            const cursorPosition = "end";

            await editorRef.current.render(data.content);

            lastSavedContentRef.current = JSON.stringify(data.content);

            // Restore cursor position
            setTimeout(() => {
              if (editorRef.current && currentBlockIndex !== undefined) {
                try {
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

        setTimeout(() => {
          if (editorRef.current) {
            const lastBlockIndex = updatedContent.blocks.length - 1;
            editorRef.current.caret.setToBlock(lastBlockIndex, "end");
          }
        }, 300);

        onSaveDocumentContent();
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
    <div className="w-full">
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
      `}</style>
    </div>
  );
};

export default DocumentNoteEditor;
