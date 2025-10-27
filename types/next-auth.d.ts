import NextAuth, { DefaultSession } from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      position?: string | null;
      departmentId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    position?: string | null;
    departmentId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    position?: string | null;
    departmentId?: string | null;
  }
}
