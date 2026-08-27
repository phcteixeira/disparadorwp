import { redirect } from "next/navigation";
import { listMyWorkspaces, requireSession } from "@/lib/workspace/auth";

export default async function HomePage() {
  await requireSession();
  const workspaces = await listMyWorkspaces();

  const first = workspaces[0];
  if (!first) {
    redirect("/novo-workspace");
  }

  redirect(`/w/${first.slug}/contatos`);
}
