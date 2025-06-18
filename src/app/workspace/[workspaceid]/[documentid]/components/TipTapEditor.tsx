"use client";

import type React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  LinkIcon,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Palette,
  TableIcon,
  CheckSquare,
  Minus,
  Upload,
  Save,
  Loader2,
  Plus,
  Trash2,
  MoreHorizontal,
  MoreVertical,
  Users,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { User } from "@prisma/client";

interface TipTapEditorProps {
  workspaceId: string;
  documentId: string;
  placeholder?: string;
  editable?: boolean;
  currentUser: User; // Changed from the mock user structure
  websocketUrl?: string;
}

interface CollaborativeUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
}

// Generate random colors for users
const generateUserColor = (userId: string): string => {
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
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const CollaborationStatus = ({
  isConnected,
  users,
  currentUser,
  connectionStatus,
  error,
  onReconnect,
  roomName,
}: {
  isConnected: boolean;
  users: CollaborativeUser[];
  currentUser?: CollaborativeUser;
  connectionStatus: string;
  error?: string;
  onReconnect: () => void;
  roomName?: string;
}) => {
  const otherUsers = users.filter((user) => user.id !== currentUser?.id);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 border-b">
      <div className="flex items-center gap-1">
        {error ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-orange-500" />
        )}
        <span className="text-xs text-gray-600">
          {error
            ? "Connection Error"
            : isConnected
            ? "Connected"
            : connectionStatus}
        </span>
      </div>

      {roomName && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs text-gray-500">Room: {roomName}</span>
        </>
      )}

      {error && (
        <>
          <span
            className="text-xs text-red-600 max-w-xs truncate"
            title={error}
          >
            {error}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReconnect}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </>
      )}

      {otherUsers.length > 0 && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-600">
              {otherUsers.length + 1} online
            </span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {otherUsers.slice(0, 3).map((user) => (
              <div
                key={user.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {otherUsers.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{otherUsers.length - 3}
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const TableControls = ({ editor }: { editor: any }) => {
  if (!editor?.isActive("table")) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-2 bg-gray-50 border-b">
      <span className="text-xs font-medium text-gray-600 mr-2">Table:</span>

      {/* Row Controls */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="ml-1 text-xs">Rows</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row Above
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row Below
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Row
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Column Controls */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
            <span className="ml-1 text-xs">Columns</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Column Before
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Column After
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Column
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Table Actions */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <TableIcon className="h-4 w-4" />
            <span className="ml-1 text-xs">Table</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
            >
              Toggle Header Column
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            >
              Toggle Header Row
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => editor.chain().focus().toggleHeaderCell().run()}
            >
              Toggle Header Cell
            </Button>
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => editor.chain().focus().mergeCells().run()}
              disabled={!editor.can().mergeCells()}
            >
              Merge Cells
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => editor.chain().focus().splitCell().run()}
              disabled={!editor.can().splitCell()}
            >
              Split Cell
            </Button>
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Table
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const MenuBar = ({
  editor,
  onSave,
  workspaceId,
  documentId,
  isSaving,
}: {
  editor: any;
  onSave: () => void;
  workspaceId: string;
  documentId: string;
  isSaving: boolean;
}) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
      setLinkUrl("");
    }
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
    }
  }, [editor, imageUrl]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Create a mock URL for demo purposes
      const mockUrl = URL.createObjectURL(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Insert the file into the editor based on type
      if (file.type.startsWith("image/")) {
        editor
          .chain()
          .focus()
          .setImage({
            src: mockUrl,
            alt: file.name,
          })
          .run();
      } else {
        // For non-image files, insert as a link
        editor
          .chain()
          .focus()
          .insertContent(
            `<a href="${mockUrl}" target="_blank">📎 ${file.name}</a>`
          )
          .run();
      }

      toast.success("File uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const addTable = () => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
      {/* Main Toolbar */}
      <div className="p-2 flex flex-wrap gap-1 items-center">
        {/* Save Button */}
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Formatting */}
        <Toggle
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          size="sm"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          size="sm"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          size="sm"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("strike")}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          size="sm"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("code")}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          size="sm"
        >
          <Code className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        {/* Headings */}
        <Toggle
          pressed={editor.isActive("heading", { level: 1 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          size="sm"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          size="sm"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          size="sm"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <Toggle
          pressed={editor.isActive("bulletList")}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          size="sm"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("orderedList")}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          size="sm"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive("taskList")}
          onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
          size="sm"
        >
          <CheckSquare className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        {/* Quote and Code Block */}
        <Toggle
          pressed={editor.isActive("blockquote")}
          onPressedChange={() =>
            editor.chain().focus().toggleBlockquote().run()
          }
          size="sm"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment */}
        <Toggle
          pressed={editor.isActive({ textAlign: "left" })}
          onPressedChange={() =>
            editor.chain().focus().setTextAlign("left").run()
          }
          size="sm"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive({ textAlign: "center" })}
          onPressedChange={() =>
            editor.chain().focus().setTextAlign("center").run()
          }
          size="sm"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive({ textAlign: "right" })}
          onPressedChange={() =>
            editor.chain().focus().setTextAlign("right").run()
          }
          size="sm"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive({ textAlign: "justify" })}
          onPressedChange={() =>
            editor.chain().focus().setTextAlign("justify").run()
          }
          size="sm"
        >
          <AlignJustify className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        {/* Colors and Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium">Text Color</label>
                <div className="flex gap-1 mt-1">
                  {[
                    "#000000",
                    "#ef4444",
                    "#f97316",
                    "#eab308",
                    "#22c55e",
                    "#3b82f6",
                    "#8b5cf6",
                    "#ec4899",
                  ].map((color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        editor.chain().focus().setColor(color).run()
                      }
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Highlight</label>
                <div className="flex gap-1 mt-1">
                  {[
                    "#fef3c7",
                    "#fecaca",
                    "#fed7d7",
                    "#e0e7ff",
                    "#d1fae5",
                    "#f3e8ff",
                  ].map((color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        editor.chain().focus().toggleHighlight({ color }).run()
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Toggle
          pressed={editor.isActive("highlight")}
          onPressedChange={() => editor.chain().focus().toggleHighlight().run()}
          size="sm"
        >
          <Highlighter className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        {/* Font Family */}
        <Select
          value={editor.getAttributes("textStyle").fontFamily || "Inter"}
          onValueChange={(value) => {
            if (value === "unset") {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(value).run();
            }
          }}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Inter">Inter</SelectItem>
            <SelectItem value="Comic Sans MS, Comic Sans">
              Comic Sans
            </SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
            <SelectItem value="monospace">Monospace</SelectItem>
            <SelectItem value="cursive">Cursive</SelectItem>
            <SelectItem value="unset">Default</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        {/* Link */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <Input
                placeholder="Enter URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={addLink} size="sm">
                  Add Link
                </Button>
                <Button
                  onClick={() => editor.chain().focus().unsetLink().run()}
                  variant="outline"
                  size="sm"
                >
                  Remove Link
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image URL */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <Input
                placeholder="Enter image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button onClick={addImage} size="sm">
                Add Image
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* File Upload */}
        <Button
          variant="ghost"
          size="sm"
          onClick={triggerFileUpload}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        />

        {/* Upload Progress */}
        {isUploading && (
          <div className="flex items-center gap-2 ml-2">
            <Progress value={uploadProgress} className="w-20" />
            <span className="text-xs">{uploadProgress}%</span>
          </div>
        )}

        {/* Table */}
        <Button variant="ghost" size="sm" onClick={addTable}>
          <TableIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Horizontal Rule */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* Table Controls - Show when cursor is in a table */}
      <TableControls editor={editor} />
    </div>
  );
};

export default function CollaborativeTipTapEditor({
  workspaceId,
  documentId,
  placeholder = "Start writing your content here...",
  editable = true,
  currentUser,
  websocketUrl = "wss://yjs-websocket-server-production-0351.up.railway.app",
}: TipTapEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [connectionError, setConnectionError] = useState<string>("");
  const [collaborativeUsers, setCollaborativeUsers] = useState<
    CollaborativeUser[]
  >([]);
  const [roomName, setRoomName] = useState<string>("");

  // Yjs and WebSocket provider refs
  const yjsDoc = useRef<Y.Doc | null>(null);
  const provider = useRef<WebsocketProvider | null>(null);

  const user: CollaborativeUser = {
    id: currentUser.id,
    name: currentUser.name || currentUser.email || "Anonymous User",
    email: currentUser.email,
    avatar: currentUser.image || undefined,
    color: generateUserColor(currentUser.id),
  };

  // Initialize Yjs document and WebSocket provider
  useEffect(() => {
    const room = `${workspaceId}-${documentId}`;
    setRoomName(room);

    // Create Yjs document
    yjsDoc.current = new Y.Doc();

    // Create WebSocket provider
    const wsUrl = `${websocketUrl}?room=${encodeURIComponent(room)}`;
    provider.current = new WebsocketProvider(wsUrl, room, yjsDoc.current, {
      connect: true,
    });

    // Set up connection event listeners
    provider.current.on("status", (event: { status: string }) => {
      console.log("WebSocket status:", event.status);
      setConnectionStatus(event.status);
      setIsConnected(event.status === "connected");

      if (event.status === "connected") {
        setConnectionError("");
        toast.success("Connected to collaboration server!");
      } else if (event.status === "disconnected") {
        setConnectionError("Disconnected from server");
        toast.error("Disconnected from collaboration server");
      }
    });

    provider.current.on("connection-error", (error: any) => {
      console.error("WebSocket connection error:", error);
      setConnectionError("Failed to connect to collaboration server");
      setIsConnected(false);
      toast.error("Failed to connect to collaboration server");
    });

    // Set up awareness for user presence
    const awareness = provider.current.awareness;
    awareness.setLocalStateField("user", {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      color: user.color,
    });

    // Listen for awareness changes (other users joining/leaving)
    const updateUsers = () => {
      const users: CollaborativeUser[] = [];
      awareness.getStates().forEach((state: any) => {
        if (state.user) {
          users.push(state.user);
        }
      });
      setCollaborativeUsers(users);
    };

    awareness.on("change", updateUsers);
    updateUsers(); // Initial update

    return () => {
      // Cleanup
      if (provider.current) {
        provider.current.destroy();
      }
      if (yjsDoc.current) {
        yjsDoc.current.destroy();
      }
    };
  }, [
    workspaceId,
    documentId,
    websocketUrl,
    user.id,
    user.name,
    user.email,
    user.avatar,
    user.color,
  ]);

  // Initialize editor with collaboration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default history extension since we're using collaboration
        history: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      // Add collaboration extensions
      Collaboration.configure({
        document: yjsDoc.current,
      }),
      CollaborationCursor.configure({
        provider: provider.current,
        user: {
          name: user.name,
          color: user.color,
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-500 underline cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      FontFamily,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
    ],
    editable,
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none min-h-[500px] p-6 w-full",
      },
    },
    onUpdate: ({ editor }) => {
      const currentContent = editor.getJSON();
      setContent(currentContent);
    },
  });

  // Set loading to false when editor is ready
  useEffect(() => {
    if (editor && yjsDoc.current && provider.current) {
      setIsLoading(false);
    }
  }, [editor]);

  // Reconnect function
  const reconnectCollaboration = useCallback(() => {
    if (provider.current) {
      setConnectionStatus("Reconnecting...");
      setConnectionError("");
      provider.current.connect();
    }
  }, []);

  // Save content function
  const saveContent = useCallback(async () => {
    if (!editor) return;

    try {
      setIsSaving(true);
      const currentContent = editor.getJSON();

      // Mock save - replace with your actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Document saved successfully!");
      setContent(currentContent);
    } catch (error: any) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  }, [editor]);

  // Auto-save functionality
  useEffect(() => {
    if (!editor) return;

    const interval = setInterval(() => {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        // Auto-save logic here
        console.log("Auto-saving...");
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [editor, content]);

  if (isLoading || !editor) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading collaborative editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border rounded-lg bg-white">
      {/* Collaboration Status */}
      <CollaborationStatus
        isConnected={isConnected}
        users={collaborativeUsers}
        currentUser={user}
        connectionStatus={connectionStatus}
        error={connectionError}
        onReconnect={reconnectCollaboration}
        roomName={roomName}
      />

      {editable && (
        <MenuBar
          editor={editor}
          onSave={saveContent}
          workspaceId={workspaceId}
          documentId={documentId}
          isSaving={isSaving}
        />
      )}
      <div className="w-full">
        <EditorContent editor={editor} />
      </div>
      {editor && (
        <div className="border-t border-gray-200 p-3 text-sm text-gray-500 flex justify-between bg-gray-50">
          <span>
            {editor.storage.characterCount.characters()} characters,{" "}
            {editor.storage.characterCount.words()} words
          </span>
          <span>
            {isConnected ? "🟢 Live Collaboration" : "🔴 Offline Mode"} •{" "}
            {connectionStatus}
          </span>
        </div>
      )}
    </div>
  );
}
