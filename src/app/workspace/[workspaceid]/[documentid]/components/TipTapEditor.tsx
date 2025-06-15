"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Type,
  Minus,
} from "lucide-react";
import { useState, useCallback } from "react";

const MenuBar = ({ editor }: { editor: any }) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

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
    <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center">
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
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        size="sm"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
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
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
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
                    onClick={() => editor.chain().focus().setColor(color).run()}
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
          <SelectItem value="Comic Sans MS, Comic Sans">Comic Sans</SelectItem>
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

      {/* Image */}
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
  );
};

export default function TipTapEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
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
        placeholder: "Start writing your content here...",
      }),
      CharacterCount.configure({
        limit: 10000,
      }),
    ],
    content: `
      <h1>Welcome to TipTap Editor!</h1>
      <p>This is a <strong>comprehensive</strong> rich text editor with <em>many</em> features:</p>
      <ul>
        <li>Basic formatting (bold, italic, underline, strikethrough)</li>
        <li>Headings and paragraphs</li>
        <li>Lists (ordered, unordered, task lists)</li>
        <li>Links and images</li>
        <li>Tables</li>
        <li>Text alignment</li>
        <li>Colors and highlighting</li>
        <li>And much more!</li>
      </ul>
      <h2>Try the features:</h2>
      <p>Select text and use the toolbar above to format it. You can also:</p>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true">Create task lists</li>
        <li data-type="taskItem" data-checked="false">Add links and images</li>
        <li data-type="taskItem" data-checked="false">Insert tables</li>
      </ul>
      <blockquote>
        <p>This is a blockquote. Perfect for highlighting important information!</p>
      </blockquote>
      <pre><code>// And code blocks for technical content
console.log('Hello, TipTap!');</code></pre>
    `,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4",
      },
    },
  });

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          TipTap Rich Text Editor
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <MenuBar editor={editor} />
        <div className="min-h-[400px]">
          <EditorContent editor={editor} />
        </div>
        {editor && (
          <div className="border-t border-gray-200 p-2 text-sm text-gray-500 flex justify-between">
            <span>
              {editor.storage.characterCount.characters()} characters,{" "}
              {editor.storage.characterCount.words()} words
            </span>
            <span>
              Limit: {editor.storage.characterCount.characters()}/10000
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
