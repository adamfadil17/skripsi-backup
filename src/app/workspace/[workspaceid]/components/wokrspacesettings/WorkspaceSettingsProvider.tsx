"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { WorkspaceInfo } from "@/types/types"



export interface ModalState {
  isEditing: boolean
  showLeaveConfirmation: boolean
  showDeleteConfirmation: boolean
}

export const workspaceFormSchema = z.object({
  workspaceName: z
    .string()
    .min(1, { message: "Workspace name is required" })
    .max(50, "Workspace name must be 50 characters or less"),
  emoji: z.string().optional(),
  coverImage: z.string().default("/images/placeholder.svg"),
})

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>

export type ModalStateKey = keyof ModalState

interface WorkspaceSettingsContextType {
  workspaceInfo: WorkspaceInfo
  currentMenu: "general" | "accounts"
  setCurrentMenu: (menu: "general" | "accounts") => void
  modalState: ModalState
  toggleModalState: (stateName: ModalStateKey, value: boolean) => void
  emoji: string
  setEmoji: (emoji: string) => void
  workspaceName: string
  setWorkspaceName: (name: string) => void
  coverImage: string
  setCoverImage: (url: string) => void
  showEmojiPicker: boolean
  setShowEmojiPicker: (show: boolean) => void
  editWorkspaceForm: ReturnType<typeof useForm<WorkspaceFormValues>>
}

const WorkspaceSettingsContext = createContext<WorkspaceSettingsContextType | undefined>(undefined)

export function WorkspaceSettingsProvider({
  children,
  initialWorkspaceInfo,
  initialMenu = "general",
}: {
  children: ReactNode
  initialWorkspaceInfo: WorkspaceInfo
  initialMenu?: "general" | "accounts"
}) {
  const [workspaceInfo] = useState<WorkspaceInfo>(initialWorkspaceInfo)
  const [currentMenu, setCurrentMenu] = useState<"general" | "accounts">(initialMenu)
  const [modalState, setModalState] = useState<ModalState>({
    isEditing: false,
    showLeaveConfirmation: false,
    showDeleteConfirmation: false,
  })
  const [emoji, setEmoji] = useState<string>(initialWorkspaceInfo?.emoji || "")
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceInfo?.name || "")
  const [coverImage, setCoverImage] = useState(initialWorkspaceInfo?.coverImage || "/images/placeholder.svg")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const editWorkspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      workspaceName: workspaceName,
      emoji: emoji,
      coverImage: coverImage,
    },
  })

  const toggleModalState = (stateName: ModalStateKey, value: boolean) => {
    // Close all modal states first
    const newState = {
      isEditing: false,
      showLeaveConfirmation: false,
      showDeleteConfirmation: false,
    }

    // Then set the requested state
    newState[stateName] = value
    setModalState(newState)
  }

  return (
    <WorkspaceSettingsContext.Provider
      value={{
        workspaceInfo,
        currentMenu,
        setCurrentMenu,
        modalState,
        toggleModalState,
        emoji,
        setEmoji,
        workspaceName,
        setWorkspaceName,
        coverImage,
        setCoverImage,
        showEmojiPicker,
        setShowEmojiPicker,
        editWorkspaceForm,
      }}
    >
      {children}
    </WorkspaceSettingsContext.Provider>
  )
}

export function useWorkspaceSettings() {
  const context = useContext(WorkspaceSettingsContext)
  if (context === undefined) {
    throw new Error("useWorkspaceSettings must be used within a WorkspaceSettingsProvider")
  }
  return context
}

