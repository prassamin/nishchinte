const fs = require("fs");
const path = require("path");
const simpleIcons = require("simple-icons");

const iconsBySlug = new Map();
for (const val of Object.values(simpleIcons)) {
  if (val && val.slug) {
    iconsBySlug.set(val.slug, val);
  }
}

const tablerFilled = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../node_modules/.pnpm/@tabler+icons@3.48.0/node_modules/@tabler/icons/tabler-nodes-filled.json"
    ),
    "utf8"
  )
);
const tablerOutline = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../node_modules/.pnpm/@tabler+icons@3.48.0/node_modules/@tabler/icons/tabler-nodes-outline.json"
    ),
    "utf8"
  )
);

const iconDefinitions = [
  // Major Social Platforms
  { name: "Facebook", si: "facebook", desc: "Facebook social network icon." },
  { name: "Twitter", tabler: "brand-twitter", desc: "Twitter (classic bird) social platform icon." },
  { name: "BrandX", si: "x", desc: "X (formerly Twitter) brand icon." },
  { name: "Instagram", si: "instagram", desc: "Instagram photo and video sharing social icon." },
  { name: "Linkedin", tabler: "brand-linkedin", desc: "LinkedIn professional networking platform icon." },
  { name: "Threads", si: "threads", desc: "Threads social conversation platform icon." },
  { name: "Pinterest", si: "pinterest", desc: "Pinterest visual discovery and bookmarking icon." },
  { name: "TikTok", si: "tiktok", desc: "TikTok short-form video platform icon." },
  { name: "Snapchat", si: "snapchat", desc: "Snapchat multimedia messaging app icon." },
  { name: "Reddit", si: "reddit", desc: "Reddit community discussions and news rating icon." },
  { name: "Tumblr", si: "tumblr", desc: "Tumblr microblogging and social networking icon." },
  { name: "Mastodon", si: "mastodon", desc: "Mastodon decentralized social network icon." },
  { name: "Bluesky", si: "bluesky", desc: "Bluesky social networking platform icon." },
  { name: "Quora", si: "quora", desc: "Quora question-and-answer platform icon." },
  { name: "Medium", si: "medium", desc: "Medium online publishing platform icon." },
  { name: "Substack", si: "substack", desc: "Substack newsletter and blogging platform icon." },
  { name: "Discord", si: "discord", desc: "Discord voice, video and text communication service icon." },
  { name: "Disqus", si: "disqus", desc: "Disqus blog comment hosting service icon." },
  { name: "ProductHunt", si: "producthunt", desc: "Product Hunt product discovery platform icon." },
  { name: "Bilibili", si: "bilibili", desc: "Bilibili video sharing and streaming icon." },
  { name: "Weibo", tabler: "brand-weibo", desc: "Sina Weibo microblogging website icon." },
  { name: "VK", si: "vk", desc: "VK (VKontakte) social media service icon." },

  // Messaging & Chat
  { name: "WhatsApp", si: "whatsapp", desc: "WhatsApp instant messaging and calling application icon." },
  { name: "Telegram", si: "telegram", desc: "Telegram cloud-based mobile and desktop messaging service icon." },
  { name: "Messenger", si: "messenger", desc: "Meta Messenger instant messaging app icon." },
  { name: "WeChat", si: "wechat", desc: "WeChat multi-purpose messaging and social media app icon." },
  { name: "Line", si: "line", desc: "LINE instant communications application icon." },
  { name: "BrandSignal", si: "signal", desc: "Signal encrypted messaging and voice calling brand icon." },
  { name: "Viber", si: "viber", desc: "Viber cross-platform voice over IP and instant messaging software icon." },
  { name: "Slack", tabler: "brand-slack", desc: "Slack workspace team communication service icon." },
  { name: "Skype", tabler: "brand-skype", desc: "Skype telecommunications application icon." },
  { name: "Zoom", si: "zoom", desc: "Zoom video communications platform icon." },
  { name: "Teams", tabler: "brand-teams", desc: "Microsoft Teams workspace collaboration platform icon." },

  // Media, Video & Audio
  { name: "YouTube", si: "youtube", desc: "YouTube video sharing and streaming platform icon." },
  { name: "Twitch", si: "twitch", desc: "Twitch live video streaming service icon." },
  { name: "Vimeo", si: "vimeo", desc: "Vimeo video hosting, sharing, and services platform icon." },
  { name: "Spotify", si: "spotify", desc: "Spotify digital music and podcast streaming service icon." },
  { name: "ApplePodcasts", si: "applepodcasts", desc: "Apple Podcasts directory and audio streaming icon." },
  { name: "AppleMusic", si: "applemusic", desc: "Apple Music audio and music video streaming service icon." },
  { name: "SoundCloud", si: "soundcloud", desc: "SoundCloud online audio distribution and music sharing icon." },
  { name: "Kick", si: "kick", desc: "Kick live streaming service icon." },
  { name: "Dailymotion", si: "dailymotion", desc: "Dailymotion video-sharing technology platform icon." },
  { name: "Deezer", si: "deezer", desc: "Deezer French online music streaming service icon." },
  { name: "Bandcamp", si: "bandcamp", desc: "Bandcamp independent music community platform icon." },
  { name: "Netflix", si: "netflix", desc: "Netflix streaming service and media production icon." },
  { name: "Tidal", si: "tidal", desc: "TIDAL global music streaming and entertainment service icon." },

  // Developer & Design Ecosystems
  { name: "Github", si: "github", desc: "GitHub software development and version control platform icon." },
  { name: "GitLab", si: "gitlab", desc: "GitLab web-based DevOps lifecycle tool icon." },
  { name: "Bitbucket", si: "bitbucket", desc: "Bitbucket Git repository management solution icon." },
  { name: "Dribbble", si: "dribbble", desc: "Dribbble self-promotion and social networking platform for digital designers icon." },
  { name: "Behance", si: "behance", desc: "Behance showcase and discovery of creative work platform icon." },
  { name: "Figma", si: "figma", desc: "Figma collaborative web application for interface design icon." },
  { name: "StackOverflow", si: "stackoverflow", desc: "Stack Overflow question and answer website for programmers icon." },
  { name: "CodePen", tabler: "brand-codepen", desc: "CodePen online community for testing and showcasing HTML, CSS and JS code snippets icon." },
  { name: "CodeSandbox", si: "codesandbox", desc: "CodeSandbox cloud development platform icon." },
  { name: "Docker", si: "docker", desc: "Docker OS-level virtualization container platform icon." },
  { name: "Kubernetes", si: "kubernetes", desc: "Kubernetes container orchestration system icon." },
  { name: "Npm", si: "npm", desc: "npm package manager for JavaScript ecosystem icon." },
  { name: "Vercel", si: "vercel", desc: "Vercel frontend cloud deployment platform icon." },
  { name: "Netlify", si: "netlify", desc: "Netlify cloud hosting and serverless backend services icon." },
  { name: "Supabase", si: "supabase", desc: "Supabase open source Firebase alternative platform icon." },
  { name: "Prisma", si: "prisma", desc: "Prisma next-generation Node.js and TypeScript ORM icon." },
  { name: "Nextjs", tabler: "brand-nextjs", desc: "Next.js React framework for the Web icon." },
  { name: "React", si: "react", desc: "React user interface library icon." },
  { name: "Vue", tabler: "brand-vue", desc: "Vue.js progressive JavaScript framework icon." },
  { name: "Angular", si: "angular", desc: "Angular web application framework icon." },
  { name: "Svelte", si: "svelte", desc: "Svelte component framework icon." },
  { name: "Python", si: "python", desc: "Python programming language icon." },
  { name: "Rust", si: "rust", desc: "Rust systems programming language icon." },
  { name: "Go", si: "go", desc: "Go (Golang) open source programming language icon." },
  { name: "Nodejs", si: "nodedotjs", desc: "Node.js JavaScript runtime environment icon." },
  { name: "TypeScript", si: "typescript", desc: "TypeScript strongly typed programming language icon." },
  { name: "JavaScript", si: "javascript", desc: "JavaScript programming language icon." },

  // Big Tech & OS
  { name: "Google", si: "google", desc: "Google search and cloud ecosystem icon." },
  { name: "BrandApple", si: "apple", desc: "Apple hardware and software ecosystem brand icon." },
  { name: "Microsoft", tabler: "brand-windows", desc: "Microsoft software and cloud ecosystem icon." },
  { name: "Amazon", tabler: "brand-amazon", desc: "Amazon online retailer and cloud service icon." },
  { name: "Android", si: "android", desc: "Android mobile operating system icon." },
  { name: "Windows", tabler: "brand-windows", desc: "Microsoft Windows operating system icon." },
  { name: "Chrome", tabler: "brand-chrome", desc: "Google Chrome web browser icon." },
  { name: "Firefox", si: "firefox", desc: "Mozilla Firefox open source web browser icon." },
  { name: "Safari", si: "safari", desc: "Apple Safari web browser icon." },
  { name: "Edge", tabler: "brand-edge", desc: "Microsoft Edge web browser icon." },

  // Creator & Crowdfunding
  { name: "Patreon", si: "patreon", desc: "Patreon membership platform for creators icon." },
  { name: "BuyMeACoffee", si: "buymeacoffee", desc: "Buy Me a Coffee creator funding platform icon." },
  { name: "KoFi", si: "kofi", desc: "Ko-fi creator patronage and tip platform icon." },
  { name: "Kickstarter", si: "kickstarter", desc: "Kickstarter global crowdfunding platform icon." },

  // Payments & Commerce
  { name: "PayPal", si: "paypal", desc: "PayPal global online payments system icon." },
  { name: "Stripe", si: "stripe", desc: "Stripe financial infrastructure for the internet icon." },
  { name: "Visa", si: "visa", desc: "Visa international payment card network icon." },
  { name: "Mastercard", si: "mastercard", desc: "Mastercard payment card services icon." },
  { name: "AmericanExpress", si: "americanexpress", desc: "American Express payment card and financial services icon." },
  { name: "ApplePay", si: "applepay", desc: "Apple Pay mobile payment and digital wallet service icon." },
  { name: "GooglePay", si: "googlepay", desc: "Google Pay digital wallet and online payment system icon." },
  { name: "Alipay", si: "alipay", desc: "Alipay digital payment platform icon." },
  { name: "Shopify", si: "shopify", desc: "Shopify global commerce platform icon." },
  { name: "Ebay", si: "ebay", desc: "eBay online auction and e-commerce corporation icon." },
  { name: "Etsy", si: "etsy", desc: "Etsy handmade and vintage e-commerce marketplace icon." },
  { name: "Klarna", si: "klarna", desc: "Klarna buy now pay later payment service icon." }
];

let fileContent = `import { createLucideIcon } from "lucide-react";
import type { LucideIconNode } from "lucide-react";

type IconNode = LucideIconNode[];
`;

for (const item of iconDefinitions) {
  let node = null;
  const keyPrefix = item.name.toLowerCase();

  if (item.si && iconsBySlug.has(item.si)) {
    const siData = iconsBySlug.get(item.si);
    node = [
      [
        "path",
        {
          d: siData.path,
          fill: "currentColor",
          stroke: "none",
          key: `${keyPrefix}-path-1`,
        },
      ],
    ];
  } else if (item.tabler) {
    if (tablerFilled[item.tabler]) {
      node = tablerFilled[item.tabler].map((elem, idx) => [
        elem[0],
        {
          ...elem[1],
          fill: "currentColor",
          stroke: "none",
          key: `${keyPrefix}-${elem[0]}-${idx + 1}`,
        },
      ]);
    } else if (tablerOutline[item.tabler]) {
      node = tablerOutline[item.tabler].map((elem, idx) => [
        elem[0],
        {
          ...elem[1],
          key: `${keyPrefix}-${elem[0]}-${idx + 1}`,
        },
      ]);
    }
  }

  if (!node) {
    throw new Error("Could not build node for " + item.name);
  }

  const nodeConstName = `${item.name.charAt(0).toLowerCase() + item.name.slice(1)}IconNode`;
  const nodeJson = JSON.stringify(node, null, 2);

  fileContent += `
const ${nodeConstName}: IconNode = ${nodeJson};

/**
 * ${item.desc}
 */
export const ${item.name} = /* @__PURE__ */ createLucideIcon("${item.name}", ${nodeConstName});
`;
}

const outputPath = path.resolve(__dirname, "../src/social-icons.tsx");
fs.writeFileSync(outputPath, fileContent, "utf8");
console.log("Successfully wrote " + iconDefinitions.length + " icons to " + outputPath);
