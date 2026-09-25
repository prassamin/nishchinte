"use client";

import {
  Download,
  Link,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileAudio,
  Calendar,
  Clock,
  HardDrive,
  FileType,
} from "lucide-react";
import { Drawer, cn } from "@heroui/react";
import { useState, useEffect, useCallback, useRef } from "react";

import { useConfirm } from "@nishchinte/confirm";

import type { ContentItem } from "../types";
import {
  isImageMime,
  isAudioMime,
  isMediaItem,
  isVideoMime,
} from "./content-grid";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: ContentItem[];
  initialIndex: number;
  onDeleteItem: (path: string) => void;
};

function formatSize(size?: number | null) {
  if (!size || size <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("bn-BD", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function MediaViewer({
  isOpen,
  onClose,
  items,
  initialIndex,
  onDeleteItem,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const mediaItems = items.filter(isMediaItem);
  const currentItem = mediaItems[currentIndex];

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsPlaying(true);
      setCopied(false);
    }
  }, [isOpen, initialIndex]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleDownload = async () => {
    if (!currentItem) return;
    try {
      const res = await fetch(currentItem.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = currentItem.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(currentItem.url, "_blank");
    }
  };

  const handleCopyUrl = () => {
    if (!currentItem) return;
    navigator.clipboard.writeText(currentItem.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const { confirm } = useConfirm();

  const handleDelete = async () => {
    if (!currentItem) return;
    const ok = await confirm({
      title: "ফাইল মুছে ফেলুন",
      description: `আপনি কি "${currentItem.name}" স্থায়ীভাবে মুছে ফেলতে চান?`,
      isDanger: true,
    });
    if (ok) {
      onDeleteItem(currentItem.path);
      onClose();
    }
  };

  const togglePlay = () => {
    const media = videoRef.current || audioRef.current;
    if (!media) return;
    if (isPlaying) media.pause();
    else media.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const media = videoRef.current || audioRef.current;
    if (!media) return;
    media.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  if (!currentItem) return null;

  const isImage = isImageMime(currentItem.mimeType);
  const isVideo = isVideoMime(currentItem.mimeType);
  const isAudio = isAudioMime(currentItem.mimeType);

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex flex-col h-full w-md">
            {/* Media Preview */}
            <div className="shrink-0 flex items-center justify-center">
              {isImage && (
                <img
                  src={currentItem.url}
                  alt={currentItem.name}
                  className="w-full max-h-105 object-contain rounded-xl"
                />
              )}
              {isVideo && (
                <video
                  ref={videoRef}
                  src={currentItem.url}
                  className="w-full h-auto max-h-105 object-contain"
                  autoPlay
                  controls={false}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              )}
              {isAudio && (
                <div className="flex flex-col items-center gap-6 py-12 w-full">
                  <div className="w-28 h-28 rounded-3xl bg-ap-accent-soft flex items-center justify-center ring-1 ring-ap-accent-soft">
                    <FileAudio size={48} className="text-ap-accent/70" />
                  </div>
                  <audio
                    ref={audioRef}
                    src={currentItem.url}
                    autoPlay
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-full bg-ap-accent-soft hover:bg-ap-accent-soft text-ap-accent flex items-center justify-center transition-colors ring-1 ring-ap-accent-soft"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-ap-muted flex items-center justify-center transition-colors"
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* File Info */}
            <Drawer.Body className="flex-1 overflow-auto space-y-6 mt-5">
              {/* Name & Type Badge */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-ap-foreground break-all leading-snug">
                  {currentItem.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-ap-surface border border-ap-border/40 text-ap-muted">
                    <FileType size={12} />
                    {(currentItem.mimeType || "unknown")
                      .split("/")[1]
                      ?.toUpperCase() || "UNKNOWN"}
                  </span>
                  <span className="text-xs text-ap-muted">
                    {formatSize(currentItem.sizeBytes)}
                  </span>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-ap-surface/50 border border-ap-border/30">
                  <Calendar
                    size={16}
                    className="text-ap-muted mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-ap-muted/70 mb-0.5">
                      যোগ করা হয়েছে
                    </p>
                    <p className="text-sm text-ap-foreground font-medium">
                      {formatDate(currentItem.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-ap-surface/50 border border-ap-border/30">
                  <Clock size={16} className="text-ap-muted mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-ap-muted/70 mb-0.5">
                      সর্বশেষ পরিবর্তন
                    </p>
                    <p className="text-sm text-ap-foreground font-medium">
                      {formatDate(
                        currentItem.updatedAt || currentItem.createdAt,
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-ap-surface/50 border border-ap-border/30 col-span-2">
                  <HardDrive
                    size={16}
                    className="text-ap-muted mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-ap-muted/70 mb-0.5">
                      ফাইলের আকার
                    </p>
                    <p className="text-sm text-ap-foreground font-medium">
                      {formatSize(currentItem.sizeBytes)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-ap-foreground bg-ap-surface border border-ap-border/50 hover:bg-ap-surface/80 hover:border-ap-border hover:shadow-sm transition-all"
                >
                  <Download size={16} />
                  ডাউনলোড
                </button>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    copied
                      ? "text-ap-success bg-ap-success-soft border-ap-success-soft-hover"
                      : "text-ap-foreground bg-ap-surface border-ap-border/50 hover:bg-ap-surface/80 hover:border-ap-border hover:shadow-sm",
                  )}
                >
                  <Link size={16} />
                  {copied ? "কপি হয়েছে" : "URL কপি করুন"}
                </button>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={handleDelete}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-ap-danger bg-ap-danger-soft border border-ap-danger-soft hover:bg-ap-danger-soft-hover hover:border-ap-danger-soft-hover transition-all"
              >
                <Trash2 size={16} />
                ফাইল মুছুন
              </button>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
