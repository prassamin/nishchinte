/**
 * Generates a deterministic avatar seed from a user object or string.
 */
export const getAvatarSeed = (user: any): string => {
  if (!user) return "user";
  if (typeof user === "string") return user.trim() || "user";
  const name = user.name || user.fullName;
  const email = user.email;
  const id = user.id || user.customerId;
  const parts = [id, email, name].filter(Boolean).map(String);
  return parts.length > 0 ? parts.join("-") : "user";
};

/**
 * Synchronously generates an avatar placeholder URL based on user seed.
 */
export const getAvatarSync = (user: any, origin = ""): string => {
  const seed = getAvatarSeed(user);
  const baseOrigin =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  const cleanOrigin = baseOrigin.replace(/\/+$/, "");
  return `${cleanOrigin}/api/v1/avatar?seed=${encodeURIComponent(seed)}`;
};

/**
 * Asynchronously generates an avatar placeholder URL.
 */
export const getAvatar = async (user: any, origin = ""): Promise<string> => {
  return getAvatarSync(user, origin);
};
