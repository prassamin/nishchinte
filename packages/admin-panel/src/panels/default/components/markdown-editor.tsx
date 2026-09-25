"use client";

import React, { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, Node, mergeAttributes } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Button, Popover } from "@heroui/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";
import UnderlineExtension from "@tiptap/extension-underline";
import TextAlignExtension from "@tiptap/extension-text-align";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import {
  Link as LinkIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  FolderOpen,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { MediaSelector } from "./media-selector";
import { AllowedStorageType } from "@nishchinte/storage";
import { useConfig } from "@nishchinte/config/client";

function parseVideoUrl(
  rawUrl: string,
): { type: "iframe" | "video"; src: string } | null {
  const url = rawUrl.trim();
  if (!url) return null;

  if (url.startsWith("<iframe")) {
    const srcMatch = url.match(/src=["']([^"']+)["']/);
    if (srcMatch && srcMatch[1]) {
      return { type: "iframe", src: srcMatch[1] };
    }
  }

  // YouTube matchers:
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: "iframe",
      src: `https://www.youtube.com/embed/${ytMatch[1]}`,
    };
  }

  // Vimeo matcher:
  const vimeoMatch = url.match(
    /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/,
  );
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "iframe",
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Direct video file (.mp4, .webm, .ogg, .mov)
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return {
      type: "video",
      src: url,
    };
  }

  return {
    type: "iframe",
    src: url,
  };
}

const IframeNode = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      frameborder: {
        default: 0,
      },
      allowfullscreen: {
        default: "true",
      },
      allow: {
        default:
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      },
      width: {
        default: "100%",
      },
      height: {
        default: "360",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "iframe",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      mergeAttributes(HTMLAttributes, {
        style:
          "width: 100%; aspect-ratio: 16/9; border-radius: 0.5em; border: 0; margin: 0.5em 0; display: block;",
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(
            `<iframe src="${node.attrs.src || ""}" width="100%" height="360" frameborder="0" allowfullscreen="true" style="max-width: 100%; aspect-ratio: 16/9; border-radius: 0.5em; border: 0;"></iframe>`,
          );
          state.closeBlock(node);
        },
        parse: {
          // Handled by markdown-it
        },
      },
    };
  },
});

const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
      width: {
        default: "100%",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: "true",
        style:
          "max-width: 100%; border-radius: 0.5em; margin: 0.5em 0; display: block;",
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(
            `<video src="${node.attrs.src || ""}" controls style="max-width: 100%; border-radius: 0.5em;"></video>`,
          );
          state.closeBlock(node);
        },
        parse: {
          // Handled by markdown-it
        },
      },
    };
  },
});

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  allowed?: AllowedStorageType | AllowedStorageType[];
};

export default function MarkdownEditor({
  value,
  onChange,
  allowed,
}: MarkdownEditorProps) {
  const { videoAllowed } = useConfig();
  const [showLinkUrlInput, setShowLinkUrlInput] = useState(false);
  const [showVideoPopover, setShowVideoPopover] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [isMediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [mediaSelectorAllowed, setMediaSelectorAllowed] = useState<
    AllowedStorageType | AllowedStorageType[]
  >(allowed ?? "image");
  const isApplyingExternalValue = useRef(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (open && editor) {
      const previousUrl = editor.getAttributes("link").href;
      setLinkUrl(previousUrl || "");

      const { from, to } = editor.state.selection;
      if (from !== to) {
        setLinkText(editor.state.doc.textBetween(from, to, " "));
      } else {
        setLinkText("");
      }
    }
    setShowLinkUrlInput(open);
  };

  const CustomImage = ImageExtension.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: null,
          renderHTML: (attributes) => {
            if (!attributes.width) return {};
            return { width: attributes.width };
          },
        },
        height: {
          default: null,
          renderHTML: (attributes) => {
            if (!attributes.height) return {};
            return { height: attributes.height };
          },
        },
        align: {
          default: "center",
          parseHTML: (element) =>
            element.getAttribute("data-align") || "center",
          renderHTML: (attributes) => {
            if (!attributes.align) return {};
            return { "data-align": attributes.align };
          },
        },
        alt: {
          default: null,
        },
      };
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
      }),
      CustomImage,
      IframeNode,
      VideoNode,
      UnderlineExtension,
      TextAlignExtension.configure({
        types: ["heading", "paragraph"],
      }),
      PlaceholderExtension.configure({
        placeholder: "Write a detailed description...",
        emptyEditorClass: "is-editor-empty",
      }),
      Markdown.configure({ html: true }) as any,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (isApplyingExternalValue.current) return;
      const markdownOut = (editor.storage as any).markdown.getMarkdown();
      onChange(markdownOut);
    },
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-50 w-full bg-ap-field-background px-4 py-3 text-[14px] text-ap-foreground resize-y overflow-auto",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const markdownValue = value || "";
    const currentMarkdown =
      (editor.storage as any)?.markdown?.getMarkdown?.() || "";

    if (currentMarkdown === markdownValue) return;

    isApplyingExternalValue.current = true;
    editor.commands.setContent(markdownValue, { emitUpdate: false });
    queueMicrotask(() => {
      isApplyingExternalValue.current = false;
    });
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="w-full rounded-lg border border-ap-border bg-ap-field-background min-h-50 animate-pulse"></div>
    );
  }

  const submitLink = () => {
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setShowLinkUrlInput(false);
      return;
    }

    // Ensure editor regains focus before updating to prevent selection glitches
    editor.commands.focus();

    if (editor.isActive("link")) {
      // Editing an existing link
      if (linkText) {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .insertContent(`<a href="${linkUrl}">${linkText}</a> `)
          .run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: linkUrl })
          .run();
      }
    } else {
      // Creating a new link
      if (editor.state.selection.empty && !linkText) {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkUrl}">${linkUrl}</a> `)
          .run();
      } else if (!editor.state.selection.empty && !linkText) {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkUrl}">${linkText}</a> `)
          .run();
      }
    }

    // Unset link mark immediately so subsequent text isn't linked
    editor.commands.unsetLink();
    setShowLinkUrlInput(false);
  };

  const insertVideo = (rawUrl: string) => {
    if (!editor || !rawUrl.trim()) return;

    const parsed = parseVideoUrl(rawUrl);
    if (!parsed) return;

    editor.commands.focus();
    if (parsed.type === "video") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "video",
          attrs: { src: parsed.src },
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "iframe",
          attrs: { src: parsed.src },
        })
        .run();
    }
  };

  const submitVideoUrl = () => {
    if (!videoUrl.trim() || !editor) return;

    insertVideo(videoUrl);
    setVideoUrl("");
    setShowVideoPopover(false);
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-ap-border focus-within:ring-2 focus-within:ring-ap-accent-soft focus-within:border-ap-accent transition-all shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-ap-border bg-ap-surface px-2 py-1.5 shadow-xs">
        <button
          type="button"
          title="Text Style"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`px-2 py-1 text-[13px] font-medium text-ap-foreground hover:bg-black/5 rounded flex items-center gap-1 transition-all ${editor.isActive("heading", { level: 2 }) ? "bg-black/10 dark:bg-white/10" : ""}`}
        >
          {editor.isActive("heading", { level: 1 })
            ? "Heading 1"
            : editor.isActive("heading", { level: 2 })
              ? "Heading 2"
              : "Paragraph"}
          <ChevronDown size={14} className="text-ap-muted" />
        </button>

        <div className="w-px h-4 border-ap-border mx-1"></div>

        <button
          type="button"
          title="Bold (Ctrl+B)"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 font-bold text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive("bold") ? "bg-black/10 dark:bg-white/10 shadow-inner" : ""}`}
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          title="Italic (Ctrl+I)"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 italic text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive("italic") ? "bg-black/10 dark:bg-white/10 shadow-inner" : ""}`}
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          title="Underline (Ctrl+U)"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive("underline") ? "bg-black/10 dark:bg-white/10 shadow-inner" : ""}`}
        >
          <UnderlineIcon size={15} />
        </button>

        <div className="w-px h-4 border-ap-border mx-1"></div>

        <button
          type="button"
          title="Align Left"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`p-1.5 text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive({ textAlign: "left" }) ? "bg-black/10 dark:bg-white/10 shadow-inner" : ""}`}
        >
          <AlignLeft size={15} />
        </button>
        <button
          type="button"
          title="Align Center"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`p-1.5 text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive({ textAlign: "center" }) ? "bg-black/10 dark:bg-white/10 shadow-inner" : ""}`}
        >
          <AlignCenter size={15} />
        </button>
        <button
          type="button"
          title="Align Right"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`p-1.5 text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive({ textAlign: "right" }) ? "bg-black/10 dark:bg-white/10 shadow-inner" : ""}`}
        >
          <AlignRight size={15} />
        </button>

        <div className="w-px h-4 border-ap-border mx-1"></div>

        <button
          type="button"
          title="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive("bulletList") ? "bg-black/10 dark:bg-white/10 shadow-inner" : ""}`}
        >
          <List size={15} />
        </button>
        <button
          type="button"
          title="Ordered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive("orderedList") ? "bg-black/10 dark:bg-white/10 shadow-inner" : ""}`}
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive("blockquote") ? "bg-black/10 dark:bg-white/10 shadow-inner" : ""}`}
        >
          <Quote size={15} />
        </button>

        <div className="w-px h-4 border-ap-border mx-1"></div>

        <Popover isOpen={showLinkUrlInput} onOpenChange={handleOpenChange}>
          <Popover.Trigger>
            <button
              type="button"
              title="Insert Link"
              className={`p-1.5 text-ap-muted hover:text-ap-foreground hover:bg-black/5 rounded transition-all ${editor.isActive("link") ? "text-ap-accent bg-ap-accent/10 shadow-inner font-bold" : ""}`}
            >
              <LinkIcon size={15} />
            </button>
          </Popover.Trigger>
          <Popover.Content className="w-80 p-0" placement="bottom" offset={8}>
            <Popover.Dialog className="p-4 space-y-3 bg-ap-surface border border-ap-border rounded-2xl shadow-xl">
              <Popover.Arrow />
              <div className="flex items-center justify-between pb-1 border-b border-ap-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-ap-accent/10 flex items-center justify-center text-ap-accent">
                    <LinkIcon size={13} />
                  </div>
                  <Popover.Heading className="text-[13px] font-semibold text-ap-foreground">
                    {editor.isActive("link") ? "Edit Link" : "Insert Link"}
                  </Popover.Heading>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-ap-muted">
                    Link Text (optional)
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="e.g. Click here"
                    className="w-full bg-ap-field-background border border-ap-border rounded-lg px-2.5 py-1.5 text-[13px] text-ap-foreground focus:outline-none focus:border-ap-accent focus:ring-1 focus:ring-ap-accent transition-all"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitLink();
                      }
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-ap-muted">
                    URL <span className="text-ap-danger">*</span>
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-ap-field-background border border-ap-border rounded-lg px-2.5 py-1.5 text-[13px] text-ap-foreground focus:outline-none focus:border-ap-accent focus:ring-1 focus:ring-ap-accent transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitLink();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-ap-border/50">
                {editor.isActive("link") ? (
                  <Button
                    variant="tertiary"
                    onPress={() => {
                      editor
                        .chain()
                        .focus()
                        .extendMarkRange("link")
                        .unsetLink()
                        .run();
                      setShowLinkUrlInput(false);
                    }}
                    className="text-ap-danger hover:bg-ap-danger/10 text-xs font-medium px-2.5 py-1 h-auto rounded-md"
                  >
                    Remove
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="tertiary"
                    onPress={() => setShowLinkUrlInput(false)}
                    className="text-xs font-medium px-2.5 py-1 h-auto rounded-md"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onPress={submitLink}
                    className="text-xs font-medium px-3 py-1 h-auto rounded-md bg-ap-accent text-ap-accent-foreground shadow-xs"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>

        {/* Image / Media Button */}
        <button
          type="button"
          title="Upload Image"
          onClick={() => {
            setMediaSelectorAllowed("image");
            setMediaSelectorOpen(true);
          }}
          className="p-1.5 text-ap-muted hover:text-ap-foreground hover:bg-black/5 rounded transition-all"
        >
          <ImageIcon size={15} />
        </button>

        {/* Video Popover Button */}
        {videoAllowed && (
          <Popover isOpen={showVideoPopover} onOpenChange={setShowVideoPopover}>
            <Popover.Trigger>
              <button
                type="button"
                title="Insert Video"
                className={`p-1.5 text-ap-muted hover:text-ap-foreground hover:bg-black/5 rounded transition-all ${showVideoPopover ? "text-ap-accent bg-ap-accent/10 shadow-inner font-bold" : ""}`}
              >
                <VideoIcon size={15} />
              </button>
            </Popover.Trigger>
            <Popover.Content className="w-80 p-0" placement="bottom" offset={8}>
              <Popover.Dialog className="p-4 space-y-3 bg-ap-surface border border-ap-border rounded-2xl shadow-xl">
                <Popover.Arrow />
                <div className="flex items-center justify-between pb-1 border-b border-ap-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-ap-accent/10 flex items-center justify-center text-ap-accent">
                      <VideoIcon size={13} />
                    </div>
                    <Popover.Heading className="text-[13px] font-semibold text-ap-foreground">
                      Insert Video
                    </Popover.Heading>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-ap-muted">
                      Video / Embed URL (YouTube, Vimeo, etc.)
                    </label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-ap-field-background border border-ap-border rounded-lg px-2.5 py-1.5 text-[13px] text-ap-foreground focus:outline-none focus:border-ap-accent focus:ring-1 focus:ring-ap-accent transition-all"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submitVideoUrl();
                        }
                      }}
                    />
                  </div>

                  <Button
                    variant="primary"
                    onPress={submitVideoUrl}
                    isDisabled={!videoUrl.trim()}
                    className="w-full text-xs font-semibold py-1.5 h-auto rounded-lg bg-ap-accent text-ap-accent-foreground shadow-xs disabled:opacity-50"
                  >
                    Insert Video
                  </Button>

                  <div className="relative flex items-center justify-center py-0.5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-ap-border/60" />
                    </div>
                    <span className="relative bg-ap-surface px-2 text-[10px] font-semibold text-ap-muted uppercase">
                      OR
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowVideoPopover(false);
                      setMediaSelectorAllowed("video");
                      setMediaSelectorOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-ap-border/80 bg-ap-field-background/50 hover:bg-ap-field-background rounded-xl text-[12px] font-medium text-ap-foreground transition-all hover:border-ap-accent/40"
                  >
                    <FolderOpen size={14} className="text-ap-muted" />
                    Choose from Media Library
                  </button>
                </div>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        )}
      </div>

      <EditorContent editor={editor} />

      <MediaSelector
        isOpen={isMediaSelectorOpen}
        onClose={() => setMediaSelectorOpen(false)}
        multiple={true}
        allowed={mediaSelectorAllowed}
        onSelect={(files) => {
          if (!editor || files.length === 0) return;

          editor.commands.focus();

          files.forEach((file) => {
            if (file.mimeType?.startsWith("video/")) {
              insertVideo(file.url);
            } else {
              editor.chain().focus().setImage({ src: file.url }).run();
            }
          });
        }}
      />

      {editor && (
        <BubbleMenu
          editor={editor}
          {...({
            tippyOptions: {
              duration: 150,
              placement: "top",
              offset: [0, -60],
              zIndex: 999,
            },
          } as any)}
          shouldShow={({ editor }) => editor.isActive("image")}
          className="bg-ap-surface border border-ap-border shadow-xl rounded-xl p-3 w-60! flex flex-col gap-3 animate-in fade-in zoom-in-95 z-1000"
        >
          <div
            className="flex flex-col gap-3"
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ap-border/50 pb-2">
              <p className="text-[12px] font-semibold text-ap-foreground">
                Image Properties
              </p>
              <button
                type="button"
                className="text-[11px] text-ap-muted hover:text-red-500 transition-colors"
                onClick={() => editor.chain().focus().deleteSelection().run()}
              >
                Delete
              </button>
            </div>

            {/* Dimensions */}
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-ap-muted">
                  Width
                </label>
                <input
                  type="text"
                  placeholder="e.g. 500px, 100%"
                  value={editor.getAttributes("image").width || ""}
                  onChange={(e) =>
                    editor
                      .chain()
                      .updateAttributes("image", { width: e.target.value })
                      .run()
                  }
                  className="w-full bg-ap-field-background border border-ap-border rounded-lg px-2 py-1.5 text-[12px] text-ap-foreground focus:outline-none focus:border-ap-accent focus:ring-1 focus:ring-ap-accent transition-all"
                />
              </div>
            </div>
            {/* Alt Text */}
            <div className="flex flex-col gap-1.5 border-t border-ap-border/50 pt-3">
              <label className="text-[11px] font-medium text-ap-muted">
                Alt Text
              </label>
              <input
                type="text"
                placeholder="Describe this image..."
                value={editor.getAttributes("image").alt || ""}
                onChange={(e) =>
                  editor
                    .chain()
                    .updateAttributes("image", { alt: e.target.value })
                    .run()
                }
                className="w-full bg-ap-field-background border border-ap-border rounded-lg px-2 py-1.5 text-[12px] text-ap-foreground focus:outline-none focus:border-ap-accent focus:ring-1 focus:ring-ap-accent transition-all"
              />
            </div>
          </div>
        </BubbleMenu>
      )}

      {/* Essential editor styles for ProseMirror without adding Tailwind Typography globally */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--muted);
          pointer-events: none;
          height: 0;
          opacity: 0.6;
        }
        .tiptap p { margin-top: 0.25em; margin-bottom: 0.25em; }
        .tiptap p:first-child { margin-top: 0; }
        .tiptap p:last-child { margin-bottom: 0; }
        .tiptap img[data-align="left"] { float: left; margin-right: 1.5em; margin-bottom: 1em; }
        .tiptap img[data-align="right"] { float: right; margin-left: 1.5em; margin-bottom: 1em; }
        .tiptap img[data-align="center"] { display: block; margin-left: auto; margin-right: auto; }
        .tiptap h1 { font-size: 1.5em; font-weight: 700; margin-top: 1em; margin-bottom: 0.5em; color: var(--foreground); }
        .tiptap h2 { font-size: 1.25em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; color: var(--foreground); }
        .tiptap ul { list-style-type: disc; padding-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
        .tiptap blockquote { border-left: 3px solid var(--border); padding-left: 1em; margin-left: 0; color: var(--muted); font-style: italic; }
        .tiptap code { background-color: rgba(120, 120, 120, 0.15); padding: 0.1em 0.3em; border-radius: 0.25em; font-family: monospace; font-size: 0.9em; }
        .tiptap pre { background-color: rgba(0, 0, 0, 0.05); padding: 1em; border-radius: 0.5em; overflow-x: auto; font-family: monospace; font-size: 0.9em; margin-top: 0.5em; margin-bottom: 0.5em; }
        .dark .tiptap pre { background-color: rgba(255, 255, 255, 0.05); }
        .tiptap img { max-width: 100%; border-radius: 0.5em; margin: 0.5em 0; }
        .tiptap video { max-width: 100%; border-radius: 0.5em; margin: 0.5em 0; }
        .tiptap iframe { max-width: 100%; border-radius: 0.5em; margin: 0.5em 0; }
        .tiptap a { color: var(--accent); text-decoration: underline; cursor: pointer; }
        .tiptap img.ProseMirror-selectednode { outline: 2px solid var(--accent); outline-offset: 2px; }
        .tiptap hr { border: 0; border-top: 1px solid var(--border); margin: 1em 0; }
      `,
        }}
      />
    </div>
  );
}
