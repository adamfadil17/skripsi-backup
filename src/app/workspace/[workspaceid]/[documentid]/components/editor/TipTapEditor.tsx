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
import { useEffect, useState, useCallback, useRef } from "react";
import type { User } from "@prisma/client";
import axios from "axios";
import { toast } from "react-hot-toast";
import { isEqual } from "lodash";
import { EditorToolbar } from "./EditorToolBar";
import { useRobustSave } from "@/hooks/use-robust-save";
import { RecoveryDialog } from "./RecoveryDialog";
import { SaveStatusIndicator } from "./SaveStatusIndicator";

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
  initialContent?: any;
}

export default function TipTapEditor({
  workspaceId,
  documentId,
  placeholder,
  currentUser,
  initialContent,
}: TipTapEditorProps) {
  return (
    <LiveblocksProvider
      publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}
    >
      <RoomProvider
        id={documentId}
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
          initialContent={initialContent}
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
  initialContent,
}: TipTapEditorProps) {
  const room = useRoom();
  const [provider, setProvider] = useState<LiveblocksYjsProvider>();
  const [yDoc, setYDoc] = useState<Y.Doc>();
  const [isLoading, setIsLoading] = useState(true);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [hasCheckedRecovery, setHasCheckedRecovery] = useState(false);

  // Use robust save hook
  const {
    saveStatus,
    lastSaved,
    saveQueue,
    isProcessingQueue,
    debouncedSave,
    saveAIContent,
    manualSave,
    retryFailedSaves,
    getRecoveryData,
    clearRecoveryData,
    isOnline,
  } = useRobustSave({
    workspaceId,
    documentId,
    userEmail: currentUser.email,
  });

  // Store the last saved content to compare for changes
  const lastSavedContentRef = useRef<any>(null);
  const currentContentRef = useRef<any>(null);
  const isApplyingRecoveryRef = useRef(false);

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

  // Check for recovery data on mount
  useEffect(() => {
    if (!hasCheckedRecovery && !isLoading) {
      const recoveryData = getRecoveryData();
      if (recoveryData.hasRecoveryData) {
        setShowRecoveryDialog(true);
      }
      setHasCheckedRecovery(true);
    }
  }, [hasCheckedRecovery, isLoading, getRecoveryData]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          history: false,
          codeBlock: false,
        }),
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
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class: "max-w-full h-auto rounded-lg shadow-sm my-4 mx-auto block",
            loading: "lazy",
            crossorigin: "anonymous",
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-500 underline cursor-pointer",
          },
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: "border-collapse border border-gray-300 w-full my-4",
          },
        }),
        TableRow.configure({
          HTMLAttributes: {
            class: "border border-gray-300",
          },
        }),
        TableHeader.configure({
          HTMLAttributes: {
            class: "border border-gray-300 bg-gray-100 font-bold p-2 text-left",
          },
        }),
        TableCell.configure({
          HTMLAttributes: {
            class: "border border-gray-300 p-2 min-w-[100px]",
          },
        }),
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
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-lg max-w-none focus:outline-none min-h-[500px] p-4",
        },
      },
      onUpdate: ({ editor }) => {
        if (!editor || !editor.getJSON || isApplyingRecoveryRef.current) return;

        const content = editor.getJSON();
        currentContentRef.current = content;

        if (!isEqual(content, lastSavedContentRef.current)) {
          debouncedSave(content);
        }
      },
    },
    [yDoc, provider]
  );

  // Load initial content from database or apply AI generated template
  useEffect(() => {
    if (!editor) return;

    const loadOrApplyContent = async () => {
      let contentToLoad = null;

      if (initialContent) {
        // Handle AI-generated content with robust saving
        const currentContent = editor.getJSON();

        if (currentContent.content && currentContent.content.length > 0) {
          const { from } = editor.state.selection;

          editor
            .chain()
            .focus()
            .setTextSelection(from)
            .insertContent([
              {
                type: "paragraph",
                content: [],
              },
              ...initialContent.content,
            ])
            .run();
        } else {
          editor.commands.setContent(initialContent);
        }

        // Immediately save AI content with high priority
        const newContent = editor.getJSON();
        currentContentRef.current = newContent;
        saveAIContent(newContent);

        toast.success("AI template applied and saved!");
      } else {
        // Load existing content
        try {
          const response = await axios.get(
            `/api/workspace/${workspaceId}/document/${documentId}/content`
          );
          if (
            response.data.status === "success" &&
            response.data.data.content
          ) {
            contentToLoad = response.data.data.content;
          }
        } catch (error) {
          console.error("Failed to load document content:", error);
        }

        if (contentToLoad) {
          editor.commands.setContent(contentToLoad);
          lastSavedContentRef.current = contentToLoad;
          currentContentRef.current = contentToLoad;
        }
      }
    };

    loadOrApplyContent();
  }, [editor, workspaceId, documentId, initialContent, saveAIContent]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        if (currentContentRef.current) {
          manualSave(currentContentRef.current);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [manualSave]);

  // Handle recovery
  const handleRecover = useCallback(
    (content: any, type: "ai" | "backup" | "queued") => {
      if (!editor) return;

      isApplyingRecoveryRef.current = true;

      try {
        editor.commands.setContent(content);
        currentContentRef.current = content;

        // Save recovered content immediately
        if (type === "ai") {
          saveAIContent(content);
          toast.success("AI content recovered and saved!");
        } else {
          manualSave(content);
          toast.success("Content recovered and saved!");
        }

        clearRecoveryData();
      } finally {
        isApplyingRecoveryRef.current = false;
      }
    },
    [editor, saveAIContent, manualSave, clearRecoveryData]
  );

  const handleDiscardRecovery = useCallback(() => {
    clearRecoveryData();
    toast.success("Recovery data cleared");
  }, [clearRecoveryData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Recovery Dialog */}
      <RecoveryDialog
        isOpen={showRecoveryDialog}
        onClose={() => setShowRecoveryDialog(false)}
        recoveryData={getRecoveryData()}
        onRecover={handleRecover}
        onDiscard={handleDiscardRecovery}
      />

      {/* Enhanced Editor Toolbar */}
      {editor && (
        <EditorToolbar
          editor={editor}
          onSave={() =>
            currentContentRef.current && manualSave(currentContentRef.current)
          }
        />
      )}

      {/* Editor Content */}
      <div className="border rounded-lg mt-4 bg-white">
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:shadow-sm [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:mx-auto [&_.ProseMirror_img]:block"
        />
      </div>

      {/* Enhanced Status Bar */}
      <div className="flex justify-between items-center mt-2 text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          {editor && (
            <span>
              {editor.storage.characterCount.characters()} characters,{" "}
              {editor.storage.characterCount.words()} words
            </span>
          )}
        </div>

        <SaveStatusIndicator
          status={saveStatus}
          lastSaved={lastSaved}
          queuedSaves={saveQueue}
          isOnline={isOnline}
          onRetry={retryFailedSaves}
        />
      </div>
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
