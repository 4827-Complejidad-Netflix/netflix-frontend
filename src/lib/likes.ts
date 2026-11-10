// Los "me gusta" viven en una cookie para que los lean tanto el navegador (botón ♥) como el servidor
// (página /recommendations, que llama a la API). No hay cuentas: el perfil es del navegador.

export const LIKES_COOKIE = "liked";
/** El backend acepta hasta 200 películas por perfil. */
export const MAX_LIKES = 200;

/** IDs en el orden en que se dieron, sin duplicados ni valores inválidos. */
export function parseLikes(raw: string | undefined): number[] {
  if (!raw) return [];
  const ids = decodeURIComponent(raw)
    .split(".")
    .filter((part) => /^\d+$/.test(part))
    .map(Number);
  return [...new Set(ids)].slice(-MAX_LIKES);
}

export function serializeLikes(ids: number[]): string {
  return ids.slice(-MAX_LIKES).join(".");
}
