import type { Workspace } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, FileText, Trash2 } from 'lucide-react';
import { DeleteWorkspace } from './DeleteWorkspace';
import EditWorkspace from './EditWorkspace';
import Link from 'next/link';

interface WorkspaceItemProps {
  workspace: Workspace;
  viewMode: 'grid' | 'list';
  isSuperAdmin: boolean;
}

export function WorkspaceItem({
  workspace,
  viewMode,
  isSuperAdmin,
}: WorkspaceItemProps) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
        <Link
          href={`/workspace/${workspace.id}`}
          className="flex items-center gap-4 flex-grow cursor-pointer"
        >
          <img
            src={
              workspace.coverImage ||
              '/images/placeholder.svg?height=64&width=64'
            }
            alt={workspace.name}
            className="h-16 w-24 rounded-lg object-cover"
          />
          <div>
            <h3 className="font-semibold">
              {workspace.emoji} {workspace.name}
            </h3>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <p className="text-sm text-muted-foreground">
                {workspace.documentCount} Documents
              </p>
            </div>
          </div>
        </Link>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <EditWorkspace workspace={workspace}>
              <Button
                variant="outline"
                size="icon"
                className="hover:text-green-500"
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit workspace</span>
              </Button>
            </EditWorkspace>
            <DeleteWorkspace workspace={workspace}>
              <Button
                variant="outline"
                size="icon"
                className="hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete workspace</span>
              </Button>
            </DeleteWorkspace>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border shadow hover:shadow-lg transition-all">
      <CardHeader className="p-0">
        <Link href={`/workspace/${workspace.id}`}>
          <img
            src={
              workspace.coverImage ||
              '/images/placeholder.svg?height=144&width=384'
            }
            alt={workspace.name}
            className="h-36 w-full object-cover rounded-t"
          />
        </Link>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <Link href={`/workspace/${workspace.id}`} className="cursor-pointer">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {workspace.emoji} {workspace.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <FileText className="h-4 w-4" /> {workspace.documentCount}{' '}
                Documents
              </p>
            </div>
          </Link>
          {isSuperAdmin && (
            <div className="flex gap-2">
              <EditWorkspace workspace={workspace}>
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:text-green-500"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </EditWorkspace>
              <DeleteWorkspace workspace={workspace}>
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DeleteWorkspace>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
