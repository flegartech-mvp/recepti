import type { CookingTimer } from "./use-cooking-session";

export function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const remainder = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function timerStatusText(timer: CookingTimer): string {
  if (timer.status === "complete") return "Finished";
  if (timer.status === "paused") return "Paused";
  if (timer.status === "running") return "Running";
  return "Ready";
}
