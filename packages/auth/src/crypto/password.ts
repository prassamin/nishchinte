import bcrypt from "bcryptjs";

export const DEFAULT_SALT_ROUNDS = 10;

/**
 * Hashes a plain text password using bcryptjs.
 */
export async function hashPassword(
  password: string,
  saltRounds: number = DEFAULT_SALT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compares a plain text password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("Error verifying password hash:", error);
    return false;
  }
}
