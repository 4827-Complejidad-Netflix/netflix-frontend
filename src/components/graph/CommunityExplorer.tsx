"use client";

import type { Core, EdgeSingular, ElementDefinition } from "cytoscape";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Community, Graph, IsolatedUser, Shared } from "@/lib/api";
import { communityColor, type CommunityMethod } from "@/lib/communities";

type Selection =
  | { kind: "community"; id: number }
  | { kind: "user"; ref: number }
  | { kind: "edge"; u: number; v: number; weight: number }
  | null;

type SharedState = { status: "loading" } | { status: "error" } | { status: "ok"; data: Shared };

interface Props {
  graph: Graph;
  communities: Community[];
  isolated: IsolatedUser[];
  method: CommunityMethod;
  /** Umbral de Jaccard usado (solo UFDS). */
  theta: number | null;
  /** Comunidades pedidas (solo Kruskal). */
  k: number | null;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;
const num = (x: number, digits = 2) => x.toLocaleString("es", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const nodeId = (ref: number) => `user-${ref}`;
const refOf = (id: string) => Number(id.replace("user-", ""));

function toElements(graph: Graph): ElementDefinition[] {
  const nodes: ElementDefinition[] = graph.nodes.map((n) => ({
    data: { id: n.id, ref: n.ref, community: n.level, label: `U${n.ref}`, color: communityColor(n.level) },
  }));
  const edges: ElementDefinition[] = graph.edges.map((e) => ({
    data: { id: `${e.source}__${e.target}`, source: e.source, target: e.target, weight: e.weight ?? 0 },
  }));
  return [...nodes, ...edges];
}

export default function CommunityExplorer({ graph, communities, isolated, method, theta, k }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const requestRef = useRef(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [shared, setShared] = useState<SharedState | null>(null);

  // Al elegir una arista se piden sus películas en común (desde el evento, no desde un efecto).
  function selectEdge(u: number, v: number, weight: number) {
    const request = ++requestRef.current;
    setSelection({ kind: "edge", u, v, weight });
    setShared({ status: "loading" });
    fetch(`/api/shared?u=${u}&v=${v}`)
      .then((res) => (res.ok ? (res.json() as Promise<Shared>) : Promise.reject(res.status)))
      .then((data) => request === requestRef.current && setShared({ status: "ok", data }))
      .catch(() => request === requestRef.current && setShared({ status: "error" }));
  }
  const selectEdgeRef = useRef(selectEdge);
  useEffect(() => {
    selectEdgeRef.current = selectEdge;
  });

  // Crea el grafo una vez por resultado.
  useEffect(() => {
    let cy: Core | undefined;
    let cancelled = false;

    // Cytoscape usa `window`: se importa solo en el navegador, después de montar.
    import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled || !containerRef.current) return;

      const weights = graph.edges.map((e) => e.weight ?? 0);
      const minW = weights.length ? Math.min(...weights) : 0;
      const range = (weights.length ? Math.max(...weights) : 0) - minW || 1;
      // Un bosque (Kruskal) tiene pocas aristas: con menos repulsión no queda tan estirado.
      const sparse = graph.edges.length < graph.nodes.length * 1.5;

      cy = cytoscape({
        container: containerRef.current,
        elements: toElements(graph),
        minZoom: 0.2,
        maxZoom: 3,
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(color)",
              label: "data(label)",
              color: "#ededed",
              "font-size": 9,
              "text-valign": "bottom",
              "text-margin-y": 3,
              "min-zoomed-font-size": 7,
              width: 18,
              height: 18,
            },
          },
          {
            selector: "edge",
            style: {
              // Grosor proporcional a la similitud de Jaccard.
              width: (ele: EdgeSingular) => 0.8 + (3.5 * ((ele.data("weight") as number) - minW)) / range,
              "line-color": "#4a4a4a",
              opacity: 0.6,
              "curve-style": "haystack",
              // Área de clic más ancha que la línea, para poder seleccionar aristas finas.
              "overlay-padding": 6,
              "overlay-opacity": 0,
            },
          },
          { selector: ".faded", style: { opacity: 0.1 } },
          { selector: "node.focus", style: { "border-width": 3, "border-color": "#ffffff" } },
          { selector: "edge.focus", style: { "line-color": "#ededed", opacity: 1 } },
        ],
      });

      cy.layout({
        name: "cose",
        animate: false,
        randomize: true,
        padding: 30,
        nodeRepulsion: () => (sparse ? 4000 : 9000),
        idealEdgeLength: () => (sparse ? 40 : 60),
      }).run();
      // Si el encuadre aleja demasiado, se fija un zoom mínimo para que los nodos sigan siendo legibles.
      if (cy.zoom() < 0.8) {
        cy.zoom(0.8);
        cy.center();
      }

      cy.on("tap", "node", (evt) => setSelection({ kind: "user", ref: evt.target.data("ref") }));
      cy.on("tap", "edge", (evt) => {
        const e = evt.target;
        selectEdgeRef.current(refOf(e.data("source")), refOf(e.data("target")), e.data("weight"));
      });
      cy.on("tap", (evt) => {
        if (evt.target === cy) setSelection(null);
      });
      cyRef.current = cy;
    });

    return () => {
      cancelled = true;
      cyRef.current = null;
      cy?.destroy();
    };
  }, [graph]);

  // Refleja la selección en el grafo: resalta lo elegido y atenúa el resto.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass("faded focus");
    if (!selection) return;
    cy.elements().addClass("faded");
    if (selection.kind === "community") {
      const nodes = cy.nodes().filter((n) => n.data("community") === selection.id);
      nodes.union(nodes.edgesWith(nodes)).removeClass("faded");
    } else if (selection.kind === "user") {
      const node = cy.getElementById(nodeId(selection.ref));
      node.closedNeighborhood().removeClass("faded");
      node.addClass("focus");
    } else {
      const edge = cy.getElementById(`${nodeId(selection.u)}__${nodeId(selection.v)}`);
      edge.union(edge.connectedNodes()).removeClass("faded").addClass("focus");
    }
  }, [selection]);

  const byId = new Map(communities.map((c) => [c.id, c]));
  const communityOf = new Map(communities.flatMap((c) => c.users.map((u) => [u, c] as const)));
  const isolatedOf = new Map(isolated.map((i) => [i.user, i]));

  let panel: React.ReactNode;
  if (selection?.kind === "community" && byId.has(selection.id)) {
    panel = <CommunityDetail community={byId.get(selection.id)!} method={method} theta={theta} />;
  } else if (selection?.kind === "user") {
    panel = (
      <UserDetail
        user={selection.ref}
        community={communityOf.get(selection.ref) ?? null}
        isolated={isolatedOf.get(selection.ref) ?? null}
        degree={graph.edges.filter((e) => e.source === nodeId(selection.ref) || e.target === nodeId(selection.ref)).length}
        theta={theta}
        k={k}
      />
    );
  } else if (selection?.kind === "edge") {
    panel = <EdgeDetail u={selection.u} v={selection.v} weight={selection.weight} shared={shared} method={method} theta={theta} />;
  } else {
    panel = (
      <Overview
        communities={communities}
        isolated={isolated}
        theta={theta}
        k={k}
        onSelect={(id) => setSelection({ kind: "community", id })}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-2">
        <div
          ref={containerRef}
          className="h-[560px] w-full rounded-xl border border-border bg-surface"
          aria-label="Grafo de comunidades"
        />
        <p className="text-sm text-muted">
          Haz clic en una comunidad del panel, en un usuario o en una conexión para ver qué películas los unen. Clic en
          el fondo para volver al resumen.
        </p>
      </div>
      <aside
        className="flex max-h-[560px] flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface p-5"
        aria-live="polite"
      >
        {selection && (
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="self-start text-xs text-muted hover:text-foreground"
          >
            ← Todas las comunidades
          </button>
        )}
        {panel}
      </aside>
    </div>
  );
}

function Dot({ id }: { id: number }) {
  return <span className="size-3 shrink-0 rounded-full" style={{ background: communityColor(id) }} />;
}

function Overview({
  communities,
  isolated,
  theta,
  k,
  onSelect,
}: {
  communities: Community[];
  isolated: IsolatedUser[];
  theta: number | null;
  k: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <>
      <div>
        <h3 className="font-semibold">Por qué se formó cada comunidad</h3>
        <p className="mt-1 text-xs text-muted">
          Dos usuarios se conectan cuando valoraron bien las mismas películas. Elige una comunidad para ver cuáles.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {communities.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className="flex w-full flex-col gap-1.5 rounded-lg border border-border p-3 text-left transition-colors hover:bg-surface-hover"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Dot id={c.id} /> Comunidad {c.id + 1}
                <span className="font-normal text-muted">· {c.users.length} usuarios</span>
              </span>
              <span className="text-xs text-muted">
                Comparten en promedio el {pct(c.avg_similarity)} de sus películas
                {c.shared_movies.length > 0 && (
                  <>
                    . Los une sobre todo <span className="text-foreground">{c.shared_movies[0].movie.title}</span> (
                    {c.shared_movies[0].users.length} de {c.users.length})
                  </>
                )}
                .
              </span>
            </button>
          </li>
        ))}
      </ul>
      {isolated.length > 0 && (
        <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Dot id={-1} /> Sin comunidad · {isolated.length}
          </span>
          <p className="mt-1.5">
            {theta !== null
              ? `Ningún par con ellos llega a θ = ${num(theta)}.`
              : `Kruskal se detuvo al quedar k = ${k} grupos, antes de unirlos: son los menos parecidos al resto.`}{" "}
            Haz clic en uno para ver con quién quedó más cerca.
          </p>
        </div>
      )}
    </>
  );
}

function CommunityDetail({
  community: c,
  method,
  theta,
}: {
  community: Community;
  method: CommunityMethod;
  theta: number | null;
}) {
  const n = c.users.length;
  const pairs = (n * (n - 1)) / 2;
  const distinctive = c.genres.filter((g) => g.lift >= 1.15);

  return (
    <>
      <h3 className="flex items-center gap-2 font-semibold">
        <Dot id={c.id} /> Comunidad {c.id + 1} · {n} usuarios
      </h3>

      <section className="flex flex-col gap-1.5 text-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Por qué se formó</h4>
        {method === "ufds" && theta !== null ? (
          <p>
            {c.internal_edges} pares de usuarios superan el umbral θ = {num(theta)}; en esos pares comparten en promedio
            el {pct(c.avg_similarity)} de sus películas (Jaccard medio {num(c.avg_similarity)}).
            {c.internal_edges < pairs && (
              <span className="text-muted">
                {" "}
                UFDS los agrupa por transitividad: solo {c.internal_edges} de {pairs} pares son similares directamente;
                el resto queda unido a través de otros miembros.
              </span>
            )}
          </p>
        ) : (
          <p>
            Kruskal unió primero a sus pares más parecidos: las {c.internal_edges} aristas de su árbol tienen un Jaccard
            medio de {num(c.avg_similarity)}, es decir, cada par une a usuarios que comparten en promedio el{" "}
            {pct(c.avg_similarity)} de sus películas.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Películas que los unen</h4>
        {c.shared_movies.length === 0 ? (
          <p className="text-sm text-muted">Ninguna película la valoraron dos o más miembros.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {c.shared_movies.map((s) => (
              <li key={s.movie.id} className="flex flex-col gap-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate">
                    {s.movie.title} {s.movie.year && <span className="text-muted">({s.movie.year})</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {s.users.length} de {n}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-border">
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${(s.users.length / n) * 100}%`, background: communityColor(c.id) }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {c.genres.length > 0 && (
        <section className="flex flex-col gap-1.5 text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Géneros</h4>
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {c.genres.map((g) => (
              <li key={g.genre} className="rounded-full border border-border px-2 py-0.5">
                {g.genre} · {pct(g.share)}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            {distinctive.length > 0
              ? `Ven más ${distinctive.map((g) => `${g.genre} (×${num(g.lift, 1)})`).join(", ")} que el promedio de la muestra.`
              : "Sus géneros siguen el promedio de la muestra: lo que los une son sobre todo películas populares (sesgo de popularidad)."}
          </p>
        </section>
      )}
    </>
  );
}

function UserDetail({
  user,
  community,
  isolated,
  degree,
  theta,
  k,
}: {
  user: number;
  community: Community | null;
  isolated: IsolatedUser | null;
  degree: number;
  theta: number | null;
  k: number | null;
}) {
  const liked = community?.shared_movies.filter((s) => s.users.includes(user)) ?? [];

  return (
    <>
      <h3 className="flex items-center gap-2 font-semibold">
        <Dot id={community?.id ?? -1} /> Usuario {user}
      </h3>
      <p className="text-sm text-muted">
        {community ? `Comunidad ${community.id + 1}` : "Sin comunidad"} · {degree} {degree === 1 ? "conexión" : "conexiones"}
      </p>

      {community ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Películas que comparte con su comunidad
          </h4>
          {liked.length === 0 ? (
            <p className="text-sm text-muted">
              No tiene ninguna de las películas más compartidas: está en la comunidad por transitividad, a través de sus
              conexiones.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {liked.map((s) => (
                <li key={s.movie.id} className="flex justify-between gap-3">
                  <span className="truncate">{s.movie.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    con {s.users.length - 1} {s.users.length - 1 === 1 ? "miembro" : "miembros"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        isolated && (
          <p className="text-sm">
            {isolated.best_match === null ? (
              "No comparte ninguna película con el resto de la muestra."
            ) : (
              <>
                Su usuario más parecido es <span className="font-semibold">U{isolated.best_match}</span>, con un Jaccard
                de {num(isolated.similarity)}: comparten solo el {pct(isolated.similarity)} de sus películas.{" "}
                {theta !== null
                  ? `Como es menor que θ = ${num(theta)}, UFDS no lo une a nadie.`
                  : `Kruskal procesa las aristas de mayor a menor similitud y se detuvo al quedar k = ${k} grupos, antes de llegar a esta.`}
              </>
            )}
          </p>
        )
      )}

      {degree > 0 && (
        <p className="text-xs text-muted">Haz clic en una de sus conexiones para ver las películas que tienen en común.</p>
      )}
      <Link
        href={`/users/${user}`}
        className="text-sm underline decoration-muted underline-offset-2 hover:decoration-foreground"
      >
        Ver su perfil y recomendaciones
      </Link>
    </>
  );
}

function EdgeDetail({
  u,
  v,
  weight,
  shared,
  method,
  theta,
}: {
  u: number;
  v: number;
  weight: number;
  shared: SharedState | null;
  method: CommunityMethod;
  theta: number | null;
}) {
  return (
    <>
      <h3 className="font-semibold">
        U{u} — U{v}
      </h3>
      <p className="text-sm">
        Jaccard = {num(weight)}
        {method === "ufds" && theta !== null
          ? ` ≥ θ = ${num(theta)}, por eso UFDS los une.`
          : ": Kruskal eligió esta arista por ser de las más similares."}
      </p>

      {shared?.status === "loading" && <div className="h-32 animate-pulse rounded-lg bg-surface-hover" />}
      {shared?.status === "error" && <p className="text-sm text-danger">No se pudieron cargar las películas en común.</p>}
      {shared?.status === "ok" && (
        <section className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            Comparten {shared.data.shared_count} de las {shared.data.union_count} películas que valoraron entre los dos (
            {shared.data.shared_count} / {shared.data.union_count} = {num(shared.data.similarity)}).
          </p>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Películas en común</h4>
          <ul className="flex flex-col gap-1 text-sm">
            {shared.data.movies.map((m) => (
              <li key={m.id} className="flex justify-between gap-3">
                <span className="truncate">{m.title}</span>
                {m.year && <span className="shrink-0 text-xs text-muted">{m.year}</span>}
              </li>
            ))}
          </ul>
          {shared.data.shared_count > shared.data.movies.length && (
            <p className="text-xs text-muted">
              Y {shared.data.shared_count - shared.data.movies.length} más. Se muestran las más populares.
            </p>
          )}
        </section>
      )}
    </>
  );
}

export function CommunityExplorerSkeleton() {
  return <div className="h-[560px] w-full animate-pulse rounded-xl bg-surface" />;
}