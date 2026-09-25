"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Music, Image as ImageIcon, Play } from "lucide-react";

interface MediaThumbnailProps {
  url: string;
  name: string;
  type?: string;
  alt?: string;
  className?: string;
  isSelected?: boolean;
}

// Global in-memory cache for generated canvas thumbnails across renders
const thumbnailCache = new Map<string, string>();
const pendingGenerations = new Map<string, Promise<string | null>>();

const THUMBNAIL_MAX_DIMENSION = 280;

function isVideoFile(type?: string, name?: string): boolean {
  if (type && type.startsWith("video/")) return true;
  if (name && /\.(mp4|webm|mov|ogg|mkv|m4v|avi)$/i.test(name)) return true;
  return false;
}

function isAudioFile(type?: string, name?: string): boolean {
  if (type && type.startsWith("audio/")) return true;
  if (name && /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(name)) return true;
  return false;
}

function isSvgFile(type?: string, name?: string): boolean {
  if (type === "image/svg+xml") return true;
  if (name && /\.svg$/i.test(name)) return true;
  return false;
}

/**
 * Generates a low-resolution thumbnail bitmap from an image using an offscreen canvas.
 */
async function generateImageThumbnail(url: string): Promise<string | null> {
  if (thumbnailCache.has(url)) {
    return thumbnailCache.get(url)!;
  }

  if (pendingGenerations.has(url)) {
    return pendingGenerations.get(url)!;
  }

  const promise = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = () => {
      try {
        const { naturalWidth: width, naturalHeight: height } = img;
        if (!width || !height) {
          resolve(null);
          return;
        }

        const scale = Math.min(
          1,
          THUMBNAIL_MAX_DIMENSION / Math.max(width, height),
        );
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const dataUrl = canvas.toDataURL("image/webp", 0.72);
        thumbnailCache.set(url, dataUrl);
        resolve(dataUrl);
      } catch {
        // Tainted canvas (CORS restriction) fallback
        resolve(null);
      } finally {
        pendingGenerations.delete(url);
      }
    };

    img.onerror = () => {
      pendingGenerations.delete(url);
      resolve(null);
    };

    img.src = url;
  });

  pendingGenerations.set(url, promise);
  return promise;
}

/**
 * Extracts a low-res video frame at 0.5s onto a canvas and immediately unloads the video decoder.
 */
async function generateVideoThumbnail(url: string): Promise<string | null> {
  if (thumbnailCache.has(url)) {
    return thumbnailCache.get(url)!;
  }

  if (pendingGenerations.has(url)) {
    return pendingGenerations.get(url)!;
  }

  const promise = new Promise<string | null>((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let cleanupDone = false;
    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      video.removeAttribute("src");
      video.load();
      pendingGenerations.delete(url);
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 4000);

    video.onloadeddata = () => {
      // Seek slightly past 0 to avoid blank black intro frames
      video.currentTime = Math.min(
        0.5,
        Math.max(0.1, (video.duration || 1) * 0.1),
      );
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const width = video.videoWidth || 320;
        const height = video.videoHeight || 240;

        const scale = Math.min(
          1,
          THUMBNAIL_MAX_DIMENSION / Math.max(width, height),
        );
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL("image/webp", 0.72);
          thumbnailCache.set(url, dataUrl);
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch {
        // Tainted canvas (CORS restriction) fallback
      }
      cleanup();
      resolve(null);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };

    video.src = url;
  });

  pendingGenerations.set(url, promise);
  return promise;
}

export function MediaThumbnail({
  url,
  name,
  type,
  alt,
  className = "",
  isSelected = false,
}: MediaThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(
    () => thumbnailCache.get(url) || null,
  );
  const [isVisible, setIsVisible] = useState(false);
  const [loaded, setLoaded] = useState(() => Boolean(thumbnailCache.has(url)));
  const [hasError, setHasError] = useState(false);

  const isVideo = isVideoFile(type, name);
  const isAudio = isAudioFile(type, name);
  const isSvg = isSvgFile(type, name);

  // Viewport intersection observer to avoid decoding offscreen items
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Generate / retrieve low-res canvas thumbnail once in viewport
  useEffect(() => {
    if (!isVisible || !url) return;

    if (thumbnailCache.has(url)) {
      setThumbUrl(thumbnailCache.get(url)!);
      setLoaded(true);
      return;
    }

    if (isAudio || isSvg) {
      setLoaded(true);
      return;
    }

    let isMounted = true;

    if (isVideo) {
      generateVideoThumbnail(url).then((res) => {
        if (isMounted) {
          if (res) {
            setThumbUrl(res);
          }
          setLoaded(true);
        }
      });
    } else {
      generateImageThumbnail(url).then((res) => {
        if (isMounted) {
          if (res) {
            setThumbUrl(res);
          }
          setLoaded(true);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isVisible, url, isVideo, isAudio, isSvg]);

  // Fallback 1: Audio item representation
  if (isAudio) {
    return (
      <div
        ref={containerRef}
        className={`w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-ap-accent/5 to-ap-accent/15 text-ap-accent select-none ${className}`}
      >
        <div className="w-11 h-11 rounded-2xl bg-ap-accent/10 border border-ap-accent/20 flex items-center justify-center shadow-xs">
          <Music size={22} className="text-ap-accent" />
        </div>
      </div>
    );
  }

  // Fallback 2: Video when CORS blocks canvas frame extraction (or video failed to snapshot)
  if (isVideo && !thumbUrl && loaded) {
    return (
      <div
        ref={containerRef}
        className={`w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-ap-surface to-ap-field-background select-none relative ${className}`}
        style={{ contain: "paint" }}
      >
        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-md">
          <Film size={22} className="text-white/80" />
        </div>
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-bold text-white flex items-center gap-1">
          <Play size={9} className="fill-white" />
          <span>VIDEO</span>
        </div>
      </div>
    );
  }

  // Fallback 3: Generic error / broken link fallback
  if (hasError) {
    return (
      <div
        ref={containerRef}
        className={`w-full h-full flex flex-col items-center justify-center bg-ap-field-background/80 text-ap-muted select-none ${className}`}
      >
        <div className="w-11 h-11 rounded-2xl bg-ap-surface border border-ap-border flex items-center justify-center shadow-xs mb-1">
          {isVideo ? (
            <Film size={20} className="text-ap-muted/70" />
          ) : isAudio ? (
            <Music size={20} className="text-ap-muted/70" />
          ) : (
            <ImageIcon size={20} className="text-ap-muted/70" />
          )}
        </div>
      </div>
    );
  }

  // If we have a generated thumbnail data URL, use it; otherwise fall back to original url for images/SVG
  const displaySrc = thumbUrl || (isVideo ? "" : url);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden bg-ap-field-background select-none ${className}`}
      style={{ contain: "paint" }}
    >
      {/* Skeleton Shimmer while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-ap-field-background animate-pulse" />
      )}

      {/* Render Image / Low-res Canvas Thumbnail */}
      {isVisible && displaySrc && (
        <img
          src={displaySrc}
          alt={alt || name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isSelected ? "scale-105" : "group-hover:scale-105"
          } ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}
        />
      )}

      {/* Video Indicator Badge */}
      {isVideo && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-bold text-white flex items-center gap-1">
          <Play size={9} className="fill-white" />
          <span>VIDEO</span>
        </div>
      )}
    </div>
  );
}
