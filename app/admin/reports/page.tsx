
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportsClient from "./reports-client";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Only allow ADMIN role
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <ReportsClient />;
}
