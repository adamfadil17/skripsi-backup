"use client"

import type React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableHeader from "@tiptap/extension-table-header"
import TableCell from "@tiptap/extension-table-cell"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import TextStyle from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import FontFamily from "@tiptap/extension-font-family"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Placeholder from "@tiptap/extension-placeholder"
import CharacterCount from "@tiptap/extension-character-count"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
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
} from "lucide-react"
import { useState, useCallback, useRef, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { usePusherChannelContext } from "../../components/PusherChannelProvider"

interface TipTapEditorProps {
  workspaceId: string
  documentId: string
  placeholder?: string
  editable?: boolean
}

interface Attachment {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
  alt?: string
  caption?: string
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "ARCHIVE" | "OTHER"
}

const MenuBar = ({
  editor,
  onSave,
  workspaceId,
  documentId,
  isSaving,
}: {
  editor: any
  onSave: () => void
  workspaceId: string
  documentId: string
  isSaving: boolean
}) => {
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run()
      setLinkUrl("")
    }
  }, [editor, linkUrl])

  const addImage = useCallback(() => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl("")
    }
  }, [editor, imageUrl])

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("workspaceId", workspaceId)
      formData.append("documentId", documentId)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      const response = await axios.post("/api/attachments/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const attachment: Attachment = response.data

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
          .run()
      } else {
        // For non-image files, insert as a link
        editor
          .chain()
          .focus()
          .insertContent(`
          <a href="${attachment.url}" data-attachment-id="${attachment.id}" target="_blank">
            📎 ${attachment.filename}
          </a>
        `)
          .run()
      }

      toast.success("File uploaded successfully!")
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.response?.data?.message || "Upload failed")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  if (!editor) {
    return null
  }

  return (
    <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center sticky top-0 bg-white z-10">
      {/* Save Button */}
      <Button variant="default" size="sm" onClick={onSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
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
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        size="sm"
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        size="sm"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
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
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <Toggle
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
        size="sm"
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
        size="sm"
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
        size="sm"
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive({ textAlign: "justify" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("justify").run()}
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
                {["#000000", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"].map(
                  (color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color }}
                      onClick={() => editor.chain().focus().setColor(color).run()}
                    />
                  ),
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Highlight</label>
              <div className="flex gap-1 mt-1">
                {["#fef3c7", "#fecaca", "#fed7d7", "#e0e7ff", "#d1fae5", "#f3e8ff"].map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
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
            editor.chain().focus().unsetFontFamily().run()
          } else {
            editor.chain().focus().setFontFamily(value).run()
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
            <Input placeholder="Enter URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={addLink} size="sm">
                Add Link
              </Button>
              <Button onClick={() => editor.chain().focus().unsetLink().run()} variant="outline" size="sm">
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
            <Input placeholder="Enter image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <Button onClick={addImage} size="sm">
              Add Image
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* File Upload */}
      <Button variant="ghost" size="sm" onClick={triggerFileUpload} disabled={isUploading}>
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
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function TipTapEditor({
  workspaceId,
  documentId,
  placeholder = "Start writing your content here...",
  editable = true,
}: TipTapEditorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [content, setContent] = useState<any>(null)
  const { channel: workspaceChannel } = usePusherChannelContext()

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
        placeholder,
      }),
      CharacterCount.configure({
        limit: 10000,
      }),
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
  })

  // Fetch document content on mount
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(`/api/workspace/${workspaceId}/document/${documentId}/content`)

        if (response.data.status === "success" && response.data.data?.content) {
          const fetchedContent = response.data.data.content
          setContent(fetchedContent)
          if (editor) {
            editor.commands.setContent(fetchedContent)
          }
        }
      } catch (error: any) {
        console.error("Error fetching document content:", error)
        if (error.response?.status !== 404) {
          toast.error("Failed to load document content")
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (workspaceId && documentId) {
      fetchContent()
    }
  }, [workspaceId, documentId, editor])

  // Set content when editor is ready
  useEffect(() => {
    if (editor && content && !isLoading) {
      editor.commands.setContent(content)
    }
  }, [editor, content, isLoading])

  // Listen for real-time content updates
  useEffect(() => {
    if (!workspaceChannel || !editor) return

    const handleContentUpdate = (data: any) => {
      if (data.documentId === documentId) {
        console.log("🔥 Real-time content update received:", data)

        // Only update if the content is different and not from current user
        const currentContent = editor.getJSON()
        if (JSON.stringify(currentContent) !== JSON.stringify(data.content)) {
          editor.commands.setContent(data.content)
          toast.success(`Document updated by ${data.editedBy?.name || "another user"}`)
        }
      }
    }

    workspaceChannel.bind("document-content-updated", handleContentUpdate)

    return () => {
      workspaceChannel.unbind("document-content-updated", handleContentUpdate)
    }
  }, [workspaceChannel, editor, documentId])

  // Save content function
  const saveContent = async () => {
    if (!editor) return

    try {
      setIsSaving(true)
      const currentContent = editor.getJSON()

      const response = await axios.put(`/api/workspace/${workspaceId}/document/${documentId}/content`, {
        content: currentContent,
      })

      if (response.data.status === "success") {
        toast.success("Document saved successfully!")
        setContent(currentContent)
      } else {
        toast.error("Failed to save document")
      }
    } catch (error: any) {
      console.error("Error saving document:", error)
      toast.error(error.response?.data?.message || "Failed to save document")
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save functionality (optional)
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      // Debounce auto-save
      const timeoutId = setTimeout(() => {
        const currentContent = editor.getJSON()
        if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
          // Auto-save logic can be implemented here
          // saveContent()
        }
      }, 2000)

      return () => clearTimeout(timeoutId)
    }

    editor.on("update", handleUpdate)

    return () => {
      editor.off("update", handleUpdate)
    }
  }, [editor, content])

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading document...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full border rounded-lg bg-white">
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
            {editor.storage.characterCount.characters()} characters, {editor.storage.characterCount.words()} words
          </span>
          <span>Limit: {editor.storage.characterCount.characters()}/10000</span>
        </div>
      )}
    </div>
  )
}
