/**
 * A name that must be unique (per owner for Categories, Items, Modules, and
 * Bags; globally for usernames) is already taken. Carries a message meant
 * for the user, unlike a raw database error.
 */
export class DuplicateNameError extends Error {}

/** What a form's server action returns: nothing on success, or a message to show. */
export type ActionResult = { error: string } | undefined | void;

/**
 * Runs a create/update and turns a unique-constraint violation (Prisma
 * P2002) into a DuplicateNameError with `message`. Catching the violation
 * itself, rather than checking for the name first, also covers two
 * submissions racing each other.
 */
export async function uniqueName<T>(operation: Promise<T>, message: string): Promise<T> {
  try {
    return await operation;
  } catch (e) {
    if ((e as { code?: unknown })?.code === "P2002") throw new DuplicateNameError(message);
    throw e;
  }
}

/** For server actions: a DuplicateNameError becomes `{ error }` for the form; anything else rethrows. */
export function duplicateNameResult(e: unknown): ActionResult {
  if (e instanceof DuplicateNameError) return { error: e.message };
  throw e;
}
