import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { listMyWorkspaces, requireSession } from "@/lib/workspace/auth";

// Depende de sessão/cookies em toda requisição — nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function NovoWorkspacePage() {
  await requireSession();
  const workspaces = await listMyWorkspaces();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Novo workspace</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cada workspace tem seus próprios contatos, segmentos, campanhas e conexão de WhatsApp — use um
          por cliente.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <CreateWorkspaceForm />
        </CardContent>
      </Card>

      {workspaces.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Ou acesse um workspace existente:</p>
          <ul className="space-y-1">
            {workspaces.map((w) => (
              <li key={w.id}>
                <Link href={`/w/${w.slug}/contatos`} className="text-sm text-emerald-700 hover:underline">
                  {w.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}
