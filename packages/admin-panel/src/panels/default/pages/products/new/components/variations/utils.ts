import { ProductOption } from "../../types";

export const PREDEFINED_OPTIONS = ["Size", "Color"];

export const PREDEFINED_COLORS = [
  { name: "Amber", hex: "#FFBF00" },
  { name: "Amethyst", hex: "#9966CC" },
  { name: "Antique White", hex: "#FAEBD7" },
  { name: "Aqua", hex: "#00FFFF" },
  { name: "Aquamarine", hex: "#7FFFD4" },
  { name: "Ash", hex: "#B2BEB5" },
  { name: "Azure", hex: "#007FFF" },
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Black", hex: "#000000" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Bronze", hex: "#CD7F32" },
  { name: "Brown", hex: "#A52A2A" },
  { name: "Burgundy", hex: "#800020" },
  { name: "Camel", hex: "#C19A6B" },
  { name: "Caramel", hex: "#FFD59A" },
  { name: "Charcoal", hex: "#36454F" },
  { name: "Cherry", hex: "#DE3163" },
  { name: "Chestnut", hex: "#954535" },
  { name: "Chocolate", hex: "#D2691E" },
  { name: "Clear", hex: "#FFFFFF" },
  { name: "Cobalt", hex: "#0047AB" },
  { name: "Copper", hex: "#B87333" },
  { name: "Coral", hex: "#FF7F50" },
  { name: "Cream", hex: "#FFFDD0" },
  { name: "Crimson", hex: "#DC143C" },
  { name: "Cyan", hex: "#00FFFF" },
  { name: "Emerald", hex: "#50C878" },
  { name: "Forest Green", hex: "#228B22" },
  { name: "Fuchsia", hex: "#FF00FF" },
  { name: "Gold", hex: "#FFD700" },
  { name: "Gray", hex: "#808080" },
  { name: "Green", hex: "#008000" },
  { name: "Hot Pink", hex: "#FF69B4" },
  { name: "Indigo", hex: "#4B0082" },
  { name: "Ivory", hex: "#FFFFF0" },
  { name: "Jade", hex: "#00A86B" },
  { name: "Khaki", hex: "#C3B091" },
  { name: "Lavender", hex: "#E6E6FA" },
  { name: "Lemon", hex: "#FFF700" },
  { name: "Lilac", hex: "#C8A2C8" },
  { name: "Lime", hex: "#00FF00" },
  { name: "Magenta", hex: "#FF00FF" },
  { name: "Maroon", hex: "#800000" },
  { name: "Mauve", hex: "#E0B0FF" },
  { name: "Midnight Blue", hex: "#191970" },
  { name: "Mint", hex: "#3EB489" },
  { name: "Mocha", hex: "#492000" },
  { name: "Mustard", hex: "#FFDB58" },
  { name: "Navy", hex: "#000080" },
  { name: "Olive", hex: "#808000" },
  { name: "Orange", hex: "#FFA500" },
  { name: "Orchid", hex: "#DA70D6" },
  { name: "Peach", hex: "#FFE5B4" },
  { name: "Pearl", hex: "#EAE0C8" },
  { name: "Periwinkle", hex: "#CCCCFF" },
  { name: "Pink", hex: "#FFC0CB" },
  { name: "Plum", hex: "#DDA0DD" },
  { name: "Purple", hex: "#800080" },
  { name: "Red", hex: "#FF0000" },
  { name: "Rose", hex: "#FF007F" },
  { name: "Rose Gold", hex: "#B76E79" },
  { name: "Royal Blue", hex: "#4169E1" },
  { name: "Ruby", hex: "#E0115F" },
  { name: "Rust", hex: "#B7410E" },
  { name: "Salmon", hex: "#FA8072" },
  { name: "Sapphire", hex: "#0F52BA" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Sky Blue", hex: "#87CEEB" },
  { name: "Slate", hex: "#708090" },
  { name: "Tan", hex: "#D2B48C" },
  { name: "Teal", hex: "#008080" },
  { name: "Tomato", hex: "#FF6347" },
  { name: "Turquoise", hex: "#40E0D0" },
  { name: "Violet", hex: "#EE82EE" },
  { name: "Wheat", hex: "#F5DEB3" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Wine", hex: "#722F37" },
  { name: "Yellow", hex: "#FFFF00" },
];

export const PREDEFINED_VALUES: Record<
  string,
  { name: string; hex?: string }[]
> = {
  Color: PREDEFINED_COLORS,
  Size: [
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "3XL",
    "4XL",
    "Free Size",
  ].map((n) => ({ name: n })),
};

export function generateVariants(
  options: ProductOption[],
): Record<string, string>[] {
  const validOptions = options.filter(
    (o) => o.name.trim() !== "" && o.values.length > 0,
  );
  if (validOptions.length === 0) return [];

  let combos: Record<string, string>[] = [{}];
  for (const option of validOptions) {
    const nextCombos: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of option.values) {
        nextCombos.push({ ...combo, [option.name.trim()]: value });
      }
    }
    combos = nextCombos;
  }
  return combos;
}
