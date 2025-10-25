
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ApprovalsClient from "./approvals-client";

const APPROVER_EMAIL = "conrad.kraft@digital-euro-association.de";

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user is approver
  if ((session.user as any).role !== "APPROVER" && session.user?.email !== APPROVER_EMAIL) {
    redirect("/dashboard");
  }

  return <ApprovalsClient />;
}
