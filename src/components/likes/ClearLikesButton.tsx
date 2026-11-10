"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLikes } from "./useLikes";

export default function ClearLikesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("¿Quitar todos tus me gusta?")) return;
        setLikes([]);
        startTransition(() => router.refresh());
      }}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-danger/60 hover:text-foreground disabled:opacity-50"
    >
      Quitar todos
    </button>
  );
}
