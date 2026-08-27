import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { whatsappConnections, whatsappTemplates } from "@/lib/db/schema";
import { getSegmentsWithCounts } from "@/lib/segments/queries";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignForm } from "../campaign-form";

export default async function NovaCampanhaPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);

  const [connections, templates, segments] = await Promise.all([
    db.select().from(whatsappConnections).where(eq(whatsappConnections.organizationId, ctx.organizationId)),
    db.select().from(whatsappTemplates).where(eq(whatsappTemplates.organizationId, ctx.organizationId)),
    getSegmentsWithCounts(ctx.organizationId),
  ]);

  if (connections.length === 0 || segments.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 py-8 text-center">
          <p className="text-slate-600">
            {connections.length === 0
              ? "Conecte um provedor de WhatsApp antes de criar uma campanha."
              : "Crie ao menos um segmento antes de criar uma campanha."}
          </p>
          <Link
            href={connections.length === 0 ? `/w/${workspace}/configuracoes/whatsapp` : `/w/${workspace}/segmentos`}
            className="text-sm text-emerald-700 hover:underline"
          >
            {connections.length === 0 ? "Ir para Configurações > Conexão WhatsApp" : "Ir para Segmentos"}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <CampaignForm workspace={workspace} timezone={ctx.timezone} connections={connections} templates={templates} segments={segments} />
  );
}
