import { getServerSession } from "@/lib/session";
import OfficerClient from "@/components/dashboard/OfficerClient";

export default async function OfficerPage() {
  const session = await getServerSession();
  return <OfficerClient initialSession={session} />;
}
