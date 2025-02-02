import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { SidebarNav } from '@/components/shared/SidebarNav';
import { TopbarWorkspace } from '@/components/shared/TopbarWorkspace';
import { SidebarProvider } from '@/components/ui/sidebar';

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <SidebarNav />
        <div className="flex flex-col flex-1">
          <TopbarWorkspace currentUser={currentUser!} />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
