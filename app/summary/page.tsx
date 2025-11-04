
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SummaryClient from "./summary-client";

export default async function SummaryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Admins should not access the summary page
  if ((session.user as any)?.role === "ADMIN") {
    redirect("/admin");
  }

  return <SummaryClient />;
}
