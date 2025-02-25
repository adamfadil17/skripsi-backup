import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Image from "next/image"
import CreateWorkspaceDialog from "./CreateWorkspaceDialog"

export function EmptyWorkspace() {
  return (
    <div className="flex flex-col items-center justify-start h-[60vh] text-center">
      <Image
        src="/images/workspace-empty.png"
        alt="No workspaces"
        width={400}
        height={400}
        priority
        className="mb-2 w-64 h-64"
      />
      <h2 className="text-2xl font-bold mb-2">You Haven't Created Any Workspace Yet.</h2>
      <p className="text-lg text-muted-foreground mb-4">
        Click the button below to create your first workspace and begin collaborating.
      </p>
      <CreateWorkspaceDialog>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Workspace
        </Button>
      </CreateWorkspaceDialog>
    </div>
  )
}

