import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ErrorState from "@/components/ErrorState";
import UserPicker from "@/components/users/UserPicker";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Usuarios" };

async function Users() {
  let userIds: number[];
  try {
    userIds = await api.users.list();
  } catch (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <UserPicker userIds={userIds} />
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted">
          {userIds.length.toLocaleString("es")} usuarios con valoraciones positivas
        </h2>
        <ul className="flex flex-wrap gap-2">
          {userIds.map((id) => (
            <li key={id}>
              <Link
                href={`/users/${id}`}
                className="inline-flex h-8 min-w-11 items-center justify-center rounded bg-surface px-2 font-mono text-xs text-foreground/80 transition-colors hover:bg-brand hover:text-white"
              >
                {id}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function UsersPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="mt-1 text-sm text-muted">
          Elige un usuario para ver sus películas favoritas y las recomendaciones que genera el BFS sobre G_B.
        </p>
      </div>
      <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-surface" />}>
        <Users />
      </Suspense>
    </div>
  );
}
