'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, List } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { Workspace } from '@/types/types';
import axios from 'axios';
import { toast } from 'sonner';
import { WorkspaceItem } from './WorkspaceItem';
import { EmptyWorkspace } from './EmptyWorkspace';
import CreateWorkspaceDialog from './CreateWorkspaceDialog';

interface WorkspaceOrganizerProps {
  workspaces: Workspace[];
  isSuperAdmin: boolean;
  viewMode?: 'grid' | 'list';
}

const ITEMS_PER_PAGE = 6;

export default function WorkspaceOrganizer({
  workspaces,
  isSuperAdmin,
  viewMode: initialViewMode = 'grid',
}: WorkspaceOrganizerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(workspaces.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentWorkspaces = workspaces.slice(startIndex, endIndex);

  async function handleDeleteWorkspace(workspaceId: string) {
    try {
      await axios.delete('/api/workspaces', { params: { workspaceId } });
      toast('Workspace has been deleted');
    } catch (error: any) {
      console.error(
        'Error deleting workspace:',
        error.response?.data || error.message
      );
      toast.error('Failed to delete workspace');
    }
  }

  return (
    <div className="space-y-6 px-6 md:px-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Workspaces✨</h2>
        <div className="flex items-center gap-2">
          <CreateWorkspaceDialog>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Workspace
            </Button>
          </CreateWorkspaceDialog>

          {workspaces.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Grid view</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
                <span className="sr-only">List view</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {workspaces.length === 0 ? (
        <EmptyWorkspace />
      ) : (
        <>
          <div
            className={
              viewMode === 'grid'
                ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-4'
            }
          >
            {currentWorkspaces.map((workspace) => (
              <WorkspaceItem
                key={workspace.id}
                workspace={workspace}
                viewMode={viewMode}
                isSuperAdmin={isSuperAdmin}
                onDelete={handleDeleteWorkspace}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination className="flex justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.max(prev - 1, 1));
                    }}
                    className={
                      currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                    }
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(i + 1);
                      }}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                    }}
                    className={
                      currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
