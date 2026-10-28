"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function UserPicker({ userIds }: { userIds: number[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(id: number) {
    startTransition(() => router.push(`/users/${id}`));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = Number(value);
    if (!userIds.includes(id)) {
      setError(`No existe el usuario ${value} (o no tiene valoraciones positivas).`);
      return;
    }
    setError(null);
    open(id);
  }

  function random() {
    open(userIds[Math.floor(Math.random() * userIds.length)]);
  }

  const button = "h-10 rounded-md px-4 text-sm font-semibold transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`ID de usuario (${userIds[0]}–${userIds[userIds.length - 1]})`}
          aria-label="ID de usuario"
          className="h-10 flex-1 rounded-md border border-white/10 bg-surface px-3 text-sm outline-none transition-colors focus:border-white/40"
        />
        <button type="submit" disabled={!value || isPending} className={`${button} bg-brand text-white hover:bg-brand/85`}>
          Ver perfil
        </button>
        <button type="button" onClick={random} disabled={isPending} className={`${button} bg-surface hover:bg-white/10`}>
          Usuario aleatorio
        </button>
      </form>
      {error && <p className="text-sm text-brand">{error}</p>}
    </div>
  );
}
