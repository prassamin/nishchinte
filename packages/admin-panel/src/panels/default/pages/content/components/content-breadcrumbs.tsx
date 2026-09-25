import { ChevronRight, Home } from "lucide-react";

type Props = {
  path: string;
  rootPath: string;
  onNavigate: (path: string) => void;
};

export function ContentBreadcrumbs({ path, rootPath, onNavigate }: Props) {
  const fullSegments = path.split("/").filter(Boolean);
  const rootSegments = rootPath.split("/").filter(Boolean);
  const relativeSegments = fullSegments.slice(rootSegments.length);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <button
        type="button"
        onClick={() => onNavigate(rootPath)}
        className="inline-flex items-center gap-1.5 text-ap-muted hover:text-ap-foreground transition-colors"
      >
        <Home size={14} />
        <span>Home</span>
      </button>

      {relativeSegments.map((segment, index) => {
        const target = [
          ...rootSegments,
          ...relativeSegments.slice(0, index + 1),
        ].join("/");
        const isLast = index === relativeSegments.length - 1;

        return (
          <div key={target} className="inline-flex items-center gap-1.5">
            <ChevronRight size={14} className="text-ap-muted/50" />
            {isLast ? (
              <span className="text-ap-foreground font-medium">{segment}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(target)}
                className="text-ap-muted hover:text-ap-foreground transition-colors"
              >
                {segment}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
