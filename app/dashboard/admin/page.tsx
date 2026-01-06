import { getServerSession } from "@/lib/session";
import AdminClient from "@/components/dashboard/AdminClient";

export default async function AdminPage() {
  const session = await getServerSession();
  return <AdminClient initialSession={session} />;
}
