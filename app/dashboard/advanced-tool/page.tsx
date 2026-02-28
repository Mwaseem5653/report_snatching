import { getServerSession } from "@/lib/session";
import AdvancedToolClient from "@/components/dashboard/AdvancedToolClient";

export default async function AdvancedToolPage() {
  const session = await getServerSession();
  return <AdvancedToolClient initialSession={session} />;
}
