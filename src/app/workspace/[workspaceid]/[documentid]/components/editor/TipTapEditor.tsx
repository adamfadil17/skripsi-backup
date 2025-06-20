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

// Save queue item type
interface SaveQueueItem {
  content: any;
  timestamp: number;
  retryCount: number;
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>("saved");

  // Enhanced save management refs
  const lastSavedContentRef = useRef<any>(null);
  const currentContentRef = useRef<any>(null);
  const saveQueueRef = useRef<SaveQueueItem[]>([]);
  const isSavingRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);

  // Configuration constants
  const SAVE_DEBOUNCE_DELAY = 5000; // Increased from 2s to 5s
  const IDLE_SAVE_DELAY = 60000; // Increased from 30s to 60s
  const MAX_RETRY_ATTEMPTS = 3;
  const BATCH_SAVE_INTERVAL = 10000; // Process save queue every 10s
  const MAX_CONSECUTIVE_FAILURES = 5;

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

  // Enhanced save queue processor
  const processSaveQueue = useCallback(async () => {
    if (isSavingRef.current || saveQueueRef.current.length === 0) {
      return;
    }

    // Get the most recent save item (discard older ones)
    const latestSave = saveQueueRef.current[saveQueueRef.current.length - 1];
    saveQueueRef.current = []; // Clear the queue

    // Check if content has actually changed from last saved
    if (isEqual(latestSave.content, lastSavedContentRef.current)) {
      setSaveStatus("saved");
      return;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      await axios.put(
        `/api/workspace/${workspaceId}/document/${documentId}/content`,
        {
          content: latestSave.content,
          userEmail: currentUser.email,
        },
        {
          timeout: 10000, // 10 second timeout
        }
      );

      // Success
      lastSavedContentRef.current = latestSave.content;
      setLastSaved(new Date());
      setSaveStatus("saved");
      consecutiveFailuresRef.current = 0;

      // Only show toast for manual saves or after recovering from errors
      if (document.hasFocus() || consecutiveFailuresRef.current > 0) {
        toast.success("Document saved");
      }
    } catch (error) {
      console.error("Failed to save document:", error);
      consecutiveFailuresRef.current++;

      // Retry logic with exponential backoff
      if (latestSave.retryCount < MAX_RETRY_ATTEMPTS) {
        const retryDelay = Math.min(
          1000 * Math.pow(2, latestSave.retryCount),
          30000
        );

        setTimeout(() => {
          saveQueueRef.current.push({
            ...latestSave,
            retryCount: latestSave.retryCount + 1,
          });
          processSaveQueue();
        }, retryDelay);

        setSaveStatus("saving");
      } else {
        setSaveStatus("error");

        // Show error toast only if we've exceeded max consecutive failures
        if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          toast.error("Failed to save document. Please check your connection.");
        }
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [workspaceId, documentId, currentUser.email]);

  // Set up batch save processor
  useEffect(() => {
    saveIntervalRef.current = setInterval(
      processSaveQueue,
      BATCH_SAVE_INTERVAL
    );

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [processSaveQueue]);

  // Enhanced debounced save function
  const debouncedSave = useCallback(
    (content: any) => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Add to save queue (replace any existing items with same content)
      const existingIndex = saveQueueRef.current.findIndex((item) =>
        isEqual(item.content, content)
      );

      if (existingIndex >= 0) {
        // Update timestamp of existing item
        saveQueueRef.current[existingIndex].timestamp = Date.now();
      } else {
        // Add new item to queue
        saveQueueRef.current.push({
          content,
          timestamp: Date.now(),
          retryCount: 0,
        });
      }

      // Set timeout for processing
      saveTimeoutRef.current = setTimeout(() => {
        processSaveQueue();
      }, SAVE_DEBOUNCE_DELAY);
    },
    [processSaveQueue]
  );

  // Track user activity with enhanced idle detection
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousemove", "keydown", "click", "scroll", "focus"];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    // Enhanced idle detection
    const idleCheckInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;

      // Save on idle if there are unsaved changes and no active saving
      if (
        idleTime > IDLE_SAVE_DELAY &&
        saveQueueRef.current.length === 0 &&
        currentContentRef.current &&
        !isEqual(currentContentRef.current, lastSavedContentRef.current) &&
        !isSavingRef.current
      ) {
        debouncedSave(currentContentRef.current);
      }
    }, 15000); // Check every 15 seconds

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(idleCheckInterval);
    };
  }, [debouncedSave]);

  // Manual save function with immediate processing
  const handleManualSave = useCallback(async () => {
    if (!currentContentRef.current || isSavingRef.current) {
      return;
    }

    // Clear any pending debounced saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Add to queue with high priority and process immediately
    saveQueueRef.current = [
      {
        content: currentContentRef.current,
        timestamp: Date.now(),
        retryCount: 0,
      },
    ];

    await processSaveQueue();
  }, [processSaveQueue]);

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
        if (!editor || !editor.getJSON) return;

        const content = editor.getJSON();
        currentContentRef.current = content;

        // Update activity timestamp
        lastActivityRef.current = Date.now();

        // Check if content has changed
        if (!isEqual(content, lastSavedContentRef.current)) {
          setSaveStatus("unsaved");
          debouncedSave(content);
        } else {
          setSaveStatus("saved");
        }
      },
    },
    [yDoc, provider]
  );

  // Load initial content
  useEffect(() => {
    if (!editor) return;

    const loadOrApplyContent = async () => {
      let contentToLoad = null;

      if (initialContent) {
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

        const newContent = editor.getJSON();
        currentContentRef.current = newContent;
        setSaveStatus("unsaved");
        debouncedSave(newContent);
        toast.success("AI template applied!");
      } else {
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
          setSaveStatus("saved");
        } else {
          editor.commands.setContent({});
          lastSavedContentRef.current = {};
          currentContentRef.current = {};
          setSaveStatus("saved");
        }
      }
    };

    loadOrApplyContent();
  }, [editor, workspaceId, documentId, initialContent, debouncedSave]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleManualSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleManualSave]);

  // Enhanced beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasUnsavedChanges =
        saveQueueRef.current.length > 0 ||
        (currentContentRef.current &&
          !isEqual(currentContentRef.current, lastSavedContentRef.current));

      if (hasUnsavedChanges) {
        // Attempt to save synchronously
        if (currentContentRef.current) {
          navigator.sendBeacon(
            `/api/workspace/${workspaceId}/document/${documentId}/content`,
            JSON.stringify({
              content: currentContentRef.current,
              userEmail: currentUser.email,
            })
          );
        }

        event.preventDefault();
        event.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return event.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [workspaceId, documentId, currentUser.email]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {editor && <EditorToolbar editor={editor} onSave={handleManualSave} />}

      <div className="border rounded-lg mt-4 bg-white">
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:shadow-sm [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:mx-auto [&_.ProseMirror_img]:block"
        />
      </div>

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
        {saveQueueRef.current.length > 0 && (
          <span className="text-xs text-orange-500">
            {saveQueueRef.current.length} pending save(s)
          </span>
        )}
      </div>
    </div>
  );
}

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
