import React, { type CSSProperties } from "react";
import { cn } from "@heroui/styles";
import { useWorkspaceStore } from "../store/workspace";
export const Content: React.FC<React.ComponentProps<"div">> = ({
  children,
  className,
  ...props
}) => {
  const { sidebarWidth } = useWorkspaceStore();

  return (
    <div
      className={cn(
        "fixed right-0 top-16 h-[calc(100vh-4rem)] w-[stretch] overflow-auto bg-ap-background p-6 transition-all duration-200 scrollbar-styled",
        "ml-0 rounded-t-2xl md:ml-(--sidebar-width) md:rounded-tr-2xl md:rounded-tl-none",
        className,
      )}
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
};

export default Content;
