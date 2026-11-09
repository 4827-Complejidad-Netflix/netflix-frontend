"use client";

import type { Core, EdgeSingular, ElementDefinition } from "cytoscape";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Graph } from "@/lib/api";
import { communityColor } from "@/lib/communities";

interface Selected {
  ref: number;
  community: number;
  degree: number;
}

function toElements(graph: Graph): ElementDefinition[] {
  const nodes: ElementDefinition[] = graph.nodes.map((n) => ({
    data: { id: n.id, ref: n.ref, community: n.level, label: `U${n.ref}`, color: communityColor(n.level) },
  }));
  const edges: ElementDefinition[] = graph.edges.map((e) => ({
    data: { id: `${e.source}__${e.target}`, source: e.source, target: e.target, weight: e.weight ?? 0 },
  }));
  return [...nodes, ...edges];
}

export default function CommunityGraph({ graph }: { graph: Graph }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

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
              color: "#e8eaf4",
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
              "line-color": "#3d4566",
              opacity: 0.55,
              "curve-style": "haystack",
            },
          },
          { selector: ".faded", style: { opacity: 0.12 } },
          { selector: "node:selected", style: { "border-width": 3, "border-color": "#ffffff" } },
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

      cy.on("tap", "node", (evt) => {
        const node = evt.target;
        cy?.elements().addClass("faded");
        node.closedNeighborhood().removeClass("faded");
        setSelected({ ref: node.data("ref"), community: node.data("community"), degree: node.degree(false) });
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
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="h-[520px] w-full rounded-xl border border-border bg-surface" aria-label="Grafo de comunidades" />
      <div className="min-h-6 text-sm text-muted">
        {selected ? (
          <>
            <span className="font-semibold text-foreground">Usuario {selected.ref}</span> ·{" "}
            {selected.community < 0 ? "sin comunidad" : `comunidad ${selected.community + 1}`} · {selected.degree}{" "}
            {selected.degree === 1 ? "conexión" : "conexiones"} ·{" "}
            <Link href={`/users/${selected.ref}`} className="text-accent hover:underline">
              ver sus recomendaciones
            </Link>
          </>
        ) : (
          "Haz clic en un usuario para resaltar sus conexiones. Arrastra para mover y usa la rueda para hacer zoom."
        )}
      </div>
    </div>
  );
}

export function CommunityGraphSkeleton() {
  return <div className="h-[520px] w-full animate-pulse rounded-md bg-surface" />;
}