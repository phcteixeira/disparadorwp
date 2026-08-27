"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/ui/form-alert";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { data, error: createError } = await authClient.organization.create({ name, slug });
      if (createError) {
        setError(createError.message ?? "Não foi possível criar o workspace.");
        return;
      }
      router.push(`/w/${data?.slug ?? slug}/contatos`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormAlert message={error} />
      <div>
        <Label htmlFor="ws-name">Nome do workspace</Label>
        <Input
          id="ws-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Ex.: Cliente Acme"
          required
        />
      </div>
      <div>
        <Label htmlFor="ws-slug">Identificador (usado na URL)</Label>
        <Input
          id="ws-slug"
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugTouched(true);
          }}
          placeholder="cliente-acme"
          required
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Criando…" : "Criar workspace"}
      </Button>
    </form>
  );
}
