import type { Metadata } from "next";
import { Suspense } from "react";
import ErrorState from "@/components/ErrorState";
import { api, type GraphStats } from "@/lib/api";

export const metadata: Metadata = { title: "Grafo" };

const MIN_NODES = 1500;

interface Stat {
  label: string;
  value: string;
  hint: string;
}

function toStats(s: GraphStats): Stat[] {
  const fmt = (n: number, digits = 0) =>
    n.toLocaleString("es", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return [
    { label: "Nodos", value: fmt(s.nodes), hint: `${fmt(s.users)} usuarios + ${fmt(s.movies)} películas` },
    { label: "Aristas", value: fmt(s.edges), hint: `Valoraciones con rating ≥ ${fmt(s.min_rating, 1)}` },
    { label: "Densidad", value: `${fmt(s.density * 100, 2)} %`, hint: "Aristas existentes / pares usuario–película posibles" },
    { label: "Grado medio", value: fmt(s.avg_degree, 2), hint: "2 · aristas / nodos" },
  ];
}

function StatCard({ label, value, hint }: Stat) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-surface px-5 py-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-3xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted">{hint}</span>
    </div>
  );
}

const statsGridClass = "grid grid-cols-2 gap-4 lg:grid-cols-4";

function StatsSkeleton() {
  return (
    <div className={statsGridClass}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-md bg-surface" />
      ))}
    </div>
  );
}

async function Stats() {
  let stats: GraphStats;
  try {
    stats = await api.graph.stats();
  } catch (error) {
    return <ErrorState error={error} title="No se pudieron cargar las métricas del grafo" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={statsGridClass}>
        {toStats(stats).map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
      <p className="text-sm text-muted">
        De las {stats.total_ratings.toLocaleString("es")} valoraciones del dataset se conservan las{" "}
        {stats.edges.toLocaleString("es")} positivas. Con {stats.nodes.toLocaleString("es")} nodos, G_B supera{" "}
        {(stats.nodes / MIN_NODES).toLocaleString("es", { maximumFractionDigits: 1 })} veces el mínimo de{" "}
        {MIN_NODES.toLocaleString("es")} nodos del enunciado.
      </p>
    </div>
  );
}

export default function GraphPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold">Grafo G_B</h1>
        <p className="mt-1 text-sm text-muted">
          Grafo bipartito usuario–película de MovieLens ml-latest-small. Cada arista es una valoración positiva.
        </p>
      </div>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>
    </div>
  );
}