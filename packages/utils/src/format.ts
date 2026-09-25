/**
 * Converts a byte count number into a human-readable file size string.
 *
 * @param bytes - Size in bytes (e.g. 5242880).
 * @param decimals - Number of decimal places to preserve (default: 2).
 * @returns Human-readable size string (e.g. "5 MB", "1.25 GB", "500 KB").
 *
 * @example
 * ```typescript
 * toHumanSize(0); // "0 B"
 * toHumanSize(1024); // "1 KB"
 * toHumanSize(5242880); // "5 MB"
 * toHumanSize(1073741824); // "1 GB"
 * ```
 */
export function toHumanSize(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const clampedIndex = Math.min(i, sizes.length - 1);
  const value = parseFloat((bytes / Math.pow(k, clampedIndex)).toFixed(dm));

  return `${value} ${sizes[clampedIndex]}`;
}

/**
 * Truncates a string to a maximum length and appends a suffix (default: "...").
 *
 * @param str - The string to truncate.
 * @param maxLength - Maximum allowed length.
 * @param suffix - Suffix to append when truncated (default: "...").
 * @returns Truncated string with suffix if exceeding maxLength.
 *
 * @example
 * ```typescript
 * truncateText("Hello world", 8); // "Hello..."
 * truncateText("Hello world", 20); // "Hello world"
 * ```
 */
export function truncateText(
  str: string,
  maxLength: number,
  suffix: string = "...",
): string {
  if (!str || str.length <= maxLength) return str || "";
  const cutLength = Math.max(0, maxLength - suffix.length);
  return str.substring(0, cutLength) + suffix;
}

export interface MarkdownToPlainOptions {
  /** Whether to strip bullet/ordered list markers (default: true) */
  stripListLeaders?: boolean;
  /** Custom unicode character to replace list markers with (default: false) */
  listUnicodeChar?: string | boolean;
  /** Whether to apply GitHub Flavored Markdown rules (default: true) */
  gfm?: boolean;
  /** Whether to replace images with their alt text (default: true) */
  useImgAltText?: boolean;
  /** Whether to format links as "text (url)" instead of just "text" (default: false) */
  preserveLinks?: boolean;
  /** Whether to decode HTML entities like &amp;, &lt;, &gt;, &quot;, &#39; (default: true) */
  decodeHtmlEntities?: boolean;
}

/**
 * Strips Markdown and HTML formatting from a string to produce clean plain text.
 *
 * @param markdown - Markdown / HTML formatted string.
 * @param options - Customization options.
 * @returns Clean plain text.
 *
 * @example
 * ```typescript
 * markdownToPlain("# Hello **World** [link](https://example.com)");
 * // => "Hello World link"
 * ```
 */
export function markdownToPlain(
  markdown: string,
  options: MarkdownToPlainOptions = {},
): string {
  if (typeof markdown !== "string") return "";

  const {
    stripListLeaders = true,
    listUnicodeChar = false,
    gfm = true,
    useImgAltText = true,
    preserveLinks = false,
    decodeHtmlEntities = true,
  } = options;

  let output = markdown;

  // Remove horizontal rules (---, ***, ___)
  output = output.replace(/^(-\s*?|\*\s*?|_\s*?){3,}\s*$/gm, "");

  try {
    if (gfm) {
      // Fenced codeblocks (```ts ... ``` or ~~~ ... ~~~)
      output = output
        .replace(/`{3,}[^\n]*\n([\s\S]*?)\n?`{3,}/g, "$1")
        .replace(/~{3,}[^\n]*\n([\s\S]*?)\n?~{3,}/g, "$1")
        .replace(/`{3,}[^\n]*/g, "")
        .replace(/~{3,}[^\n]*/g, "")
        // Header underlines (=== or ---)
        .replace(/\n={2,}/g, "\n")
        // Strikethrough (~~text~~)
        .replace(/~~(.*?)~~/g, "$1")
        .replace(/~~/g, "");

      // Table formatting (remove |---|---| separator rows)
      output = output.replace(/^\s*\|?[-:| ]+\|?\s*$/gm, "");
    }

    if (stripListLeaders) {
      if (listUnicodeChar) {
        output = output.replace(
          /^([\s\t]*)(?:[\*\-\+]|\d+\.)(?:\s+\[[ xX]\])?\s+/gm,
          `${listUnicodeChar} $1`,
        );
      } else {
        output = output.replace(
          /^([\s\t]*)(?:[\*\-\+]|\d+\.)(?:\s+\[[ xX]\])?\s+/gm,
          "$1",
        );
      }
    }

    // Images must be processed BEFORE links so ![alt](url) doesn't get captured as [alt](url)
    output = output.replace(
      /!\[(.*?)\](?:\([^\)]*\)|\[[^\]]*\])/g,
      useImgAltText ? "$1" : "",
    );

    if (preserveLinks) {
      // Preserve inline link text and URL: [text](url) -> "text (url)"
      output = output.replace(
        /\[(.*?)\](?:\(([^\)]*)\)|\[([^\]]*)\])/g,
        (_match, text, parenUrl, bracketUrl) =>
          `${text} (${parenUrl || bracketUrl || ""})`,
      );
    } else {
      // Inline links: [text](url) -> "text"
      output = output.replace(/\[(.*?)\](?:\([^\)]*\)|\[[^\]]*\])/g, "$1");
    }

    // Protect escaped markdown characters (\*, \_, \[, \], \`, \\)
    const ESCAPED_MAP: Record<string, string> = {
      "\\\\": "\uE000",
      "\\*": "\uE001",
      "\\_": "\uE002",
      "\\[": "\uE003",
      "\\]": "\uE004",
      "\\`": "\uE005",
      "\\#": "\uE006",
      "\\~": "\uE007",
    };
    for (const [k, v] of Object.entries(ESCAPED_MAP)) {
      output = output.split(k).join(v);
    }

    output = output
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove setext-style headers (=== or ---)
      .replace(/^[=\-]{2,}\s*$/gm, "")
      // Remove footnotes
      .replace(/\[\^.+?\](?:\:\s*.*?)?$/gm, "")
      .replace(/\[\^.+?\]/g, "")
      // Remove blockquotes
      .replace(/^\s{0,3}>\s?/gm, "")
      // Remove reference-style links definition [ref]: https://example.com
      .replace(/^\s{0,2}\[(.*?)\]:\s*\S+(?:\s*".*?")?\s*$/gm, "")
      // Remove atx-style headers (# Heading)
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold / italic / bold-italic (***text***, **text**, *text*, ___text___, __text__, _text_)
      .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
      .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
      // Remove inline code (`code`)
      .replace(/`([^`]+)`/g, "$1");

    // Restore escaped characters
    const UNESCAPE_MAP: Record<string, string> = {
      "\uE000": "\\",
      "\uE001": "*",
      "\uE002": "_",
      "\uE003": "[",
      "\uE004": "]",
      "\uE005": "`",
      "\uE006": "#",
      "\uE007": "~",
    };
    for (const [k, v] of Object.entries(UNESCAPE_MAP)) {
      output = output.split(k).join(v);
    }

    // Clean up any other escaped characters
    output = output.replace(/\\([\\`*{}\[\]()#+.!_>~|-])/g, "$1");

    if (decodeHtmlEntities) {
      output = output
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ");
    }

    // Replace 3 or more consecutive newlines with 2 newlines
    output = output.replace(/\n{3,}/g, "\n\n").trim();
  } catch (e) {
    console.error(e);
    return markdown;
  }

  return output;
}
