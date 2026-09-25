import { NextResponse } from "next/server";

const ELEMENTS = 3;
const SIZE = 80;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const seed = searchParams.get("seed") ?? "guest";
  const size = Number(searchParams.get("size") ?? 120);

  const colors = generateColorPalette(seed, ELEMENTS);

  const svg = AvatarMarble({
    size,
    colors,
    name: seed,
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

/* ------------------ COLOR GENERATOR ------------------ */
function generateColorPalette(seed: string, count: number) {
  const base = hashCode(seed);
  const mode = base % 3; // variation mode

  return Array.from({ length: count }, (_, i) => {
    const hue = (base + i * 137.508) % 360;

    let saturation: number;
    let lightness: number;

    if (mode === 0) {
      // Neon 🔥
      saturation = 90;
      lightness = 55;
    } else if (mode === 1) {
      // Pastel 🌸
      saturation = 60;
      lightness = 75;
    } else {
      // Dark 🌑
      saturation = 70;
      lightness = 35;
    }

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  });
}

/* ------------------ AVATAR CORE ------------------ */
function generateColors(name: string, colors: string[]) {
  const numFromName = hashCode(name);
  const range = colors.length;

  return Array.from({ length: ELEMENTS }, (_, i) => ({
    color: getRandomColor(numFromName + i, colors, range),
    translateX: getUnit(numFromName * (i + 1), SIZE / 10, 1),
    translateY: getUnit(numFromName * (i + 1), SIZE / 10, 2),
    scale: 1.2 + getUnit(numFromName * (i + 1), SIZE / 20) / 10,
    rotate: getUnit(numFromName * (i + 1), 360, 1),
  }));
}

const AvatarMarble = ({
  name,
  colors,
  title,
  square,
  size,
}: {
  name: string;
  colors: string[];
  title?: string;
  square?: boolean;
  size?: number;
}) => {
  const properties = generateColors(name, colors);
  const maskID = crypto.randomUUID();

  return `<svg
    viewBox="0 0 ${SIZE} ${SIZE}"
    fill="none"
    role="img"
    xmlns="http://www.w3.org/2000/svg"
    width="${size}"
    height="${size}"
  >
    ${title ? `<title>${name}</title>` : ""}

    <mask id="${maskID}" maskUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}">
      <rect
        width="${SIZE}"
        height="${SIZE}"
        rx="${square ? "" : SIZE * 2}"
        fill="#FFFFFF"
      />
    </mask>

    <g mask="url(#${maskID})">
      <rect width="${SIZE}" height="${SIZE}" fill="${properties[0].color}" />

      <path
        filter="url(#filter_${maskID})"
        d="M32.414 59.35L50.376 70.5H72.5v-71H33.728L26.5 13.381l19.057 27.08L32.414 59.35z"
        fill="${properties[1].color}"
        transform="translate(${properties[1].translateX} ${
          properties[1].translateY
        })
                   rotate(${properties[1].rotate} ${SIZE / 2} ${SIZE / 2})
                   scale(${properties[1].scale})"
      />

      <path
        filter="url(#filter_${maskID})"
        style="mix-blend-mode: overlay"
        d="M22.216 24L0 46.75l14.108 38.129L78 86l-3.081-59.276-22.378 4.005
           12.972 20.186-23.35 27.395L22.215 24z"
        fill="${properties[2].color}"
        transform="translate(${properties[2].translateX} ${
          properties[2].translateY
        })
        rotate(${properties[2].rotate} ${SIZE / 2} ${SIZE / 2})
        scale(${properties[2].scale})"
      />
    </g>

    <defs>
      <filter
        id="filter_${maskID}"
        filterUnits="userSpaceOnUse"
        color-interpolation-filters="sRGB"
      >
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
        <feGaussianBlur stdDeviation="7" result="effect1_foregroundBlur" />
      </filter>
    </defs>
  </svg>`;
};

/* ------------------ HELPERS ------------------ */
const hashCode = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
};

const getDigit = (number: number, ntn: number): number => {
  return Math.floor((number / Math.pow(10, ntn)) % 10);
};

const getUnit = (number: number, range: number, index?: number): number => {
  const value = number % range;
  if (index && getDigit(number, index) % 2 === 0) return -value;
  return value;
};

const getRandomColor = (
  number: number,
  colors: string[],
  range: number,
): string => {
  return colors[number % range];
};
