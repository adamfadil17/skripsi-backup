"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Code,
  HighlighterIcon as Highlight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link,
  ImageIcon,
  Table,
  CheckSquare,
  Type,
  Palette,
  Save,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ImageUploadDialog } from "./ImageUploadDialog";

interface EditorToolbarProps {
  editor: Editor;
  onSave?: () => void;
}

export function EditorToolbar({
  editor,
  onSave,
}: EditorToolbarProps) {
  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  // Check if cursor is inside a table
  const isInTable = editor.isActive("table");

  return (
    <div className="sticky top-0 z-50 border rounded-lg p-2 bg-white shadow-sm flex flex-wrap gap-1 items-center">
      {/* Save Button */}
      {onSave && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            title="Save (Ctrl+S)"
          >
            <Save className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor?.can?.()?.undo?.()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor?.can?.()?.redo?.()}
      >
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Formatting */}
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
      <Button
        variant={editor.isActive("highlight") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlight className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Headings */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Type className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            Heading 3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Text Color */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="grid grid-cols-6 gap-1 p-2">
            {[
              "#000000",
              "#FF0000",
              "#00FF00",
              "#0000FF",
              "#FFFF00",
              "#FF00FF",
              "#00FFFF",
              "#FFA500",
              "#800080",
              "#008000",
              "#000080",
              "#800000",
            ].map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: color }}
                onClick={() => editor.chain().focus().setColor(color).run()}
              />
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <Button
        variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive({ textAlign: "center" }) ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive({ textAlign: "right" }) ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        variant={
          editor.isActive({ textAlign: "justify" }) ? "default" : "ghost"
        }
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
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
        <CheckSquare className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Quote */}
      <Button
        variant={editor.isActive("blockquote") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </Button>

      {/* Link */}
      <Button
        variant={editor.isActive("link") ? "default" : "ghost"}
        size="sm"
        onClick={addLink}
      >
        <Link className="h-4 w-4" />
      </Button>

      {/* Enhanced Image Upload */}
      <ImageUploadDialog editor={editor}>
        <Button variant="ghost" size="sm">
          <ImageIcon className="h-4 w-4" />
        </Button>
      </ImageUploadDialog>

      {/* Enhanced Table Controls */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Table className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!isInTable ? (
            <DropdownMenuItem onClick={insertTable}>
              <Table className="h-4 w-4 mr-2" />
              Insert Table
            </DropdownMenuItem>
          ) : (
            <>
              {/* Row Controls */}
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Rows
              </div>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addRowBefore().run()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row Above
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row Below
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="text-red-600"
              >
                <Minus className="h-4 w-4 mr-2" />
                Delete Row
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Column Controls */}
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Columns
              </div>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Column Left
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Column Right
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="text-red-600"
              >
                <Minus className="h-4 w-4 mr-2" />
                Delete Column
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Table Controls */}
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Table
              </div>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              >
                <Type className="h-4 w-4 mr-2" />
                Toggle Header Row
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().toggleHeaderColumn().run()
                }
              >
                <Type className="h-4 w-4 mr-2" />
                Toggle Header Column
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Table
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
