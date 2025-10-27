
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ApprovalsClient from "./approvals-client";
import { isApproverOrAdmin } from "@/lib/approvers";

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // Check if user is approver or admin (department-aware)
  const canAccessApprovals = await isApproverOrAdmin(userId);

  if (!canAccessApprovals) {
    redirect("/dashboard");
  }

  return <ApprovalsClient />;
}
