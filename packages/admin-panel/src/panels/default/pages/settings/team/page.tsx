import { auth } from "@nishchinte/auth/server";
import { TeamSettingsView } from "./view";

export default async function TeamSettingsPage() {
  const currentAdmin = await auth.admin.getUser();
  return <TeamSettingsView initialUser={currentAdmin} />;
}
