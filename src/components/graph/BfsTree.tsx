"use client";

import type { Core, ElementDefinition, Position } from "cytoscape";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Graph, GraphNode } from "@/lib/api";

// Un color por nivel del BFS, igual que la figura del árbol en el informe.
const LEVELS = [
  { color: "#e50914", text: "#ffffff", label: "Nivel 0 · usuario origen" },
  { color: "#f5a524", text: "#1a1a1a", label: "Nivel 1 · películas que le gustaron" },
  { color: "#4e9cf5", text: "#ffffff", label: "Nivel 2 · usuarios con gustos similares" },
  { color: "#3ccf91", text: "#1a1a1a", label: "Nivel 3 · películas candidatas" },
];

interface Selected {
  node: GraphNode;
  parentLabel: string | null;
  rating: number | null;
}

function toElements(graph: Graph): ElementDefinition[] {
  const nodes: ElementDefinition[] = graph.nodes.map((n) => {
    const level = LEVELS[Math.min(n.level, LEVELS.length - 1)];
    return {
      data: {
        id: n.id,
        label: n.kind === "user" ? `U${n.ref}` : n.label,
        color: level.color,
        textColor: level.text,
      },
      classes: n.kind,
    };
  });
  const edges: ElementDefinition[] = graph.edges.map((e) => ({
    data: { id: `${e.source}__${e.target}`, source: e.source, target: e.target },
  }));
  return [...nodes, ...edges];
}

const COLUMN_GAP = 230; // distancia horizontal entre niveles
const ROW_GAP = 46; // distancia vertical entre hojas

/** Árbol de izquierda a derecha: una columna por nivel, hojas apiladas y cada padre centrado entre sus hijos. */
function treeLayout(graph: Graph): { positions: Record<string, Position>; leaves: number } {
  const children = new Map<string, string[]>();
  for (const e of graph.edges) children.set(e.source, [...(children.get(e.source) ?? []), e.target]);
  const levelOf = new Map(graph.nodes.map((n) => [n.id, n.level]));
  const positions: Record<string, Position> = {};
  let leaves = 0;

  function place(id: string): number {
    const kids = children.get(id) ?? [];
    const y = kids.length === 0 ? leaves++ * ROW_GAP : kids.map(place).reduce((a, b) => a + b, 0) / kids.length;
    positions[id] = { x: (levelOf.get(id) ?? 0) * COLUMN_GAP, y };
    return y;
  }

  const root = graph.nodes.find((n) => n.level === 0);
  if (root) place(root.id);
  return { positions, leaves: Math.max(leaves, 1) };
}

/** Alto del lienzo según el número de hojas, entre 320 y 1000 px (27 hojas caben enteras con zoom ≥ 0.75). */
export function treeHeight(graph: Graph): number {
  return Math.min(1000, Math.max(320, treeLayout(graph).leaves * ROW_GAP + 60));
}

export default function BfsTree({ graph }: { graph: Graph }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => {
    let cy: Core | undefined;
    let cancelled = false;
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const parentEdge = new Map(graph.edges.map((e) => [e.target, e]));
    const root = graph.nodes.find((n) => n.level === 0);

    // Cytoscape usa `window`: se importa solo en el navegador, después de montar.
    import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled || !containerRef.current) return;

      cy = cytoscape({
        container: containerRef.current,
        elements: toElements(graph),
        minZoom: 0.2,
        maxZoom: 2.5,
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(color)",
              label: "data(label)",
              color: "data(textColor)",
              "font-size": 10,
              "text-valign": "center",
              "text-halign": "center",
            },
          },
          { selector: "node.user", style: { shape: "ellipse", width: 40, height: 40, "font-weight": "bold" } },
          {
            selector: "node.movie",
            style: {
              shape: "round-rectangle",
              width: 150,
              height: 34,
              "text-wrap": "ellipsis",
              "text-max-width": "140px",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "line-color": "#6b6b6b",
              "target-arrow-color": "#6b6b6b",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
            },
          },
          { selector: ".faded", style: { opacity: 0.2 } },
          { selector: "node:selected", style: { "border-width": 3, "border-color": "#ffffff" } },
        ],
      });

      const { positions } = treeLayout(graph);
      cy.layout({ name: "preset", positions, fit: true, padding: 30 }).run();
      // Con muchas ramas el encuadre aleja demasiado: se fija un zoom legible y se centra en el usuario origen.
      if (cy.zoom() < 0.75 && root) {
        cy.zoom(0.75);
        const r = cy.getElementById(root.id).renderedPosition();
        cy.panBy({ x: 60 - r.x, y: (cy.height() / 2) - r.y });
      }

      cy.on("tap", "node", (evt) => {
        const id: string = evt.target.id();
        const node = byId.get(id);
        if (!node) return;
        // Resalta el camino desde el origen hasta el nodo elegido.
        cy?.elements().addClass("faded");
        evt.target.predecessors().union(evt.target).removeClass("faded");
        const edge = parentEdge.get(id);
        setSelected({
          node,
          parentLabel: edge ? (byId.get(edge.source)?.label ?? null) : null,
          rating: edge?.rating ?? null,
        });
      });
      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          cy?.elements().removeClass("faded");
          setSelected(null);
        }
      });
    });

    return () => {
      cancelled = true;
      cy?.destroy();
    };
  }, [graph]);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2 text-xs" aria-label="Leyenda">
        {LEVELS.map((l) => (
          <li key={l.label} className="flex items-center gap-2 rounded bg-surface px-2 py-1">
            <span className="size-3 rounded-full" style={{ background: l.color }} />
            {l.label}
          </li>
        ))}
      </ul>
      <div
        ref={containerRef}
        style={{ height: treeHeight(graph) }}
        className="w-full rounded-md bg-surface"
        aria-label="Árbol BFS"
      />
      <div className="min-h-6 text-sm text-muted">
        {selected ? (
          <SelectionInfo {...selected} />
        ) : (
          "Haz clic en un nodo para ver el camino que siguió el BFS hasta él. Arrastra para moverte y usa la rueda para hacer zoom."
        )}
      </div>
    </div>
  );
}

function SelectionInfo({ node, parentLabel, rating }: Selected) {
  const via =
    parentLabel && rating !== null ? (
      <>
        {" "}
        · alcanzado desde <span className="text-foreground">{parentLabel}</span> (rating {rating.toFixed(1)})
      </>
    ) : null;

  return (
    <>
      <span className="font-semibold text-foreground">{node.label}</span> · nivel {node.level}
      {via}
      {node.kind === "user" && node.level > 0 && (
        <>
          {" "}
          ·{" "}
          <Link href={`/users/${node.ref}`} className="text-brand hover:underline">
            ver su perfil
          </Link>
        </>
      )}
    </>
  );
}

export function BfsTreeSkeleton() {
  return <div className="h-[520px] w-full animate-pulse rounded-md bg-surface" />;
}