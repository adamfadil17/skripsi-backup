'use client';

import { type ReactNode, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { GrGroup } from 'react-icons/gr';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  WorkspaceSettingsProvider,
  useWorkspaceSettings,
} from './WorkspaceSettingsProvider';
import { WorkspaceGeneralSettings } from './WorkspaceGeneralSettings';
import { WorkspaceAccountsSettings } from './WorkspaceAccountsSettings';
import { EmojiPickerPanel } from './EmojiPickerPanel';
import { WorkspaceInfo } from '@/types/types';

interface WorkspaceSettingsDialogProps {
  openType: 'accounts' | 'general';
  workspaceInfo: WorkspaceInfo;
  children: ReactNode;
}

const WorkspaceSettingsDialog = ({
  openType,
  workspaceInfo,
  children,
}: WorkspaceSettingsDialogProps) => {
  return (
    <WorkspaceSettingsProvider
      initialWorkspaceInfo={workspaceInfo}
      initialMenu={openType}
    >
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <WorkspaceDialogContent />
      </Dialog>
    </WorkspaceSettingsProvider>
  );
};

function WorkspaceDialogContent() {
  const { currentMenu, setCurrentMenu, showEmojiPicker, setShowEmojiPicker } =
    useWorkspaceSettings();

  // Close emoji picker when currentMenu changes
  useEffect(() => {
    setShowEmojiPicker(false);
  }, [currentMenu, setShowEmojiPicker]);

  return (
    <DialogContent
      className={cn(
        'p-0 overflow-hidden',
        showEmojiPicker ? 'max-w-[1230px]' : 'max-w-[880px]'
      )}
    >
      <div className="flex h-[700px]">
        <div
          className={cn(
            'flex h-full',
            showEmojiPicker ? 'w-[880px]' : 'flex-1'
          )}
        >
          <div className="w-[240px] border-r p-4 space-y-2">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Workspace</h2>
              <p className="text-sm text-muted-foreground">
                Manage your workspace.
              </p>
            </div>
            <div className="space-y-1">
              <Button
                variant={currentMenu === 'general' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => {
                  setCurrentMenu('general');
                  setShowEmojiPicker(false);
                }}
              >
                <Building2 className="h-4 w-4" />
                General
              </Button>
              <Button
                variant={currentMenu === 'accounts' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => {
                  setCurrentMenu('accounts');
                  setShowEmojiPicker(false);
                }}
              >
                <GrGroup className="h-4 w-4" />
                Accounts
              </Button>
            </div>
          </div>

          <div className="flex-1">
            <DialogHeader className="px-6 py-4 flex-row items-center justify-between border-b">
              <DialogTitle>
                {currentMenu === 'general' ? 'General' : 'Accounts'}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6">
              {currentMenu === 'general' ? (
                <WorkspaceGeneralSettings />
              ) : (
                <WorkspaceAccountsSettings />
              )}
            </div>
          </div>
        </div>

        {showEmojiPicker && (
          <div className="w-[350px] border-l mt-5">
            <EmojiPickerPanel />
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export default WorkspaceSettingsDialog;
