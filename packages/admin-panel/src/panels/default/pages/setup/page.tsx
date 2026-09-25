import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@nishchinte/auth/server";
import { SetupView } from "./view";

export default async function AdminSetupPage() {
  const hasAdmin = await auth.admin.hasAdmin();
  if (hasAdmin) {
    const session = await auth.admin.getUser();
    if (session) {
      redirect("/admin");
    }
    redirect("/sign-in");
  }

  return (
    <Suspense fallback={null}>
      <SetupView />
    </Suspense>
  );
}
