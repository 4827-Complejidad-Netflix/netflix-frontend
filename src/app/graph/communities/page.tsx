import type { Metadata } from "next";
import { Suspense } from "react";
import ErrorState from "@/components/ErrorState";
import CommunityControls from "@/components/graph/CommunityControls";
import CommunityExplorer, { CommunityExplorerSkeleton } from "@/components/graph/CommunityExplorer";
import { api, type Community, type Graph, type IsolatedUser } from "@/lib/api";
import { communityHref, parseCommunityQuery, type CommunityQuery } from "@/lib/communities";

export const metadata: Metadata = { title: "Comunidades" };

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("es", { minimumFractionDigits: digits, maximumFractionDigits: digits });

interface Result {
  communities: Community[];
  isolated: number[];
  isolated_details: IsolatedUser[];
  sample: number[];
  graph: Graph;
  summary: { label: string; value: string }[];
  note: string;
}

async function fetchResult(q: CommunityQuery): Promise<Result> {
  const sampleParams = { sample_size: q.sample, seed: q.seed };

  if (q.method === "kruskal") {
    const data = await api.graph.kruskal({ ...sampleParams, k: q.k });
    const extra = data.communities.length + data.isolated.length > q.k;
    return {
      ...data,
      summary: [
        { label: "k pedido", value: String(data.k) },
        { label: "Comunidades", value: String(data.communities.length) },
        { label: "Aislados", value: String(data.isolated.length) },
        { label: "Similitud total", value: fmt(data.total_similarity) },
      ],
      note:
        "Kruskal (voraz) ordena los pares de usuarios por similitud de Jaccard y une primero los más parecidos, " +
        "deteniéndose al quedar k grupos. Las aristas mostradas forman el bosque de expansión máxima." +
        (extra ? " La muestra tiene usuarios sin ninguna película en común con el resto, por eso hay más de k grupos." : ""),
    };
  }

  const data = await api.graph.communities({ ...sampleParams, theta: q.theta });
  const largest = Math.max(0, ...data.communities.map((c) => c.users.length));
  return {
    ...data,
    summary: [
      { label: "Umbral θ", value: fmt(data.theta) },
      { label: "Comunidades", value: String(data.communities.length) },
      { label: "Mayor comunidad", value: `${largest} de ${data.sample.length}` },
      { label: "Aislados", value: String(data.isolated.length) },
    ],
    note:
      "Fuerza bruta calcula Jaccard entre todos los pares de la muestra; se dibuja una arista si J ≥ θ y " +
      "UFDS une sus conjuntos. Cada conjunto disjunto con más de un usuario es una comunidad.",
  };
}

async function Results({ query }: { query: CommunityQuery }) {
  let result: Result;
  try {
    result = await fetchResult(query);
  } catch (error) {
    return <ErrorState error={error} title="No se pudieron calcular las comunidades" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {result.summary.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-5 py-4">
            <span className="text-sm text-muted">{s.label}</span>
            <span className="text-2xl font-bold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted">{result.note}</p>

      <CommunityExplorer
        graph={result.graph}
        communities={result.communities}
        isolated={result.isolated_details}
        method={query.method}
        theta={query.method === "ufds" ? query.theta : null}
        k={query.method === "kruskal" ? query.k : null}
      />
    </div>
  );
}

async function Explorer({ searchParams }: Pick<PageProps<"/graph/communities">, "searchParams">) {
  const query = parseCommunityQuery(await searchParams);
  const href = communityHref(query);

  return (
    <>
      {/* Keys distintas (son hermanos): reinician el formulario y el Suspense en cada consulta. */}
      <CommunityControls key={`controls:${href}`} query={query} />
      <Suspense key={`results:${href}`} fallback={<CommunityExplorerSkeleton />}>
        <Results query={query} />
      </Suspense>
    </>
  );
}

export default function CommunitiesPage({ searchParams }: PageProps<"/graph/communities">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comunidades de gusto</h1>
        <p className="mt-1 text-sm text-muted">
          Proyección usuario–usuario G_U sobre una muestra de usuarios con 20 a 300 valoraciones positivas. La misma
          semilla siempre produce la misma muestra.
        </p>
      </div>
      <Suspense fallback={<CommunityExplorerSkeleton />}>
        <Explorer searchParams={searchParams} />
      </Suspense>
    </div>
  );
}