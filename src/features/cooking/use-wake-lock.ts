"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WakeLockStatus =
  "requesting" | "active" | "released" | "unsupported" | "blocked";

export function useWakeLock() {
  const [status, setStatus] = useState<WakeLockStatus>("requesting");
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const mountedRef = useRef(false);

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) {
      if (mountedRef.current) setStatus("unsupported");
      return;
    }

    if (document.visibilityState !== "visible") return;
    if (sentinelRef.current) return;

    setStatus("requesting");
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      if (!mountedRef.current) {
        await sentinel.release();
        return;
      }
      sentinelRef.current = sentinel;
      setStatus("active");
      sentinel.addEventListener(
        "release",
        () => {
          if (!mountedRef.current || sentinelRef.current !== sentinel) return;
          sentinelRef.current = null;
          setStatus("released");
        },
        { once: true },
      );
    } catch {
      if (mountedRef.current) setStatus("blocked");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const initialRequest = window.setTimeout(() => void requestWakeLock(), 0);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialRequest);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) void sentinel.release();
    };
  }, [requestWakeLock]);

  return { status, requestWakeLock };
}
