import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { WorkspaceClient } from "./workspace-client";

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);

  return (
    <WorkspaceClient
      workspace={workspace}
      name={ctx.organizationName}
      timezone={ctx.timezone}
      canManage={ctx.role === "admin" || ctx.role === "owner"}
      isOwner={ctx.role === "owner"}
    />
  );
}
