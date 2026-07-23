"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import type { RecipeIngredient, RecipeStep } from "@/types/domain";
import { localStorageKey } from "@/features/settings/local-data";

export type CookingTimerStatus = "idle" | "running" | "paused" | "complete";

export interface CookingTimer {
  stepId: string;
  stepNumber: number;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: number | null;
  status: CookingTimerStatus;
}

interface CookingSessionState {
  currentStepIndex: number;
  checkedIngredientIds: string[];
  timers: CookingTimer[];
}

type CookingSessionAction =
  | { type: "hydrate"; state: CookingSessionState }
  | { type: "select-step"; index: number }
  | { type: "toggle-ingredient"; id: string; checked: boolean }
  | { type: "start-timer"; stepId: string; now: number }
  | { type: "pause-timer"; stepId: string; now: number }
  | { type: "reset-timer"; stepId: string }
  | { type: "tick"; now: number }
  | { type: "finish" };

interface PersistedCookingSession {
  version: 1;
  currentStepIndex: number;
  checkedIngredientIds: string[];
  timers: CookingTimer[];
}

const SESSION_VERSION = 1;

function createTimers(steps: readonly RecipeStep[]): CookingTimer[] {
  return steps.flatMap((step, index) => {
    if (!step.timerSeconds || step.timerSeconds <= 0) return [];
    return [
      {
        stepId: step.id,
        stepNumber: index + 1,
        label: `Step ${index + 1}`,
        durationSeconds: step.timerSeconds,
        remainingSeconds: step.timerSeconds,
        endsAt: null,
        status: "idle" as const,
      },
    ];
  });
}

function initialState(steps: readonly RecipeStep[]): CookingSessionState {
  return {
    currentStepIndex: 0,
    checkedIngredientIds: [],
    timers: createTimers(steps),
  };
}

function remainingAt(timer: CookingTimer, now: number): number {
  if (timer.status !== "running" || timer.endsAt == null) {
    return timer.remainingSeconds;
  }
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1_000));
}

function timerWithTick(timer: CookingTimer, now: number): CookingTimer {
  if (timer.status !== "running") return timer;
  const remainingSeconds = remainingAt(timer, now);
  if (remainingSeconds === timer.remainingSeconds) return timer;
  if (remainingSeconds === 0) {
    return { ...timer, remainingSeconds: 0, endsAt: null, status: "complete" };
  }
  return { ...timer, remainingSeconds };
}

function sessionReducer(
  state: CookingSessionState,
  action: CookingSessionAction,
): CookingSessionState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "select-step":
      return { ...state, currentStepIndex: action.index };
    case "toggle-ingredient": {
      const checked = new Set(state.checkedIngredientIds);
      if (action.checked) checked.add(action.id);
      else checked.delete(action.id);
      return { ...state, checkedIngredientIds: [...checked] };
    }
    case "start-timer":
      return {
        ...state,
        timers: state.timers.map((timer) => {
          if (timer.stepId !== action.stepId) return timer;
          const remainingSeconds =
            timer.status === "idle" || timer.status === "complete"
              ? timer.durationSeconds
              : timer.remainingSeconds;
          return {
            ...timer,
            remainingSeconds,
            endsAt: action.now + remainingSeconds * 1_000,
            status: "running",
          };
        }),
      };
    case "pause-timer":
      return {
        ...state,
        timers: state.timers.map((timer) => {
          if (timer.stepId !== action.stepId || timer.status !== "running")
            return timer;
          const remainingSeconds = remainingAt(timer, action.now);
          return {
            ...timer,
            remainingSeconds,
            endsAt: null,
            status: remainingSeconds === 0 ? "complete" : "paused",
          };
        }),
      };
    case "reset-timer":
      return {
        ...state,
        timers: state.timers.map((timer) =>
          timer.stepId === action.stepId
            ? {
                ...timer,
                remainingSeconds: timer.durationSeconds,
                endsAt: null,
                status: "idle",
              }
            : timer,
        ),
      };
    case "tick": {
      let changed = false;
      const timers = state.timers.map((timer) => {
        const next = timerWithTick(timer, action.now);
        if (next !== timer) changed = true;
        return next;
      });
      return changed ? { ...state, timers } : state;
    }
    case "finish":
      return {
        ...state,
        checkedIngredientIds: [],
        timers: state.timers.map((timer) => ({
          ...timer,
          remainingSeconds: timer.durationSeconds,
          endsAt: null,
          status: "idle",
        })),
      };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTimerStatus(value: unknown): value is CookingTimerStatus {
  return (
    value === "idle" ||
    value === "running" ||
    value === "paused" ||
    value === "complete"
  );
}

function restoreSession(
  rawValue: string,
  ingredients: readonly RecipeIngredient[],
  steps: readonly RecipeStep[],
): CookingSessionState | null {
  let value: unknown;
  try {
    value = JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(value) || value.version !== SESSION_VERSION) return null;

  const defaults = initialState(steps);
  const validIngredientIds = new Set(
    ingredients.map((ingredient) => ingredient.id),
  );
  const checkedIngredientIds = Array.isArray(value.checkedIngredientIds)
    ? value.checkedIngredientIds.filter(
        (id): id is string =>
          typeof id === "string" && validIngredientIds.has(id),
      )
    : [];
  const requestedStep =
    typeof value.currentStepIndex === "number" &&
    Number.isInteger(value.currentStepIndex)
      ? value.currentStepIndex
      : 0;
  const currentStepIndex = Math.min(
    Math.max(0, requestedStep),
    Math.max(0, steps.length - 1),
  );
  const persistedTimers = Array.isArray(value.timers) ? value.timers : [];
  const now = Date.now();

  const timers = defaults.timers.map((timer) => {
    const rawTimer = persistedTimers.find(
      (candidate) => isRecord(candidate) && candidate.stepId === timer.stepId,
    );
    if (!isRecord(rawTimer) || !isTimerStatus(rawTimer.status)) return timer;

    const remainingSeconds =
      typeof rawTimer.remainingSeconds === "number" &&
      Number.isFinite(rawTimer.remainingSeconds)
        ? Math.min(
            timer.durationSeconds,
            Math.max(0, Math.ceil(rawTimer.remainingSeconds)),
          )
        : timer.durationSeconds;
    const endsAt =
      typeof rawTimer.endsAt === "number" && Number.isFinite(rawTimer.endsAt)
        ? rawTimer.endsAt
        : null;

    if (rawTimer.status === "running" && endsAt != null) {
      const restoredRemaining = Math.min(
        timer.durationSeconds,
        Math.max(0, Math.ceil((endsAt - now) / 1_000)),
      );
      return restoredRemaining === 0
        ? { ...timer, remainingSeconds: 0, status: "complete" as const }
        : {
            ...timer,
            remainingSeconds: restoredRemaining,
            endsAt,
            status: "running" as const,
          };
    }

    if (rawTimer.status === "complete" || remainingSeconds === 0) {
      return { ...timer, remainingSeconds: 0, status: "complete" as const };
    }

    return {
      ...timer,
      remainingSeconds,
      endsAt: null,
      status:
        rawTimer.status === "paused" ? ("paused" as const) : ("idle" as const),
    };
  });

  return { currentStepIndex, checkedIngredientIds, timers };
}

export function useCookingSession(
  recipeId: string,
  ingredients: readonly RecipeIngredient[],
  steps: readonly RecipeStep[],
) {
  const [state, dispatch] = useReducer(sessionReducer, steps, initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const persistenceEnabledRef = useRef(true);
  const storageKey = useMemo(
    () => localStorageKey(`cooking-session:v1:${recipeId}`),
    [recipeId],
  );

  useEffect(() => {
    persistenceEnabledRef.current = true;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const restored = restoreSession(saved, ingredients, steps);
        if (restored) dispatch({ type: "hydrate", state: restored });
      }
    } catch {
      // Private browsing and strict storage policies may disable localStorage.
    } finally {
      setIsHydrated(true);
    }
  }, [ingredients, steps, storageKey]);

  useEffect(() => {
    if (!isHydrated || !persistenceEnabledRef.current) return;
    const persisted: PersistedCookingSession = {
      version: SESSION_VERSION,
      ...state,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(persisted));
    } catch {
      // Cooking remains fully usable when persistent browser storage is unavailable.
    }
  }, [isHydrated, state, storageKey]);

  const hasRunningTimer = state.timers.some(
    (timer) => timer.status === "running",
  );
  useEffect(() => {
    if (!hasRunningTimer) return;
    const interval = window.setInterval(() => {
      dispatch({ type: "tick", now: Date.now() });
    }, 500);
    return () => window.clearInterval(interval);
  }, [hasRunningTimer]);

  const selectStep = useCallback(
    (index: number) => {
      const safeIndex = Math.min(
        Math.max(0, index),
        Math.max(0, steps.length - 1),
      );
      dispatch({ type: "select-step", index: safeIndex });
    },
    [steps.length],
  );

  const toggleIngredient = useCallback((id: string, checked: boolean) => {
    dispatch({ type: "toggle-ingredient", id, checked });
  }, []);

  const startTimer = useCallback((stepId: string) => {
    dispatch({ type: "start-timer", stepId, now: Date.now() });
  }, []);

  const pauseTimer = useCallback((stepId: string) => {
    dispatch({ type: "pause-timer", stepId, now: Date.now() });
  }, []);

  const resetTimer = useCallback((stepId: string) => {
    dispatch({ type: "reset-timer", stepId });
  }, []);

  const finishSession = useCallback(() => {
    persistenceEnabledRef.current = false;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing else is required when storage is unavailable.
    }
    dispatch({ type: "finish" });
  }, [storageKey]);

  return {
    ...state,
    isHydrated,
    selectStep,
    toggleIngredient,
    startTimer,
    pauseTimer,
    resetTimer,
    finishSession,
  };
}
