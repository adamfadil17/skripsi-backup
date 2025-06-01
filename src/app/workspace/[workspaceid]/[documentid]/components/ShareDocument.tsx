"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Copy, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { WorkspaceDocument } from "@/types/types";

interface ShareDocumentProps {
  workspaceId: string;
  document: WorkspaceDocument;
  children?: React.ReactNode;
}

export function ShareDocument({
  workspaceId,
  document,
  children,
}: ShareDocumentProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const shareableUrl = `${process.env.NEXT_PUBLIC_APP_URL}/workspace/${workspaceId}/${document.id}`;

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(link);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(null), 1300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
            className="cursor-pointer"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Share this document with others by sending them the link.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="share-link" className="text-sm font-medium">
              Document link
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="share-link"
                value={shareableUrl}
                readOnly
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                className="px-3"
                onClick={() => handleCopyLink(shareableUrl)}
              >
                {copied === shareableUrl ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
