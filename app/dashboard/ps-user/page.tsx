import { getServerSession } from "@/lib/session";
import PsUserClient from "@/components/dashboard/PsUserClient";

export default async function PsUserPage() {
  const session = await getServerSession();
  return <PsUserClient initialSession={session} />;
}