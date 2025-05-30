import Topbar from "./components/Topbar";
import { getCurrentUser } from "../actions/getCurrentUser";
import { WorkspaceProvider } from "../context/WorkspaceContext";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser();
  return (
    <div className="flex flex-col w-full min-h-screen">
      <Topbar currentUser={currentUser!} />
      <WorkspaceProvider>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </WorkspaceProvider>
    </div>
  );
}
