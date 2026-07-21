export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export function actionFailure(message: string): ActionResult<never> {
  return { ok: false, message };
}
