import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@nishchinte/auth/server";
import { AdminSignInView } from "./view";

export default async function AdminSignInPage() {
  const hasAdmin = await auth.admin.hasAdmin();
  if (!hasAdmin) {
    redirect("/admin/setup");
  }

  const session = await auth.admin.getUser();
  if (session) {
    redirect("/admin");
  }

  return (
    <Suspense fallback={null}>
      <AdminSignInView />
    </Suspense>
  );
}
