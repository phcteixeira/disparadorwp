import { describe, expect, it } from "vitest";
import type { ContactForSend, TemplateComponent, VariableMapping } from "@/lib/whatsapp/types";
import { buildSendComponents, extractPlaceholders } from "./mapper";

const contact: ContactForSend = {
  name: "Maria Silva",
  phone: "5511988887777",
  email: "maria@example.com",
  customFields: { plano: "Pro" },
};

describe("extractPlaceholders", () => {
  it("extrai números únicos e ordenados", () => {
    expect(extractPlaceholders("Olá {{1}}, seu pedido {{2}} chegou. Obrigado {{1}}!")).toEqual([1, 2]);
  });

  it("retorna vazio para texto sem variáveis", () => {
    expect(extractPlaceholders("Olá, tudo bem?")).toEqual([]);
  });

  it("retorna vazio para undefined", () => {
    expect(extractPlaceholders(undefined)).toEqual([]);
  });
});

describe("buildSendComponents", () => {
  const templateComponents: TemplateComponent[] = [
    { type: "HEADER", format: "TEXT", text: "Bem vindo, {{1}}!" },
    { type: "BODY", text: "Seu plano {{1}} vence em {{2}} dias." },
    { type: "FOOTER", text: "Equipe de vendas" },
  ];

  it("preenche variáveis de HEADER e BODY a partir do contato e de valores fixos", () => {
    const mapping: VariableMapping = {
      HEADER: { 1: { source: "contact_field", field: "name" } },
      BODY: {
        1: { source: "contact_field", field: "custom.plano" },
        2: { source: "static", value: "5" },
      },
    };

    const { components, renderedVariables } = buildSendComponents(templateComponents, mapping, contact);

    expect(components).toEqual([
      { type: "header", parameters: [{ type: "text", text: "Maria Silva" }] },
      {
        type: "body",
        parameters: [
          { type: "text", text: "Pro" },
          { type: "text", text: "5" },
        ],
      },
    ]);
    expect(renderedVariables).toEqual({
      "HEADER.1": "Maria Silva",
      "BODY.1": "Pro",
      "BODY.2": "5",
    });
  });

  it("ignora componentes sem variáveis (ex.: FOOTER estático)", () => {
    const { components } = buildSendComponents(
      [{ type: "FOOTER", text: "Equipe de vendas" }],
      {},
      contact,
    );
    expect(components).toEqual([]);
  });

  it("usa string vazia quando não há mapeamento para uma variável", () => {
    const { components } = buildSendComponents(
      [{ type: "BODY", text: "Olá {{1}}" }],
      {},
      contact,
    );
    expect(components).toEqual([{ type: "body", parameters: [{ type: "text", text: "" }] }]);
  });
});
