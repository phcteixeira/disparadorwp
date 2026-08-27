import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { whatsappConnections } from "@/lib/db/schema";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { Card, CardContent } from "@/components/ui/card";
import { TemplateWizard } from "./template-wizard";

export default async function NovoTemplatePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);

  const connections = await db
    .select()
    .from(whatsappConnections)
    .where(eq(whatsappConnections.organizationId, ctx.organizationId));

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 py-8 text-center">
          <p className="text-slate-600">Conecte um provedor de WhatsApp antes de criar templates.</p>
          <Link href={`/w/${workspace}/configuracoes/whatsapp`} className="text-sm text-emerald-700 hover:underline">
            Ir para Configurações &gt; Conexão WhatsApp
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <TemplateWizard workspace={workspace} connections={connections} />;
}
