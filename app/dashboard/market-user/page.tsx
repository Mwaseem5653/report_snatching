import { getServerSession } from "@/lib/session";
import MarketUserClient from "@/components/dashboard/MarketUserClient";

export default async function MarketUserPage() {
  const session = await getServerSession();
  return <MarketUserClient initialSession={session} />;
}
