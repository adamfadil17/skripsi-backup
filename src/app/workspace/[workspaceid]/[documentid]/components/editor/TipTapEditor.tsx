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
import { debounce } from "lodash";
import { isEqual } from "lodash";
import { SaveStatus } from "./SaveStatus";
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
  initialContent?: any;
}

// Save status type
type SaveStatusType = "saved" | "saving" | "unsaved" | "error";

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>("saved");
  const [contentChanged, setContentChanged] = useState(false);

  // Store the last saved content to compare for changes
  const lastSavedContentRef = useRef<any>(null);
  // Store the current content
  const currentContentRef = useRef<any>(null);
  // Store the save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Store the idle detection timeout
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track user activity
  const lastActivityRef = useRef<number>(Date.now());
  // Track if a save is in progress
  const isSavingRef = useRef<boolean>(false);

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

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen for user activity events
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);

    // Set up idle detection - check every 10 seconds if user has been idle for 30+ seconds
    const idleCheckInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      // If user has been idle for 30+ seconds and there are unsaved changes, save them
      if (
        idleTime > 30000 &&
        contentChanged &&
        !isSavingRef.current &&
        currentContentRef.current
      ) {
        saveContent(currentContentRef.current);
      }
    }, 10000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      clearInterval(idleCheckInterval);
    };
  }, [contentChanged]);

  // Save content to database with debounce
  const debouncedSave = useCallback(
    debounce((content: any) => {
      if (isSavingRef.current) return;

      // Check if content has actually changed
      if (
        lastSavedContentRef.current &&
        isEqual(content, lastSavedContentRef.current)
      ) {
        setSaveStatus("saved");
        setContentChanged(false);
        return;
      }

      // Save content
      saveContent(content);
    }, 2000), // Wait 2 seconds of inactivity before saving
    []
  );

  // Actual save function
  const saveContent = async (content: any) => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      await axios.put(
        `/api/workspace/${workspaceId}/document/${documentId}/content`,
        {
          content,
          userEmail: currentUser.email,
        }
      );

      // Update refs and state
      lastSavedContentRef.current = content;
      setLastSaved(new Date());
      setSaveStatus("saved");
      setContentChanged(false);

      // Show toast only for manual saves, not auto-saves
      if (document.hasFocus()) {
        toast.success("Document saved");
      }
    } catch (error) {
      console.error("Failed to save document:", error);
      setSaveStatus("error");
      toast.error("Failed to save document");
    } finally {
      isSavingRef.current = false;
    }
  };

  // Manual save function for keyboard shortcuts
  const handleManualSave = useCallback(() => {
    if (currentContentRef.current && !isSavingRef.current) {
      saveContent(currentContentRef.current);
    }
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // Completely disable history when using collaboration
          history: false,
          codeBlock: false,
        }),
        // Only add collaboration extensions when ready
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
        // Enhanced Image configuration with better error handling and styling
        Image.configure({
          inline: false, // Changed from true to false for better display
          allowBase64: true,
          HTMLAttributes: {
            class: "max-w-full h-auto rounded-lg shadow-sm my-4 mx-auto block",
            loading: "lazy",
            crossorigin: "anonymous", // Add CORS support
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-500 underline cursor-pointer",
          },
        }),
        // Enhanced Table configuration with more options
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
        // Add custom image handling
        handleDOMEvents: {
          // Handle image load errors
          error: (view, event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === "IMG") {
              console.error(
                "Image failed to load:",
                target.getAttribute("src")
              );
              // You could replace with a placeholder image here
              target.setAttribute("alt", "Failed to load image");
              target.style.border = "2px dashed #ccc";
              target.style.padding = "20px";
              target.style.textAlign = "center";
            }
            return false;
          },
        },
      },
      onUpdate: ({ editor }) => {
        // Only proceed if editor is available and has the necessary methods
        if (!editor || !editor.getJSON) return;

        // Get current content
        const content = editor.getJSON();
        currentContentRef.current = content;

        // Check if content has actually changed from what was last saved
        if (!isEqual(content, lastSavedContentRef.current)) {
          // Mark as unsaved
          setSaveStatus("unsaved");
          setContentChanged(true);

          // Clear any existing save timeout
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
          }

          // Schedule a save after inactivity
          debouncedSave(content);
        } else {
          // If content hasn't changed, ensure status returns to 'saved'
          setSaveStatus("saved");
          setContentChanged(false);
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
        // Use content from AI template
        contentToLoad = initialContent;
        toast.success("AI template applied!");
      } else {
        // Load content from database (existing logic)
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
      }

      if (contentToLoad) {
        editor.commands.setContent(contentToLoad);
        lastSavedContentRef.current = contentToLoad;
        currentContentRef.current = contentToLoad;
        setSaveStatus("saved");
        setContentChanged(false);
      } else {
        // If no content to load (e.g., new empty document)
        editor.commands.setContent({});
        lastSavedContentRef.current = {};
        currentContentRef.current = {};
        setSaveStatus("saved");
        setContentChanged(false);
      }
    };

    loadOrApplyContent();
  }, [editor, workspaceId, documentId, initialContent]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Save on Ctrl+S or Cmd+S
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleManualSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleManualSave]);

  // Save before unloading if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (contentChanged) {
        // Save content before unloading
        if (currentContentRef.current) {
          saveContent(currentContentRef.current);
        }

        // Show confirmation dialog
        event.preventDefault();
        event.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [contentChanged]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Enhanced Editor Toolbar */}
      {editor && <EditorToolbar editor={editor} onSave={handleManualSave} />}

      {/* Editor Content with enhanced image styling */}
      <div className="border rounded-lg mt-4 bg-white">
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:shadow-sm [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:mx-auto [&_.ProseMirror_img]:block"
        />
      </div>

      {/* Status Bar */}
      <div className="flex justify-between items-center mt-2 text-sm text-gray-500 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          {editor && (
            <span>
              {editor.storage.characterCount.characters()} characters,{" "}
              {editor.storage.characterCount.words()} words
            </span>
          )}
          <SaveStatus status={saveStatus} lastSaved={lastSaved} />
        </div>
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
