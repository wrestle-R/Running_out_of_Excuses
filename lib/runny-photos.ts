"use client";

import { useEffect, useState } from "react";
import seed from "./runny-photo-seed.json";

export type RunnyPhoto = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  placement: string;
  year: number | null;
  month: number | null;
  position: number;
};

const fallback: RunnyPhoto[] = seed.map((photo) => ({ ...photo, id: photo.seedKey }));

// Keep the original photos if the database is temporarily unavailable. An empty
// successful response is authoritative, so removing the last photo stays removed.
export function useRunnyPhotos() {
  const [photos, setPhotos] = useState<RunnyPhoto[]>(fallback);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/photos", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json();
        if (active && Array.isArray(result.photos)) setPhotos(result.photos);
      } catch { /* Preserve the last successful view while offline. */ }
    }
    void load();
    const timer = window.setInterval(load, 30_000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);
  return photos;
}

export function photoDisplayUrl(url: string) {
  return url.replace("/image/upload/", "/image/upload/c_limit,w_900,q_auto,f_auto/");
}
