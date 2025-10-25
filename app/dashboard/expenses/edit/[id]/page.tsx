
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import EditExpenseClaimClient from "./edit-expense-claim-client";

export default async function EditExpenseClaimPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // Fetch the expense claim
  const expenseClaim = await prisma.expenseClaim.findUnique({
    where: { id: params.id },
    include: {
      travelRequest: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!expenseClaim) {
    redirect("/dashboard?type=expenses");
  }

  // Verify the expense claim belongs to the user
  if (expenseClaim.travelRequest.userId !== userId) {
    redirect("/dashboard?type=expenses");
  }

  // Only allow editing of AMENDMENT_REQUESTED claims
  if (expenseClaim.status !== "AMENDMENT_REQUESTED") {
    redirect("/dashboard?type=expenses");
  }

  // Serialize the expense claim for the client component
  const serializedClaim = {
    ...expenseClaim,
    date: expenseClaim.date.toISOString(),
  };

  return <EditExpenseClaimClient expenseClaim={serializedClaim} />;
}
