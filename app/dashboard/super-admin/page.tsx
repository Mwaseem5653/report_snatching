import { getServerSession } from "@/lib/session";
import SuperAdminClient from "@/components/dashboard/SuperAdminClient";

export default async function SuperAdminPage() {
  const session = await getServerSession();
  return <SuperAdminClient initialSession={session} />;
}