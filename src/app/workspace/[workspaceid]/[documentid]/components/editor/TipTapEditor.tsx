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
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [isCollaborationReady, setIsCollaborationReady] = useState(false);

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
  // Track if initial content has been applied
  const initialContentAppliedRef = useRef<boolean>(false);

  // Initialize Yjs document and provider
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);

    // Wait for provider to be ready
    yProvider.on("synced", () => {
      setIsCollaborationReady(true);
    });

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

    // Set up idle detection - check every 30 seconds if user has been idle for 60+ seconds
    const idleCheckInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      // If user has been idle for 60+ seconds and there are unsaved changes, save them
      if (
        idleTime > 60000 && // 1 minute
        contentChanged &&
        !isSavingRef.current &&
        currentContentRef.current
      ) {
        saveContent(currentContentRef.current);
      }
    }, 30000); // 30 seconds

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
    }, 5000), // 5 seconds to reduce database hits
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

  // Helper function to check if content is empty
  const isContentEmpty = (content: any) => {
    if (!content || !content.content) return true;

    // Check if it's just an empty paragraph
    if (content.content.length === 1) {
      const firstNode = content.content[0];
      if (
        firstNode.type === "paragraph" &&
        (!firstNode.content || firstNode.content.length === 0)
      ) {
        return true;
      }
    }

    return content.content.length === 0;
  };

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
        handleDOMEvents: {
          error: (view, event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === "IMG") {
              console.error(
                "Image failed to load:",
                target.getAttribute("src")
              );
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

  // Load and apply content with improved logic
  useEffect(() => {
    if (!editor || isContentLoaded || !isCollaborationReady) return;

    const loadAndApplyContent = async () => {
      try {
        // Wait for collaboration to sync
        await new Promise((resolve) => setTimeout(resolve, 500));

        // First, load existing content from database if available
        let existingDbContent = null;
        try {
          const response = await axios.get(
            `/api/workspace/${workspaceId}/document/${documentId}/content`
          );

          if (
            response.data.status === "success" &&
            response.data.data.content
          ) {
            existingDbContent = response.data.data.content;
          }
        } catch (error) {
          console.error("Failed to load existing document content:", error);
        }

        // Get current editor content from collaboration
        const currentEditorContent = editor.getJSON();
        const editorHasContent = !isContentEmpty(currentEditorContent);

        console.log("Editor has content:", editorHasContent);
        console.log(
          "Database has content:",
          !!existingDbContent && !isContentEmpty(existingDbContent)
        );
        console.log("AI content provided:", !!initialContent);
        console.log(
          "AI content applied before:",
          initialContentAppliedRef.current
        );

        // Determine the base content to work with
        let baseContent = null;

        if (editorHasContent) {
          // Use editor content (from collaboration) as base
          baseContent = currentEditorContent;
          console.log("Using editor content as base");
        } else if (existingDbContent && !isContentEmpty(existingDbContent)) {
          // Use database content as base
          baseContent = existingDbContent;
          console.log("Using database content as base");
        }

        // Apply AI content if provided
        if (initialContent && !initialContentAppliedRef.current) {
          console.log("Applying AI-generated content to document...");

          let finalContent;

          if (baseContent && !isContentEmpty(baseContent)) {
            // Merge AI content at the beginning of existing content
            console.log("Merging AI content with existing content...");

            const aiContent =
              typeof initialContent === "string"
                ? JSON.parse(initialContent)
                : initialContent;

            // Create merged content with AI content first, then existing content
            finalContent = {
              type: "doc",
              content: [
                ...(aiContent.content || []),
                // Add a separator paragraph
                {
                  type: "paragraph",
                  content: [],
                },
                // Add existing content
                ...(baseContent.content || []),
              ],
            };

            toast.success("AI content added to the beginning of document!");
          } else {
            // No existing content, just use AI content
            console.log("No existing content, using AI content only...");
            finalContent = initialContent;
            toast.success("AI template applied successfully!");
          }

          // Apply the merged content
          editor.commands.setContent(finalContent);

          // Update tracking variables
          lastSavedContentRef.current = finalContent;
          currentContentRef.current = finalContent;
          initialContentAppliedRef.current = true;

          // Mark as unsaved since this is new content
          setSaveStatus("unsaved");
          setContentChanged(true);

          // Auto-save the content after a short delay
          setTimeout(() => {
            if (currentContentRef.current) {
              saveContent(currentContentRef.current);
            }
          }, 1000);
        } else if (baseContent && !editorHasContent) {
          // No AI content, but we have base content to load
          console.log("Loading base content without AI...");

          editor.commands.setContent(baseContent);

          // Update tracking variables
          lastSavedContentRef.current = baseContent;
          currentContentRef.current = baseContent;
          setSaveStatus("saved");
          setContentChanged(false);
        } else if (editorHasContent) {
          // Editor already has content from collaboration, use it
          console.log("Using existing editor content...");

          lastSavedContentRef.current = currentEditorContent;
          currentContentRef.current = currentEditorContent;
          setSaveStatus("saved");
          setContentChanged(false);
        }
      } catch (error) {
        console.error("Error in content loading process:", error);
        toast.error("Failed to load document content");
      } finally {
        setIsContentLoaded(true);
      }
    };

    loadAndApplyContent();
  }, [
    editor,
    workspaceId,
    documentId,
    initialContent,
    isContentLoaded,
    isCollaborationReady,
  ]);

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
