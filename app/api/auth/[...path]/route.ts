import { auth } from "@/lib/auth/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handlers: ReturnType<typeof auth.handler> | undefined;

function getHandlers() {
  // Criado só na primeira requisição real — ver comentário em proxy.ts.
  if (!handlers) {
    handlers = auth.handler();
  }
  return handlers;
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return getHandlers().GET(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return getHandlers().POST(request, context);
}
