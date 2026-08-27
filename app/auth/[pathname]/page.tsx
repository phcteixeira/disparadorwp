import { AuthView, authViewPaths } from "@neondatabase/auth-ui";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((pathname) => ({ pathname }));
}

export default async function AuthPage({ params }: { params: Promise<{ pathname: string }> }) {
  const { pathname } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-4">
      <div className="text-lg font-semibold text-slate-900">DisparadorWP</div>
      <AuthView pathname={pathname} />
    </main>
  );
}
