"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import type { WorkspaceDocument } from "@/types/types";
import toast from "react-hot-toast";
import Image from "next/image";
import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoverPickerDialog from "@/components/shared/CoverPickerDialog";
import EmojiPickerPopover from "@/components/shared/EmojiPickerPopover";
import AITemplateDialog from "./AITemplateDialog";
import { usePusherChannelContext } from "../../components/PusherChannelProvider";
import TipTapEditor from "./TipTapEditor";
import { User } from "@prisma/client";

interface DocumentWrapperProps {
  workspaceId: string;
  documentId: string;
  currentUser: User;
}

const DocumentWrapper = ({
  workspaceId,
  documentId,
  currentUser,
}: DocumentWrapperProps) => {
  const router = useRouter();
  const { channel: workspaceChannel } = usePusherChannelContext();

  const [documentInfo, setDocumentInfo] = useState<WorkspaceDocument | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string>("");
  const [coverImage, setCoverImage] = useState("/images/placeholder.svg");
  const [documentTitle, setDocumentTitle] = useState("");
  const [titleChanged, setTitleChanged] = useState(false);
  const [modelResponse, setModelResponse] = useState<any>(null);

  useEffect(() => {
    const fetchDocumentInfo = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `/api/workspace/${workspaceId}/document/${documentId}`
        );

        if (
          response.data.status === "success" &&
          response.data.data?.document
        ) {
          setDocumentInfo(response.data.data.document);
        } else {
          setError(response.data.message || "Failed to load document");
        }
      } catch (err: any) {
        console.error("Error fetching document:", err);
        setError(
          err.response?.data?.message ||
            "An error occurred while loading the document"
        );

        if (err.response?.status === 404) {
          router.push("/not-found");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentInfo();
  }, [workspaceId, documentId, router]);

  useEffect(() => {
    if (documentInfo) {
      setEmoji(documentInfo.emoji || "");
      setCoverImage(documentInfo.coverImage || "/images/placeholder.svg");
      setDocumentTitle(documentInfo.title || "");
      setTitleChanged(false);
    }
  }, [documentInfo]);

  useEffect(() => {
    if (!workspaceChannel) return;

    console.log("Setting up Pusher listeners for document:", documentId);

    const handleDocumentUpdated = (updatedDocument: WorkspaceDocument) => {
      console.log(
        "🔥 EVENT RECEIVED document-updated in DocumentContainer:",
        updatedDocument
      );

      if (updatedDocument.id === documentId) {
        setEmoji(updatedDocument.emoji || "");
        setCoverImage(updatedDocument.coverImage || "/images/placeholder.svg");

        if (!titleChanged) {
          setDocumentTitle(updatedDocument.title || "");
        }
      }
    };

    workspaceChannel.bind("document-updated", handleDocumentUpdated);

    return () => {
      console.log("Cleaning up Pusher listeners");
      workspaceChannel.unbind("document-updated", handleDocumentUpdated);
    };
  }, [workspaceChannel, documentId, titleChanged]);

  const onUpdateDocument = async (data: Partial<WorkspaceDocument>) => {
    try {
      console.log("Attempting to update document with data:", data);

      const response = await axios.patch(
        `/api/workspace/${workspaceId}/document/${documentId}`,
        data
      );

      if (response.data.status === "success") {
        console.log("Document updated successfully:", response.data);

        if (data.title !== undefined) {
          setTitleChanged(false);
        }

        toast.success("Document updated successfully");
      } else {
        toast.error(response.data.message || "Unknown error occurred");
      }
    } catch (error: any) {
      console.error("Error updating document:", error);
      const errorMessage =
        error.response?.data?.message || "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  const handleCoverChange = (newCover: string) => {
    if (newCover === coverImage) return;
    setCoverImage(newCover);
    onUpdateDocument({ coverImage: newCover });
  };

  const handleEmojiChange = (newEmoji: string) => {
    if (newEmoji === emoji) return;
    setEmoji(newEmoji);
    onUpdateDocument({ emoji: newEmoji });
  };

  const handleTitleChange = (newTitle: string) => {
    setDocumentTitle(newTitle);
    setTitleChanged(true);
  };

  const handleTitleBlur = () => {
    onUpdateDocument({ title: documentTitle });
  };

  // Handle AI template generation
  const handleAITemplateGenerated = (templateContent: any) => {
    setModelResponse(templateContent);
    // The TipTap editor will handle applying this content
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading Document...</div>
      </div>
    );
  }

  if (error || !documentInfo) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-500">
          {error || "Could not load document. Please try again later."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* Cover Image */}
      <CoverPickerDialog currentCover={coverImage} setCover={handleCoverChange}>
        <div className="relative group m-4 cursor-pointer">
          <h2 className="hidden absolute p-4 w-full h-full group-hover:flex items-center justify-center font-medium">
            Change Cover
          </h2>
          <div className="group-hover:opacity-40">
            <Image
              priority
              src={coverImage || "/placeholder.svg"}
              alt="cover"
              width={800}
              height={200}
              className="w-full h-[200px] object-cover rounded-lg"
            />
          </div>
        </div>
      </CoverPickerDialog>

      {/* Emoji */}
      <div className="relative z-10 -mt-14 ml-4 md:ml-8 lg:ml-12 cursor-pointer">
        <EmojiPickerPopover setEmoji={handleEmojiChange} type="document">
          <div className="w-24 flex items-center justify-center bg-[#ffffffb0] p-4 rounded-md shadow-md">
            {emoji ? (
              <span className="text-5xl">{emoji}</span>
            ) : (
              <SmilePlus className="h-10 w-10 text-gray-500" />
            )}
          </div>
        </EmojiPickerPopover>
      </div>

      {/* Title and AI Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-10 px-4 md:px-8 lg:px-12 py-4 gap-4">
        <input
          type="text"
          placeholder="Untitled Document"
          value={documentTitle}
          className="w-full md:max-w-[840px] font-bold text-4xl truncate outline-none"
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={handleTitleBlur}
        />
        <AITemplateDialog onGenerateTemplate={handleAITemplateGenerated}>
          <Button
            variant={"outline"}
            className="text-gray-700 hover:bg-gray-50 border-gray-300 rounded-lg"
          >
            <Image
              src={"/images/gemini-icon.svg"}
              alt="Gemini"
              width={24}
              height={24}
            />
            AI Template Generate
          </Button>
        </AITemplateDialog>
      </div>

      {/* TipTap Editor - Full Width */}
      <div className="flex-1 w-full px-4 md:px-8 lg:px-12 pb-8">
        <TipTapEditor
          workspaceId={workspaceId}
          documentId={documentId}
          placeholder="Start writing your document..."
          editable={true}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
};

export default DocumentWrapper;
