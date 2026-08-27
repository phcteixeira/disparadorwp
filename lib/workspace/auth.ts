import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export type WorkspaceRole = "member" | "admin" | "owner";

export interface WorkspaceContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  timezone: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: WorkspaceRole;
}

const ROLE_RANK: Record<string, number> = { member: 0, admin: 1, owner: 2 };

/** Sessão obrigatória — redireciona para o login se não houver usuário autenticado. */
export async function requireSession() {
  const { data } = await auth.getSession();
  if (!data?.user) {
    redirect("/auth/sign-in");
  }
  return data;
}

/**
 * Garante que o usuário logado é membro do workspace (organização) identificado pelo slug,
 * com papel mínimo `minRole`. Toda página/action que toca dados de negócio deve passar por aqui.
 */
export async function requireWorkspaceMember(
  slug: string,
  minRole: WorkspaceRole = "member",
): Promise<WorkspaceContext> {
  const session = await requireSession();

  const { data: org } = await auth.organization
    .getFullOrganization({ query: { organizationSlug: slug } })
    .catch(() => ({ data: null }));

  if (!org) {
    redirect("/novo-workspace");
  }

  const members = (org as { members?: Array<{ userId: string; role: string }> }).members ?? [];
  const member = members.find((m) => m.userId === session.user.id);

  if (!member) {
    redirect("/novo-workspace");
  }

  const role = member.role as WorkspaceRole;
  const roleRank = ROLE_RANK[role] ?? -1;
  const requiredRank = ROLE_RANK[minRole] ?? 99;
  if (roleRank < requiredRank) {
    redirect(`/w/${slug}`);
  }

  const metadata =
    typeof (org as { metadata?: unknown }).metadata === "string"
      ? (JSON.parse((org as { metadata: string }).metadata) as Record<string, unknown>)
      : ((org as { metadata?: Record<string, unknown> }).metadata ?? {});

  return {
    organizationId: (org as { id: string }).id,
    organizationName: (org as { name: string }).name,
    organizationSlug: slug,
    timezone: (metadata.timezone as string | undefined) ?? "America/Sao_Paulo",
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name ?? session.user.email,
    role,
  };
}

/** Lista os workspaces (organizações) do usuário logado, para o switcher e a tela pós-login. */
export async function listMyWorkspaces() {
  await requireSession();
  const { data: orgs } = await auth.organization.list();
  return (orgs ?? []) as Array<{ id: string; name: string; slug: string }>;
}
