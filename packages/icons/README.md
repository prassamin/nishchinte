# @nishchinte/icons

Comprehensive icon set for the Nishchinte platform and storefronts, combining the full **Lucide Icons** library with an authentic collection of **Social & Brand Icons**.

All brand and social icons are extracted directly from official brand guidelines (`simple-icons` and Tabler icons in 24x24 viewBox) and wrapped with `createLucideIcon` to support standard `LucideProps` (size, color, strokeWidth, className, etc.).

## Installation

```bash
pnpm add @nishchinte/icons
```

## Usage

You can import any Lucide icon or social brand icon directly from `@nishchinte/icons`:

```tsx
import { 
  Facebook, 
  Twitter, 
  BrandX, 
  Instagram, 
  Linkedin, 
  YouTube, 
  Github, 
  WhatsApp, 
  Discord,
  PayPal,
  Stripe,
  Visa,
  Mastercard,
  ShoppingBag,
  ArrowRight,
  Search
} from "@nishchinte/icons";

export function SocialLinks() {
  return (
    <div className="flex items-center gap-4">
      <Facebook size={20} className="text-[#1877F2] hover:opacity-80" />
      <Twitter size={20} className="text-[#1DA1F2] hover:opacity-80" />
      <BrandX size={20} className="text-black hover:opacity-80" />
      <Instagram size={20} className="text-[#E4405F] hover:opacity-80" />
      <Linkedin size={20} className="text-[#0A66C2] hover:opacity-80" />
      <YouTube size={20} className="text-[#FF0000] hover:opacity-80" />
      <Github size={20} className="text-neutral-900 hover:opacity-80" />
      <WhatsApp size={20} className="text-[#25D366] hover:opacity-80" />
      <Discord size={20} className="text-[#5865F2] hover:opacity-80" />
    </div>
  );
}
```

## Available Brand & Social Icons

### Major Social Platforms
* `Facebook`, `Twitter`, `BrandX`, `Instagram`, `Linkedin`, `Threads`, `Pinterest`, `TikTok`, `Snapchat`, `Reddit`, `Tumblr`, `Mastodon`, `Bluesky`, `Quora`, `Medium`, `Substack`, `Discord`, `Disqus`, `ProductHunt`, `Bilibili`, `Weibo`, `VK`

### Messaging & Calling
* `WhatsApp`, `Telegram`, `Messenger`, `WeChat`, `Line`, `BrandSignal`, `Viber`, `Slack`, `Skype`, `Zoom`, `Teams`

### Video, Audio & Media
* `YouTube`, `Twitch`, `Vimeo`, `Spotify`, `ApplePodcasts`, `AppleMusic`, `SoundCloud`, `Kick`, `Dailymotion`, `Deezer`, `Bandcamp`, `Netflix`, `Tidal`

### Developer, Tech & Frameworks
* `Github`, `GitLab`, `Bitbucket`, `Dribbble`, `Behance`, `Figma`, `StackOverflow`, `CodePen`, `CodeSandbox`, `Docker`, `Kubernetes`, `Npm`, `Vercel`, `Netlify`, `Supabase`, `Prisma`, `Nextjs`, `React`, `Vue`, `Angular`, `Svelte`, `Python`, `Rust`, `Go`, `Nodejs`, `TypeScript`, `JavaScript`

### Big Tech & Platforms
* `Google`, `BrandApple`, `Microsoft`, `Amazon`, `Android`, `Windows`, `Chrome`, `Firefox`, `Safari`, `Edge`

### Creator & Crowdfunding
* `Patreon`, `BuyMeACoffee`, `KoFi`, `Kickstarter`

### Payments & Commerce
* `PayPal`, `Stripe`, `Visa`, `Mastercard`, `AmericanExpress`, `ApplePay`, `GooglePay`, `Alipay`, `Shopify`, `Ebay`, `Etsy`, `Klarna`
