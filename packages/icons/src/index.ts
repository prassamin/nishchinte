export * from "lucide-react";
export * from "./social-icons";
import * as SocialIcons from "./social-icons";

/**
 * Map of all social and brand icons keyed by their canonical component names.
 */
export const socialIcons = SocialIcons;

/**
 * Type of canonical social icon names.
 */
export type SocialIconComponentName = keyof typeof SocialIcons;

/**
 * Autocomplete-friendly social and brand icon name type.
 * Derived automatically from the exported socialIcons map without hardcoded union declarations.
 */
export type SocialIconName = SocialIconComponentName | (string & {});

/**
 * Retrieves a social or brand icon component by its name (case-insensitive with symbol normalization).
 *
 * @param name - The name of the icon (e.g. `"Twitter"`, `"facebook"`, `"instagram"`, `"github"`, `"BrandX"`).
 * @returns The Lucide icon component, or undefined if not found.
 *
 * @example
 * ```tsx
 * const Icon = getSocialIcon("Twitter");
 * if (Icon) return <Icon className="w-5 h-5" />;
 * ```
 */
export function getSocialIcon(
  name?: string | null,
): (typeof socialIcons)[SocialIconComponentName] | undefined {
  if (!name) return undefined;
  const direct = (socialIcons as Record<string, any>)[name];
  if (direct) return direct;

  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, icon] of Object.entries(socialIcons)) {
    if (key.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized) {
      return icon as (typeof socialIcons)[SocialIconComponentName];
    }
  }

  return undefined;
}
