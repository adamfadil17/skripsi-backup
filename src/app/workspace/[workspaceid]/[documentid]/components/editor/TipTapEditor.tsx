"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom } from "@liveblocks/react";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";
import { useEffect, useState, useCallback } from "react";
import type { User } from "@prisma/client";
import { CommentSystem } from "./CommentSystem";
import axios from "axios";
import { toast } from "react-hot-toast";
import { EditorToolbar } from "./EditorToolBar";

// Create lowlight instance
const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("css", css);
lowlight.register("html", html);

interface TipTapEditorProps {
  workspaceId: string;
  documentId: string;
  placeholder?: string;
  currentUser: User;
}

export default function TipTapEditor({
  workspaceId,
  documentId,
  placeholder = "Start writing...",
  currentUser,
}: TipTapEditorProps) {
  return (
    <LiveblocksProvider
      publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}
    >
      <RoomProvider
        id={documentId} // Using documentId as roomId
        initialPresence={{
          cursor: null,
          selection: null,
          user: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            image: currentUser.image,
          },
        }}
      >
        <CollaborativeEditor
          workspaceId={workspaceId}
          documentId={documentId}
          placeholder={placeholder}
          currentUser={currentUser}
        />
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function CollaborativeEditor({
  workspaceId,
  documentId,
  placeholder,
  currentUser,
}: TipTapEditorProps) {
  const room = useRoom();
  const [provider, setProvider] = useState<LiveblocksYjsProvider>();
  const [yDoc, setYDoc] = useState<Y.Doc>();
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Yjs document and provider
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);

    setYDoc(yDoc);
    setProvider(yProvider);
    setIsLoading(false);

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, [room]);

  // Save content to database
  const saveContent = useCallback(
    async (content: any) => {
      if (isSaving) return;

      setIsSaving(true);
      try {
        await axios.put(
          `/api/workspace/${workspaceId}/document/${documentId}/content`,
          {
            content,
            userEmail: currentUser.email,
          }
        );
        setLastSaved(new Date());
        toast.success("Document saved");
      } catch (error) {
        console.error("Failed to save document:", error);
        toast.error("Failed to save document");
      } finally {
        setIsSaving(false);
      }
    },
    [workspaceId, documentId, currentUser.email, isSaving]
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // Disable default history since we're using collaboration
          history: false,
          // Disable default codeBlock to avoid conflict with CodeBlockLowlight
          codeBlock: false,
        }),
        // Add CodeBlockLowlight after StarterKit
        CodeBlockLowlight.configure({
          lowlight,
        }),
        Highlight.configure({
          multicolor: true,
        }),
        Typography,
        Underline,
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-500 underline cursor-pointer",
          },
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Color,
        TextStyle,
        FontFamily,
        Placeholder.configure({
          placeholder,
        }),
        CharacterCount,
        // Collaboration extensions
        ...(yDoc && provider
          ? [
              Collaboration.configure({
                document: yDoc,
              }),
              CollaborationCursor.configure({
                provider: provider,
                user: {
                  name: currentUser.name,
                  color: getRandomColor(),
                },
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-lg max-w-none focus:outline-none min-h-[500px] p-4",
        },
      },
      onUpdate: ({ editor }) => {
        // Only proceed if editor is available and has the necessary methods
        if (!editor || !editor.getJSON) return;

        // Auto-save every 5 seconds
        const content = editor.getJSON();
        const saveTimeout = setTimeout(() => {
          saveContent(content);
        }, 5000);

        return () => clearTimeout(saveTimeout);
      },
    },
    [yDoc, provider]
  );

  // Load initial content
  useEffect(() => {
    if (!editor) return;

    const loadContent = async () => {
      try {
        const response = await axios.get(
          `/api/workspace/${workspaceId}/document/${documentId}/content`
        );
        if (response.data.status === "success" && response.data.data.content) {
          editor.commands.setContent(response.data.data.content);
        }
      } catch (error) {
        console.error("Failed to load document content:", error);
      }
    };

    loadContent();
  }, [editor, workspaceId, documentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Editor Toolbar */}
      {editor && <EditorToolbar editor={editor} />}

      {/* Editor Content */}
      <div className="border rounded-lg mt-4 bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* Status Bar */}
      <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
        <div className="flex items-center gap-4">
          {editor && (
            <span>
              {editor.storage.characterCount.characters()} characters,{" "}
              {editor.storage.characterCount.words()} words
            </span>
          )}
          {isSaving && <span className="text-blue-500">Saving...</span>}
          {lastSaved && !isSaving && (
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Comment System */}
      <CommentSystem editor={editor} currentUser={currentUser} />
    </div>
  );
}

// Helper function to generate random colors for cursors
function getRandomColor() {
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
}
