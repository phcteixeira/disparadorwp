"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";
import { ptBR } from "@/lib/auth/localization";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      defaultTheme="light"
      navigate={router.push}
      replace={router.replace}
      Link={Link}
      redirectTo="/"
      localization={ptBR}
      organization={true}
      social={{ providers: [] }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
