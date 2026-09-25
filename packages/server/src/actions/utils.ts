/**
 * Safely revalidates a Next.js path if in Next.js runtime.
 */
export async function safeRevalidate(path: string): Promise<void> {
  try {
    // @ts-ignore
    const { revalidatePath } = await import("next/cache");
    revalidatePath(path);
  } catch {
    // Non-Next.js runtime fallback
  }
}