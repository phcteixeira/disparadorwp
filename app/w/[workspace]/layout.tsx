import type { ReactNode } from "react";
import { Sidebar } from "@/components/workspace/sidebar";
import { Topbar } from "@/components/workspace/topbar";
import { listMyWorkspaces, requireWorkspaceMember } from "@/lib/workspace/auth";

// Depende de sessão/cookies em toda requisição — aplica-se a todas as páginas aninhadas em
// /w/[workspace]/**, que nunca devem ser pré-renderizadas no build.
export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);
  const workspaces = await listMyWorkspaces();

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar workspace={workspace} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar currentName={ctx.organizationName} currentSlug={workspace} workspaces={workspaces} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
