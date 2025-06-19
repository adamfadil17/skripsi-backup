"use client";

import type React from "react";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Upload, Link, Loader2 } from "lucide-react";
import { CldUploadButton } from "next-cloudinary";
import type { Editor } from "@tiptap/react";
import Image from "next/image";

interface ImageUploadDialogProps {
  editor: Editor;
  children: React.ReactNode;
}

export function ImageUploadDialog({
  editor,
  children,
}: ImageUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const handleUrlSubmit = () => {
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
      setImageUrl("");
      setOpen(false);
    }
  };

  const handleUploadSuccess = (result: any) => {
    if (result?.info?.secure_url) {
      const url = result.info.secure_url;
      editor.chain().focus().setImage({ src: url }).run();
      setUploadedImages((prev) => [url, ...prev]);
      setIsUploading(false);
      setOpen(false);
    }
  };

  const handleUploadStart = () => {
    setIsUploading(true);
  };

  const insertExistingImage = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4 text-center">
                Upload an image from your device
              </p>

              <CldUploadButton
                uploadPreset="catatan_cerdas_document"
                onSuccess={handleUploadSuccess}
                onUpload={handleUploadStart}
                options={{
                  maxFiles: 1,
                  resourceType: "image",
                  clientAllowedFormats: ["jpg", "jpeg", "png", "gif", "webp"],
                  maxFileSize: 10000000, // 10MB
                }}
                className="w-full"
              >
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </>
                  )}
                </Button>
              </CldUploadButton>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                placeholder="/images/placeholder.svg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUrlSubmit();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleUrlSubmit}
              className="w-full"
              disabled={!imageUrl.trim()}
            >
              <Link className="h-4 w-4 mr-2" />
              Insert Image
            </Button>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            {uploadedImages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent images</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {uploadedImages.map((url, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer border rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
                    onClick={() => insertExistingImage(url)}
                  >
                    <Image
                      src={url || "/placeholder.svg"}
                      alt={`Uploaded image ${index + 1}`}
                      width={120}
                      height={80}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Insert
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
