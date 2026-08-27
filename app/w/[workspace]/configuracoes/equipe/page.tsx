import { auth } from "@/lib/auth/server";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { EquipeClient } from "./equipe-client";

export default async function EquipePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);

  const [{ data: memberData }, { data: invitationData }] = await Promise.all([
    auth.organization.listMembers({ query: { organizationId: ctx.organizationId, limit: 200 } }),
    auth.organization.listInvitations({ query: { organizationId: ctx.organizationId } }),
  ]);

  const members = (memberData?.members ?? []) as Array<{
    id: string;
    userId: string;
    role: string;
    user?: { email?: string; name?: string };
  }>;
  const invitations = ((invitationData ?? []) as Array<{ id: string; email: string; role: string; status: string }>).filter(
    (i) => i.status === "pending",
  );

  return (
    <EquipeClient
      workspace={workspace}
      members={members}
      invitations={invitations}
      currentUserId={ctx.userId}
      canManage={ctx.role === "admin" || ctx.role === "owner"}
    />
  );
}
