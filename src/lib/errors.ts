/**
 * An error whose message is meant for the user (a rule they can fix by
 * changing their input), as opposed to a bug or infrastructure failure.
 * Server actions return these to the form as `{ error }`.
 */
export class UserError extends Error {}

/**
 * A name that must be unique (per owner for Categories, Items, Modules,
 * Bags, and Tasks; globally for usernames) is already taken.
 */
export class DuplicateNameError extends UserError {}

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

/** For server actions: a UserError becomes `{ error }` for the form; anything else rethrows. */
export function userErrorResult(e: unknown): ActionResult {
  if (e instanceof UserError) return { error: e.message };
  throw e;
}
