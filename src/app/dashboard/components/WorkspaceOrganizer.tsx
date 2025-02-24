'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaPlus } from 'react-icons/fa6';
import { Edit, FileText, LayoutGrid, List, Pencil, Trash2 } from 'lucide-react';
import CreateWorkspaceDialog from './CreateWorkspaceDialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Image from 'next/image';
import { Workspace } from '@/types/types';

export interface WorkspaceOrganizerProps {
  workspaces: Workspace[];
  isSuperAdmin: boolean;
  viewMode: 'grid' | 'list';
}

const ITEMS_PER_PAGE = 6;

const WorkspaceOrganizer = ({
  workspaces,
  isSuperAdmin,
  viewMode: initialViewMode = 'grid',
}: WorkspaceOrganizerProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(workspaces.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentWorkspaces = workspaces.slice(startIndex, endIndex);

  const WorkspaceItem = ({ workspace }: { workspace: Workspace }) => {
    if (viewMode === 'list') {
      return (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <img
              src={
                workspace.coverImage || '/placeholder.svg?height=64&width=64'
              }
              alt={workspace.name}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold">
                {workspace.emoji} {workspace.name}
              </h3>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <p className="text-sm text-muted-foreground">
                  {workspace.documentCount} Documents
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="outline"
                        size="icon"
                        className="hover:text-green-500"
                      >
                        <span>
                          <Pencil className="h-4 w-4" />
                        </span>
                        <span className="sr-only">Edit workspace</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit Workspace</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="outline"
                        size="icon"
                        className="hover:text-red-500"
                      >
                        <span>
                          <Trash2 className="h-4 w-4" />
                        </span>
                        <span className="sr-only">Delete workspace</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete Workspace</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <Card className="border shadow">
        <CardHeader className="p-0">
          <div className="relative">
            <img
              src={
                workspace.coverImage || '/placeholder.svg?height=144&width=384'
              }
              alt={workspace.name}
              className="h-36 w-full object-cover rounded-t"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span>
                  {workspace.emoji} {workspace.name}
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <FileText className="w-4 h-4" /> {workspace.documentCount}{' '}
                Documents
              </p>
            </div>
            <div className="flex gap-2">
              {isSuperAdmin && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:text-green-500"
                        >
                          <Edit className="w-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit Workspace</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:text-red-500"
                        >
                          <Trash2 className="w-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete Workspace</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-start h-[60vh] text-center">
      <Image
        src={'/images/workspace-empty.png'}
        alt={'No workspaces'}
        width={400}
        height={400}
        priority
        className="mb-2 w-64 h-64"
      />
      <h2 className="text-2xl font-bold mb-2">
        You Haven't Created Any Workspace Yet.
      </h2>
      <p className="text-lg text-muted-foreground mb-4">
        Click the button below to create your first workspace and begin
        collaborating.
      </p>
      <CreateWorkspaceDialog>
        <Button>
          <FaPlus className="mr-2 h-4 w-4" /> Create Workspace
        </Button>
      </CreateWorkspaceDialog>
    </div>
  );

  return (
    <div className="space-y-6 px-6 md:px-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Workspaces✨</h2>
        <div className="flex items-center gap-2">
          <CreateWorkspaceDialog>
            <span>
              <Button>
                <FaPlus className="mr-2 h-4 w-4" /> Create Workspace
              </Button>
            </span>
          </CreateWorkspaceDialog>

          {workspaces.length > 0 && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                    >
                      <span>
                        <LayoutGrid className="h-4 w-4" />
                      </span>
                      <span className="sr-only">Grid view</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Grid View</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                    >
                      <span>
                        <List className="h-4 w-4" />
                      </span>
                      <span className="sr-only">List view</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>List View</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      {workspaces.length === 0 ? (
        <EmptyState />
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
              <WorkspaceItem key={workspace.id} workspace={workspace} />
            ))}
          </div>

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
              {[...Array(totalPages)].map((_, i) => (
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
        </>
      )}
    </div>
  );
};

export default WorkspaceOrganizer;
