import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let middleware: ((request: NextRequest) => any) | undefined;

export default function proxy(request: NextRequest) {
  // Criado só na primeira requisição real — auth.middleware() dispara a validação das env vars
  // do Neon Auth, que não deve rodar durante o "collect page data" do build.
  if (!middleware) {
    middleware = auth.middleware({ loginUrl: "/auth/sign-in" });
  }
  return middleware(request);
}

export const config = {
  matcher: ["/w/:path*", "/novo-workspace"],
};
