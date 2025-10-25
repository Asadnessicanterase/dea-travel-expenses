
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "./ui/button";
import Image from "next/image";
import { 
  LogOut, 
  User, 
  LayoutDashboard, 
  CheckCircle,
  Home,
  Shield
} from "lucide-react";

export function Header() {
  const { data: session, status } = useSession() || {};

  if (status === "loading") {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl">
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/summary" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
              <Image 
                src="/dea-logo.png" 
                alt="DEA Logo" 
                width={140}
                height={36}
                className="h-9 w-auto"
              />
              <span className="text-xl font-bold text-gray-900">Travel</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/summary" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <Image 
              src="/dea-logo.png" 
              alt="DEA Logo" 
              width={140}
              height={36}
              className="h-9 w-auto"
            />
            <span className="text-xl font-bold text-gray-900">Travel</span>
          </Link>

          {session ? (
            <div className="flex items-center gap-4">
              <Link href="/summary">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  Summary
                </Button>
              </Link>

              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Requests
                </Button>
              </Link>
              
              {(session.user as any)?.role === "APPROVER" && (
                <Link href="/approvals">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Approvals
                  </Button>
                </Link>
              )}
              
              {(session.user as any)?.role === "ADMIN" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{session.user?.name}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm">Login</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
