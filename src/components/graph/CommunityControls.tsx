"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { communityHref, LIMITS, type CommunityMethod, type CommunityQuery } from "@/lib/communities";

const methods: { value: CommunityMethod; label: string }[] = [
  { value: "ufds", label: "UFDS (umbral θ)" },
  { value: "kruskal", label: "Kruskal (k comunidades)" },
];

// El padre le pasa key = URL actual, así el estado local se reinicia cuando cambia la consulta.
export default function CommunityControls({ query }: { query: CommunityQuery }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [theta, setTheta] = useState(query.theta);
  const [k, setK] = useState(String(query.k));
  const [sample, setSample] = useState(String(query.sample));
  const [seed, setSeed] = useState(String(query.seed));

  function go(next: Partial<CommunityQuery>) {
    const href = communityHref({ ...query, ...next });
    startTransition(() => router.replace(href, { scroll: false }));
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    go({ theta, k: Number(k) || query.k, sample: Number(sample) || query.sample, seed: Number(seed) || 0 });
  }

  const field =
    "h-10 rounded-md border border-white/10 bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-white/40";
  const button = "h-10 rounded-md px-4 text-sm font-semibold transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="tablist" aria-label="Algoritmo">
        {methods.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={query.method === m.value}
            disabled={isPending}
            onClick={() => go({ method: m.value })}
            className={`${button} ${query.method === m.value ? "bg-brand text-white" : "bg-surface hover:bg-white/10"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={apply} className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {query.method === "ufds" ? (
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            <span>
              Umbral θ: <span className="font-mono text-foreground">{theta.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={theta}
              onChange={(e) => setTheta(Number(e.target.value))}
              className="h-10 accent-brand"
            />
          </label>
        ) : (
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            Comunidades deseadas (k)
            <input
              type="number"
              min={LIMITS.k.min}
              max={LIMITS.k.max}
              value={k}
              onChange={(e) => setK(e.target.value)}
              className={field}
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm text-muted">
          Usuarios en la muestra
          <input
            type="number"
            min={LIMITS.sample.min}
            max={LIMITS.sample.max}
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            className={`${field} lg:w-40`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Semilla
          <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} className={`${field} lg:w-32`} />
        </label>
        <button type="submit" disabled={isPending} className={`${button} bg-brand text-white hover:bg-brand/85`}>
          {isPending ? "Calculando…" : "Aplicar"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => go({ seed: Math.floor(Math.random() * 10_000) })}
          className={`${button} bg-surface hover:bg-white/10`}
        >
          Nueva muestra
        </button>
      </form>
    </div>
  );
}