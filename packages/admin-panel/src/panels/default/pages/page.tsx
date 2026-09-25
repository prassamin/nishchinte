import { redirect } from "next/navigation";
import { auth } from "@nishchinte/auth/server";
import { DashboardView } from "./view";

export default async function AdminDashboardPage() {
  const hasAdmin = await auth.admin.hasAdmin();
  if (!hasAdmin) {
    redirect("/admin/setup");
  }

  const user = await auth.admin.getUser();

  if (!user) {
    redirect("/admin/sign-in");
  }

  // TODO: update it
  const metrics = {
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalTeamMembers: 0,
    recentOrders: [],
    lowStockProducts: [],
  };

  return <DashboardView user={user} metrics={metrics} />;
}
