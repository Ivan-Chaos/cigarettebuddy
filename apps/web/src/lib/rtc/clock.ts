/** ISO timestamp for chat entries. Lives outside the runes file so the
 * `svelte/prefer-svelte-reactivity` rule does not mistake it for state. */
export function nowIso(): string {
  return new Date().toISOString();
}
