"use client";

import type React from "react";
import { useSession } from "next-auth/react";
import { useRef, useEffect, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import { createLowlight } from "lowlight";
import * as Y from "yjs";
import axios from "axios";
import toast from "react-hot-toast";
import { usePusherChannelContext } from "../../components/PusherChannelProvider";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  ImageIcon,
  TableIcon,
  Undo,
  Redo,
} from "lucide-react";

interface DocumentNoteEditorProps {
  workspaceId: string;
  documentId: string;
  modelResponse?: any;
  placeholder?: string;
}

// Create lowlight instance
const lowlight = createLowlight();

// Generate random colors for user cursors
const getRandomColor = () => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const DocumentNoteEditor: React.FC<DocumentNoteEditorProps> = ({
  workspaceId,
  documentId,
  modelResponse,
  placeholder = "Start writing your notes here...",
}) => {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const userName =
    session?.user?.name || userEmail?.split("@")[0] || "Anonymous";

  const [editorReady, setEditorReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastSavedContentRef = useRef<string>("");
  const isProcessingExternalUpdateRef = useRef(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<any>(null);

  // Get the Pusher channel from context
  const { channel: workspaceChannel } = usePusherChannelContext();

  // Initialize Yjs document
  useEffect(() => {
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
    }
    return () => {
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };
  }, []);

  // Debounce function
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
    if (editor && !isProcessingExternalUpdateRef.current && userEmail) {
      try {
        const content = editor.getJSON();
        const contentString = JSON.stringify(content);

        if (contentString === lastSavedContentRef.current) {
          return;
        }

        lastSavedContentRef.current = contentString;

        const response = await axios.put(
          `/api/workspace/${workspaceId}/document/${documentId}/content/`,
          {
            content: content,
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
      saveDocument();
    }, 1000),
    [saveDocument]
  );

  // Image upload handler
  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
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
          return data.secure_url;
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        console.error("Image upload error:", error);
        toast.error("Failed to upload image. Please try again.");
        throw error;
      }
    },
    [workspaceId, documentId]
  );

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // We'll use Yjs for history
      }),
      Underline, // Add the Underline extension
      Collaboration.configure({
        document: ydocRef.current!,
      }),
      CollaborationCursor.configure({
        provider: providerRef.current,
        user: {
          name: userName,
          color: getRandomColor(),
        },
      }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto",
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      debouncedSave();
    },
    onCreate: ({ editor }) => {
      setEditorReady(true);
      loadDocumentContent();
    },
  });

  const loadDocumentContent = useCallback(async () => {
    if (!editor) return;

    try {
      const response = await axios.get(
        `/api/workspace/${workspaceId}/document/${documentId}/content/`
      );

      if (response.data?.status === "success" && response.data.data?.content) {
        const content = response.data.data.content;
        editor.commands.setContent(content);
        lastSavedContentRef.current = JSON.stringify(content);
      }
      setIsLoading(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to load document content."
      );
      setIsLoading(false);
    }
  }, [workspaceId, documentId, editor]);

  // Handle Pusher real-time updates
  useEffect(() => {
    if (!workspaceChannel || !userEmail || !editor || !editorReady) return;

    const handleDocumentContentUpdated = async (data: {
      content: any;
      documentId: string;
      editorEmail: string;
    }) => {
      if (data.documentId === documentId && data.editorEmail !== userEmail) {
        if (editor && !editor.isDestroyed) {
          try {
            isProcessingExternalUpdateRef.current = true;

            // Get current selection
            const { from, to } = editor.state.selection;

            // Update content
            editor.commands.setContent(data.content, false);

            // Restore selection if possible
            setTimeout(() => {
              try {
                if (
                  from <= editor.state.doc.content.size &&
                  to <= editor.state.doc.content.size
                ) {
                  editor.commands.setTextSelection({ from, to });
                }
              } catch (e) {
                console.log("Could not restore selection", e);
              }

              isProcessingExternalUpdateRef.current = false;
            }, 100);

            lastSavedContentRef.current = JSON.stringify(data.content);
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
  }, [workspaceChannel, documentId, userEmail, editor, editorReady]);

  // Handle AI model response
  useEffect(() => {
    if (modelResponse && editor && editorReady) {
      try {
        if (modelResponse.blocks && Array.isArray(modelResponse.blocks)) {
          // Convert Editor.js format to TipTap format
          const tiptapContent = convertEditorJSToTipTap(modelResponse);

          // Get current content and append new content
          const currentContent = editor.getJSON();
          const newContent = {
            ...currentContent,
            content: [
              ...(currentContent.content || []),
              ...tiptapContent.content,
            ],
          };

          editor.commands.setContent(newContent);

          // Focus at the end
          setTimeout(() => {
            editor.commands.focus("end");
          }, 100);

          debouncedSave();
        }
      } catch (error) {
        console.error("Error appending model response:", error);
      }
    }
  }, [modelResponse, editor, editorReady, debouncedSave]);

  // Convert Editor.js format to TipTap format
  const convertEditorJSToTipTap = (editorJSData: any) => {
    const content: any[] = [];

    if (editorJSData.blocks) {
      editorJSData.blocks.forEach((block: any) => {
        switch (block.type) {
          case "paragraph":
            content.push({
              type: "paragraph",
              content: block.data.text
                ? [{ type: "text", text: block.data.text }]
                : [],
            });
            break;
          case "header":
            content.push({
              type: "heading",
              attrs: { level: block.data.level || 1 },
              content: [{ type: "text", text: block.data.text || "" }],
            });
            break;
          case "list":
            content.push({
              type:
                block.data.style === "ordered" ? "orderedList" : "bulletList",
              content: block.data.items.map((item: string) => ({
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: item }],
                  },
                ],
              })),
            });
            break;
          case "checklist":
            content.push({
              type: "taskList",
              content: block.data.items.map((item: any) => ({
                type: "taskItem",
                attrs: { checked: item.checked || false },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: item.text || "" }],
                  },
                ],
              })),
            });
            break;
          case "code":
            content.push({
              type: "codeBlock",
              content: [{ type: "text", text: block.data.code || "" }],
            });
            break;
          case "delimiter":
            content.push({
              type: "horizontalRule",
            });
            break;
          default:
            // Fallback to paragraph
            content.push({
              type: "paragraph",
              content: [{ type: "text", text: JSON.stringify(block.data) }],
            });
        }
      });
    }

    return { type: "doc", content };
  };

  // Toolbar component
  const Toolbar = () => {
    if (!editor) return null;

    return (
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50 rounded-t-lg">
        <Button
          variant={editor.isActive("bold") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("italic") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("underline") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("strike") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("code") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          variant={
            editor.isActive("heading", { level: 1 }) ? "default" : "ghost"
          }
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          variant={
            editor.isActive("heading", { level: 2 }) ? "default" : "ghost"
          }
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          variant={
            editor.isActive("heading", { level: 3 }) ? "default" : "ghost"
          }
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("orderedList") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("taskList") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          ☑️
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          variant={editor.isActive("blockquote") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Button
          variant={editor.isActive("codeBlock") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {"</>"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                try {
                  const url = await handleImageUpload(file);
                  editor.chain().focus().setImage({ src: url }).run();
                } catch (error) {
                  console.error("Failed to upload image:", error);
                }
              }
            };
            input.click();
          }}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <TableIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="animate-pulse text-lg">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <Toolbar />
        <div className="relative">
          <EditorContent
            editor={editor}
            className="prose prose-lg max-w-none p-6 min-h-[500px] focus:outline-none"
          />

          {/* Collaboration cursors will be rendered here automatically by TipTap */}
        </div>
      </div>

      <style jsx global>{`
        .ProseMirror {
          outline: none;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

        .collaboration-cursor__caret {
          position: relative;
          margin-left: -1px;
          margin-right: -1px;
          border-left: 1px solid #0d0d0d;
          border-right: 1px solid #0d0d0d;
          word-break: normal;
          pointer-events: none;
        }

        .collaboration-cursor__label {
          position: absolute;
          top: -1.4em;
          left: -1px;
          font-size: 12px;
          font-style: normal;
          font-weight: 600;
          line-height: normal;
          user-select: none;
          color: #0d0d0d;
          padding: 0.1rem 0.3rem;
          border-radius: 3px 3px 3px 0;
          white-space: nowrap;
        }

        .ProseMirror .tableWrapper {
          overflow-x: auto;
        }

        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }

        .ProseMirror td,
        .ProseMirror th {
          min-width: 1em;
          border: 2px solid #ced4da;
          padding: 3px 5px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }

        .ProseMirror th {
          font-weight: bold;
          text-align: left;
          background-color: #f1f3f4;
        }

        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: rgba(200, 200, 255, 0.4);
          pointer-events: none;
        }

        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #adf;
          pointer-events: none;
        }

        .ProseMirror.resize-cursor {
          cursor: ew-resize;
          cursor: col-resize;
        }

        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }

        .ProseMirror ul[data-type="taskList"] p {
          margin: 0;
        }

        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
        }

        .ProseMirror ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
          margin-right: 0.5rem;
          user-select: none;
        }

        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1 1 auto;
        }

        .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
          cursor: pointer;
        }

        .ProseMirror ul[data-type="taskList"] ul[data-type="taskList"] {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default DocumentNoteEditor;
