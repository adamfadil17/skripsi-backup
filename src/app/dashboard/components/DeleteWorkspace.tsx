'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import axios from 'axios';
import type { Workspace } from '@/types/types';
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

interface DeleteWorkspaceProps {
  workspace: Workspace;
  children: React.ReactNode;
}

export function DeleteWorkspace({ workspace, children }: DeleteWorkspaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
    }
  }, [isOpen]);

  async function handleDelete() {
    try {
      setIsDeleting(true);
      await axios.delete(`/api/workspace/${workspace.id}`);
      toast.success('Workspace has been deleted');
      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error(
        'Error deleting workspace:',
        error.response?.data || error.message
      );
      toast.error('Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{workspace.name}&quot;? This
            action cannot be undone and all documents within this workspace will
            be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
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
              'Delete Workspace'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
