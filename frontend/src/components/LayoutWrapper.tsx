"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <div className="mx-auto my-5 w-[90%]">{children}</div>;
}
