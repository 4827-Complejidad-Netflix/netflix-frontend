"use client";

import { useSyncExternalStore } from "react";
import { LIKES_COOKIE, parseLikes, serializeLikes } from "@/lib/likes";

const ONE_YEAR = 60 * 60 * 24 * 365;
const EMPTY: number[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | undefined;
let cachedIds: number[] = EMPTY;

function readCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LIKES_COOKIE}=`))
    ?.slice(LIKES_COOKIE.length + 1);
}

// useSyncExternalStore exige la misma referencia mientras la cookie no cambie.
function getSnapshot(): number[] {
  const raw = readCookie();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseLikes(raw);
  }
  return cachedIds;
}

// En el servidor no se conocen los likes: los botones se pintan vacíos y se actualizan al hidratar.
function getServerSnapshot(): number[] {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Otra pestaña puede cambiar la cookie: se vuelve a leer al volver a esta.
  window.addEventListener("focus", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("focus", listener);
  };
}

export function setLikes(ids: number[]) {
  const value = serializeLikes(ids);
  document.cookie = value
    ? `${LIKES_COOKIE}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`
    : `${LIKES_COOKIE}=; path=/; max-age=0; samesite=lax`;
  listeners.forEach((l) => l());
}

export function toggleLike(id: number) {
  const ids = getSnapshot();
  setLikes(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
}

export function useLikes(): number[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
