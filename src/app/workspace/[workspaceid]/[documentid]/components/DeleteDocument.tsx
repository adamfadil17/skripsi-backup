'use client';

import type React from 'react';
import { useState } from 'react';
import axios from 'axios';
import type { WorkspaceDocument } from '@/types/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface DeleteDocumentProps {
  workspaceId: string;
  document: WorkspaceDocument;
  children: React.ReactNode;
}

export function DeleteDocument({
  workspaceId,
  document,
  children,
}: DeleteDocumentProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    try {
      setIsDeleting(true);

      const response = await axios.delete(
        `/api/workspace/${workspaceId}/document/${document.id}`
      );

      if (response.data.status === 'success') {
        toast.success('Document has been deleted');

        // Fetch dokumen terbaru setelah delete
        const fetchRes = await axios.get(
          `/api/workspace/${workspaceId}/document`
        );
        const latestDocuments = fetchRes.data?.data?.documents;

        // Arahkan ke dokumen pertama jika masih ada, atau kembali ke halaman workspace
        if (latestDocuments && latestDocuments.length > 0) {
          router.push(`/workspace/${workspaceId}/${latestDocuments[0].id}`);
        } else {
          router.push(`/workspace/${workspaceId}`);
        }
      } else {
        toast.error(response.data.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'An unexpected error occurred.';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Document</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{document.title}&quot;? This
            action cannot be undone and all content inside it will be
            permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Document'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
