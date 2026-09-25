import { auth } from "@nishchinte/auth/server";
import { TopBar } from "./components/topbar";
import { Sidebar } from "./components/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAdmin = await auth.admin.hasAdmin();
  if (!hasAdmin) {
    // If store has no admin yet, allow rendering children (which handles /admin/setup)
    return <>{children}</>;
  }

  const session = await auth.admin.getUser();

  return (
    <main data-dashboard data-admin-panel="default">
      {session && (
        <>
          <TopBar user={session} />
          <Sidebar />
        </>
      )}
      {children}
    </main>
  );
}
