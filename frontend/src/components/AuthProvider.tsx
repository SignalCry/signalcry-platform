"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider as AuthContextProvider, useAuth } from "@/src/hooks/useAuth";

function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    if (user && pathname === "/auth") {
      router.push("/");
    }
  }, [user, loading, pathname, router, mounted]);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContextProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthContextProvider>
  );
}
