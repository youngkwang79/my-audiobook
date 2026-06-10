"use client";

import { usePathname } from "next/navigation";
import LayoutFooter from "./LayoutFooter";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isGamePage = pathname === "/me/game";
  const isHomePage = pathname === "/";

  return (
    <>
      {children}
      {!isGamePage && (
        <>
          {!isHomePage}
          <LayoutFooter />
        </>
      )}
    </>
  );
}
