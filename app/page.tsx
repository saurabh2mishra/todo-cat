import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { LissieChat } from "@/components/lissie-chat";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

export default async function Home() {
  const userId = await getUserId(await headers());
  if (!userId) redirect("/login");

  const user = await db.query.user.findFirst({
    where: { id: userId },
    columns: { name: true },
  });
  if (!user) redirect("/login");

  return (
    <main className="lissie-page">
      <header className="lissie-page-header">
        <PageHeader title={`Hi, ${user.name}`}>
          Your list is under Lissie's supervision.
        </PageHeader>
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </header>
      <section className="lissie-chat" aria-label="Chat with Lissie">
        <LissieChat threadId={userId} />
      </section>
    </main>
  );
}
