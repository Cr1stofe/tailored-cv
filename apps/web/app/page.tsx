import { cookies } from "next/headers";
import { LandingView } from "./components/LandingView";
import { DashboardView } from "./components/DashboardView";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("sid") || cookieStore.has("__Secure-sid");

  if (!hasSession) {
    return <LandingView />;
  }

  return <DashboardView />;
}
