import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DepartmentsClient from "./departments-client";

export default async function DepartmentsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as any).role;

  if (userRole !== "ADMIN") {
    redirect("/admin");
  }

  return <DepartmentsClient />;
}
