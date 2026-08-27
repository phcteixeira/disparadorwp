import { cn } from "@/lib/utils";

export function FormAlert({ message, tone = "error" }: { message?: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return (
    <div
      className={cn(
        "mb-3 rounded-md px-3 py-2 text-sm",
        tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700",
      )}
    >
      {message}
    </div>
  );
}
