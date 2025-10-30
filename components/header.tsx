
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "./ui/button";
import Image from "next/image";
import { useState } from "react";
import {
  LogOut,
  User,
  LayoutDashboard,
  CheckCircle,
  Home,
  Shield,
  Menu,
  X
} from "lucide-react";

export function Header() {
  const { data: session, status } = useSession() || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (status === "loading") {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl">
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/summary" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
              <Image
                src="/dea-logo.png"
                alt="DEA Logo"
                width={140}
                height={36}
                className="h-8 w-auto hidden sm:block"
              />
              <Image
                src="/dea-logo.png"
                alt="DEA Logo"
                width={100}
                height={26}
                className="h-7 w-auto sm:hidden"
              />
              <span className="text-lg sm:text-xl font-bold text-gray-900">Travel</span>
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
          {/* Logo - Responsive sizing */}
          <Link href="/summary" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <Image
              src="/dea-logo.png"
              alt="DEA Logo"
              width={140}
              height={36}
              className="h-8 w-auto hidden sm:block"
            />
            <Image
              src="/dea-logo.png"
              alt="DEA Logo"
              width={100}
              height={26}
              className="h-7 w-auto sm:hidden"
            />
            <span className="text-lg sm:text-xl font-bold text-gray-900">Travel</span>
          </Link>

          {session ? (
            <>
              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-3">
                <Link href="/summary">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Home className="h-4 w-4" />
                    <span className="hidden xl:inline">Summary</span>
                  </Button>
                </Link>

                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden xl:inline">Requests</span>
                  </Button>
                </Link>

                {(session.user as any)?.role === "APPROVER" && (
                  <Link href="/approvals">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden xl:inline">Approvals</span>
                    </Button>
                  </Link>
                )}

                {(session.user as any)?.role === "ADMIN" && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="hidden xl:inline">Admin</span>
                    </Button>
                  </Link>
                )}

                <div className="flex items-center gap-2 text-sm ml-2 pl-2 border-l">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 hidden xl:inline">{session.user?.name}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden xl:inline">Logout</span>
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              {/* Mobile Menu Dropdown */}
              {mobileMenuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-white border-b shadow-lg lg:hidden">
                  <div className="container mx-auto max-w-7xl px-4 py-4 space-y-2">
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700 font-medium">{session.user?.name}</span>
                    </div>

                    <Link href="/summary" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <Home className="h-4 w-4" />
                        Summary
                      </Button>
                    </Link>

                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Requests
                      </Button>
                    </Link>

                    {(session.user as any)?.role === "APPROVER" && (
                      <Link href="/approvals" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Approvals
                        </Button>
                      </Link>
                    )}

                    {(session.user as any)?.role === "ADMIN" && (
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                          <Shield className="h-4 w-4" />
                          Admin
                        </Button>
                      </Link>
                    )}

                    <div className="pt-3 mt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
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
