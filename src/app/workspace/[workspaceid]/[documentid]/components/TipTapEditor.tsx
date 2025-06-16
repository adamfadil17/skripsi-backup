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
import axios from "axios";
import toast from "react-hot-toast";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { User } from "@prisma/client";
import { usePusherChannelContext } from "../../components/PusherChannelProvider";

interface TipTapEditorProps {
  workspaceId: string;
  documentId: string;
  placeholder?: string;
  editable?: boolean;
  currentUser: User;
}

interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  alt?: string;
  caption?: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "ARCHIVE" | "OTHER";
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
  if (!editor.isActive("table")) {
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

      <Separator orientation="vertical" className="h-6" />

      {/* Quick Row/Column Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Add Row"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Add Column"
      >
        <MoreVertical className="h-4 w-4" />
        <Plus className="h-3 w-3 -ml-1" />
      </Button>
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
    if (linkUrl) {
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
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
    }
  }, [editor, imageUrl]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      formData.append("documentId", documentId);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await axios.post("/api/attachments/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const attachment: Attachment = response.data;

      // Insert the attachment into the editor based on type
      if (attachment.type === "IMAGE") {
        editor
          .chain()
          .focus()
          .setImage({
            src: attachment.url,
            alt: attachment.alt || attachment.filename,
            "data-attachment-id": attachment.id,
          })
          .run();
      } else {
        // For non-image files, insert as a link
        editor
          .chain()
          .focus()
          .insertContent(
            `
          <a href="${attachment.url}" data-attachment-id="${attachment.id}" target="_blank">
            📎 ${attachment.filename}
          </a>
        `
          )
          .run();
      }

      toast.success("File uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Upload failed");
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
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
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

export default function TipTapEditor({
  workspaceId,
  documentId,
  placeholder = "Start writing your content here...",
  editable = true,
  currentUser,
}: TipTapEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Initializing...");
  const [connectionError, setConnectionError] = useState<string>("");
  const [collaborativeUsers, setCollaborativeUsers] = useState<
    CollaborativeUser[]
  >([]);
  const [roomName, setRoomName] = useState<string>("");
  const { channel: workspaceChannel } = usePusherChannelContext();

  // Yjs setup
  const ydoc = useRef<Y.Doc>();
  const provider = useRef<WebsocketProvider>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const user: CollaborativeUser = {
    id: currentUser.id,
    name: currentUser.name || currentUser.email || "Anonymous User",
    email: currentUser.email || "",
    avatar: currentUser.image || undefined,
    color: generateUserColor(currentUser.id),
  };

  // Initialize Yjs document and provider
  const initializeCollaboration = useCallback(async () => {
    try {
      setConnectionStatus("Initializing...");
      setConnectionError("");

      // Clean up existing connections
      if (provider.current) {
        provider.current.destroy();
      }
      if (ydoc.current) {
        ydoc.current.destroy();
      }

      // Create new Yjs document
      ydoc.current = new Y.Doc();

      // WebSocket URL with room parameter
      const wsUrl = "wss://yjs-websocket-server-production-0351.up.railway.app";
      const room = `${workspaceId}-${documentId}`;
      const wsUrlWithRoom = `${wsUrl}?room=${room}`;

      setRoomName(room);

      console.log("🔗 Initializing WebSocket connection...");
      console.log("📡 URL:", wsUrlWithRoom);
      console.log("🏠 Room:", room);

      setConnectionStatus("Connecting...");

      // Create WebSocket provider with room parameter
      provider.current = new WebsocketProvider(wsUrl, room, ydoc.current, {
        connect: true,
        maxBackoffTime: 5000,
      });

      // Connection status handlers
      provider.current.on("status", (event: any) => {
        console.log("📡 WebSocket status:", event.status);
        setIsConnected(event.status === "connected");

        switch (event.status) {
          case "connected":
            setConnectionStatus("Connected");
            setConnectionError("");
            reconnectAttempts.current = 0;
            toast.success("Connected to collaboration server");
            break;
          case "disconnected":
            setConnectionStatus("Disconnected");
            if (reconnectAttempts.current < maxReconnectAttempts) {
              setConnectionStatus(
                `Reconnecting... (${
                  reconnectAttempts.current + 1
                }/${maxReconnectAttempts})`
              );
              reconnectAttempts.current++;
            } else {
              setConnectionError("Max reconnection attempts reached");
              toast.error("Failed to reconnect to collaboration server");
            }
            break;
          case "connecting":
            setConnectionStatus("Connecting...");
            break;
          default:
            setConnectionStatus(event.status);
        }
      });

      // Connection error handler
      provider.current.on("connection-error", (error: any) => {
        console.error("❌ WebSocket connection error:", error);
        setConnectionError("Connection failed");
        setConnectionStatus("Connection Error");
        toast.error("Failed to connect to collaboration server");
      });

      // Sync status handler
      provider.current.on("sync", (isSynced: boolean) => {
        console.log("🔄 Document sync status:", isSynced);
        if (isSynced && isConnected) {
          setConnectionStatus("Synced");
        }
      });
    } catch (error) {
      console.error("❌ Error initializing collaboration:", error);
      setConnectionError("Initialization failed");
      setConnectionStatus("Init Error");
      toast.error("Failed to initialize collaboration");
    }
  }, [workspaceId, documentId, isConnected]);

  useEffect(() => {
    initializeCollaboration();

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up WebSocket connection");
      try {
        provider.current?.destroy();
        ydoc.current?.destroy();
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    };
  }, [initializeCollaboration]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default history extension since we're using Yjs
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
      // Collaboration extensions
      Collaboration.configure({
        document: ydoc.current,
      }),
      CollaborationCursor.configure({
        provider: provider.current,
        user: user,
        render: (user: any) => {
          const cursor = document.createElement("span");
          cursor.classList.add("collaboration-cursor__caret");
          cursor.style.borderColor = user.color;
          return cursor;
        },
        //@ts-ignore selection-render
        selectionRender: (user: any) => {
          const selection = document.createElement("span");
          selection.classList.add("collaboration-cursor__selection");
          selection.style.backgroundColor = `${user.color}20`;
          return selection;
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
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
        },
      ],
    },
    editable,
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none min-h-[500px] p-6 w-full",
      },
    },
  });

  // Update collaborative users when awareness changes
  useEffect(() => {
    if (!provider.current) return;

    const updateUsers = () => {
      const awareness = provider.current!.awareness;
      const users: CollaborativeUser[] = [];

      awareness.getStates().forEach((state: any, clientId: number) => {
        if (state.user) {
          users.push({
            id: state.user.id,
            name: state.user.name,
            email: state.user.email,
            avatar: state.user.avatar,
            color: state.user.color,
          });
        }
      });

      setCollaborativeUsers(users);
    };

    provider.current.awareness.on("change", updateUsers);
    updateUsers();

    return () => {
      provider.current?.awareness.off("change", updateUsers);
    };
  }, []);

  // Fetch document content on mount (for initial load)
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `/api/workspace/${workspaceId}/document/${documentId}/content`
        );

        if (response.data.status === "success" && response.data.data?.content) {
          const fetchedContent = response.data.data.content;
          setContent(fetchedContent);

          // Only set content if the Yjs document is empty (first load)
          if (
            editor &&
            ydoc.current &&
            ydoc.current.get("default").toString().length === 0
          ) {
            editor.commands.setContent(fetchedContent);
          }
        }
      } catch (error: any) {
        console.error("Error fetching document content:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load document content");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (workspaceId && documentId && editor) {
      fetchContent();
    }
  }, [workspaceId, documentId, editor]);

  // Save content function (periodic backup to database)
  const saveContent = async () => {
    if (!editor) return;

    try {
      setIsSaving(true);
      const currentContent = editor.getJSON();

      const response = await axios.put(
        `/api/workspace/${workspaceId}/document/${documentId}/content`,
        {
          content: currentContent,
        }
      );

      if (response.data.status === "success") {
        toast.success("Document saved successfully!");
        setContent(currentContent);
      } else {
        toast.error("Failed to save document");
      }
    } catch (error: any) {
      console.error("Error saving document:", error);
      toast.error(error.response?.data?.message || "Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save functionality (periodic backup)
  useEffect(() => {
    if (!editor) return;

    const interval = setInterval(() => {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        // Auto-save to database as backup
        saveContent();
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [editor, content]);

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading document...</span>
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
        onReconnect={initializeCollaboration}
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
          <span>Real-time collaboration • {connectionStatus}</span>
        </div>
      )}
    </div>
  );
}
