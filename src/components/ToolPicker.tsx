import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { SquareTerminal, Globe, GitBranch, FilePlus2, FolderTree, ListTodo, Bot, Plug, SquareArrowOutUpRight, ArrowDown, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ToolId = "terminal" | "browser" | "git" | "files" | "project-files" | "tasks" | "agents" | "mcp";
type ToolPickerOrientation = "vertical" | "horizontal";

/** SVG circular progress ring that wraps the tool icon button. */
function ToolProgressRing({ progress, isComplete, size }: { progress: number; isComplete: boolean; size: number }) {
  const radius = (size - 3) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="pointer-events-none absolute inset-0 -rotate-90"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-foreground/[0.06]"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={isComplete ? "rgb(52, 211, 153)" : "rgb(96, 165, 250)"}
        strokeOpacity={isComplete ? 0.8 : 0.6}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 700ms ease-out, stroke 300ms ease-out" }}
      />
    </svg>
  );
}

const TOOL_TINTS: Record<string, { idle: string; hover: string; active: string }> = {
  terminal:        { idle: "text-emerald-600/70 dark:text-emerald-200/50",  hover: "hover:text-emerald-600/90 dark:hover:text-emerald-200/70",  active: "text-emerald-600 dark:text-emerald-200/90" },
  browser:         { idle: "text-sky-600/70 dark:text-sky-200/50",          hover: "hover:text-sky-600/90 dark:hover:text-sky-200/70",          active: "text-sky-600 dark:text-sky-200/90" },
  git:             { idle: "text-orange-600/70 dark:text-orange-200/50",    hover: "hover:text-orange-600/90 dark:hover:text-orange-200/70",    active: "text-orange-600 dark:text-orange-200/90" },
  files:           { idle: "text-amber-600/70 dark:text-amber-200/50",      hover: "hover:text-amber-600/90 dark:hover:text-amber-200/70",     active: "text-amber-600 dark:text-amber-200/90" },
  "project-files": { idle: "text-teal-600/70 dark:text-teal-200/50",       hover: "hover:text-teal-600/90 dark:hover:text-teal-200/70",       active: "text-teal-600 dark:text-teal-200/90" },
  mcp:             { idle: "text-violet-600/70 dark:text-violet-200/50",    hover: "hover:text-violet-600/90 dark:hover:text-violet-200/70",   active: "text-violet-600 dark:text-violet-200/90" },
  tasks:           { idle: "text-blue-600/70 dark:text-blue-200/50",        hover: "hover:text-blue-600/90 dark:hover:text-blue-200/70",       active: "text-blue-600 dark:text-blue-200/90" },
  agents:          { idle: "text-indigo-600/70 dark:text-indigo-200/50",    hover: "hover:text-indigo-600/90 dark:hover:text-indigo-200/70",   active: "text-indigo-600 dark:text-indigo-200/90" },
};

interface ToolDef {
  id: ToolId;
  label: string;
  icon: typeof SquareTerminal;
}

const PANEL_TOOLS_MAP: Record<string, ToolDef> = {
  terminal: { id: "terminal", label: "Terminal", icon: SquareTerminal },
  browser: { id: "browser", label: "Browser", icon: Globe },
  git: { id: "git", label: "Source Control", icon: GitBranch },
  files: { id: "files", label: "Changes", icon: FilePlus2 },
  "project-files": { id: "project-files", label: "Project Files", icon: FolderTree },
  mcp: { id: "mcp", label: "MCP Servers", icon: Plug },
};

/** Tool IDs that render in the tools column (not contextual right-panel tools). */
export const COLUMN_TOOL_IDS = new Set<ToolId>(Object.keys(PANEL_TOOLS_MAP) as ToolId[]);

const CONTEXTUAL_TOOLS: ToolDef[] = [
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "agents", label: "Background Agents", icon: Bot },
];

interface ToolPickerProps {
  islandLayout: boolean;
  transparentBackground: boolean;
  coloredIcons: boolean;
  orientation?: ToolPickerOrientation;
  panelToolFilter?: Set<ToolId>;
  pinnedBottomTools?: Set<ToolId>;
  activeTools: Set<ToolId>;
  onToggle: (toolId: ToolId) => void;
  availableContextual?: Set<ToolId>;
  toolOrder: ToolId[];
  onReorder: (fromId: ToolId, toId: ToolId) => void;
  projectPath?: string;
  bottomTools: Set<ToolId>;
  onMoveToBottom: (id: ToolId) => void;
  onMoveToSide: (id: ToolId) => void;
  taskProgress?: { completed: number; total: number };
  toolInlineMeta?: Partial<Record<ToolId, ReactNode>>;
}

function ToolButton({
  tool,
  isActive,
  coloredIcons = true,
  islandLayout,
  orientation = "vertical",
  isDragTarget,
  isBottom,
  inlineMeta,
  badge,
  tooltipExtra,
  onClick,
}: {
  tool: ToolDef;
  isActive: boolean;
  coloredIcons?: boolean;
  islandLayout: boolean;
  orientation?: ToolPickerOrientation;
  isDragTarget?: boolean;
  isBottom?: boolean;
  inlineMeta?: ReactNode;
  badge?: ReactNode;
  tooltipExtra?: ReactNode;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  const isHorizontal = orientation === "horizontal";
  const hasInlineMeta = isHorizontal && !!inlineMeta;
  const buttonSize = islandLayout
    ? (isHorizontal ? (hasInlineMeta ? "h-8 px-1.5" : "h-8 w-8") : "h-9 w-9")
    : (isHorizontal ? (hasInlineMeta ? "h-9 px-2" : "h-9 w-9") : "h-10 w-10");
  const iconSize = islandLayout ? "h-4 w-4" : "h-[18px] w-[18px]";
  const radius = islandLayout ? "rounded-lg" : "rounded-[10px]";
  const tint = coloredIcons ? TOOL_TINTS[tool.id] : undefined;
  const activeClass = isHorizontal
    ? `${tint?.active ?? "text-foreground"} bg-transparent shadow-none`
    : `tool-picker-btn-active bg-foreground/[0.08] ${tint?.active ?? "text-foreground"} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_1px_2px_0_rgba(0,0,0,0.05)]`;
  const idleClass = isHorizontal
    ? `${tint?.idle ?? "text-foreground/35"} ${tint?.hover ?? "hover:text-foreground/70"} hover:bg-transparent`
    : `${tint?.idle ?? "text-foreground/35"} ${tint?.hover ?? "hover:text-foreground/70"} hover:bg-foreground/[0.05] active:scale-[0.92]`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`tool-picker-btn no-drag group/btn relative ${isHorizontal ? "" : "mx-auto "}flex ${buttonSize} items-center justify-center ${hasInlineMeta ? "gap-1.5" : ""} ${radius} overflow-visible ${hasInlineMeta ? "py-0" : "p-0"} transition-all duration-200 cursor-pointer ${
            isActive
              ? activeClass
              : idleClass
          } ${isDragTarget ? "ring-2 ring-foreground/20 ring-offset-1 ring-offset-background" : ""}`}
        >
          <Icon
            className={`${iconSize} transition-transform duration-200 ${!isActive ? "group-hover/btn:scale-110" : ""}`}
            strokeWidth={isActive ? 2 : 1.5}
          />
          {hasInlineMeta ? <span className="inline-flex items-center gap-1">{inlineMeta}</span> : null}
          {isHorizontal && isActive && (
            <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current" />
          )}
          {badge}
          {isBottom && !badge && !isHorizontal && (
            <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground/25" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={isHorizontal ? "bottom" : "left"} sideOffset={10}>
        <p className="text-xs font-medium">{tool.label}</p>
        {tooltipExtra}
        {isBottom && <p className="text-[10px] text-background/50">Bottom panel</p>}
      </TooltipContent>
    </Tooltip>
  );
}

function PanelToolWithMenu({
  tool,
  isActive,
  coloredIcons,
  islandLayout,
  orientation,
  isDragTarget,
  isBottom,
  lockBottomPlacement = false,
  inlineMeta,
  badge,
  tooltipExtra,
  onToggle,
  onMoveToBottom,
  onMoveToSide,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  tool: ToolDef;
  isActive: boolean;
  coloredIcons: boolean;
  islandLayout: boolean;
  orientation: ToolPickerOrientation;
  isDragTarget: boolean;
  isBottom: boolean;
  lockBottomPlacement?: boolean;
  inlineMeta?: ReactNode;
  badge?: ReactNode;
  tooltipExtra?: ReactNode;
  onToggle: () => void;
  onMoveToBottom: () => void;
  onMoveToSide: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(true);
  }, []);

  return (
    <div
      className="relative no-drag"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onContextMenu={handleContextMenu}
    >
      <ToolButton
        tool={tool}
        isActive={isActive}
        coloredIcons={coloredIcons}
        islandLayout={islandLayout}
        orientation={orientation}
        isDragTarget={isDragTarget}
        isBottom={isBottom}
        inlineMeta={inlineMeta}
        badge={badge}
        tooltipExtra={tooltipExtra}
        onClick={onToggle}
      />
      <DropdownMenu open={menuOpen} onOpenChange={(open) => { if (!open) setMenuOpen(false); }}>
        <DropdownMenuTrigger className="absolute inset-0 opacity-0 pointer-events-none" tabIndex={-1} />
        <DropdownMenuContent side={orientation === "horizontal" ? "bottom" : "left"} align="start" sideOffset={10}>
          <DropdownMenuItem disabled className="text-[11px] font-semibold tracking-wide text-foreground/50 uppercase">
            {tool.label}
          </DropdownMenuItem>
          {!lockBottomPlacement && (
            <>
              <DropdownMenuSeparator />
              {isBottom ? (
                <DropdownMenuItem onClick={onMoveToSide} className="gap-2">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Move to Side
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onMoveToBottom} className="gap-2">
                  <ArrowDown className="h-3.5 w-3.5" />
                  Move to Bottom
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export const ToolPicker = memo(function ToolPicker({
  islandLayout,
  transparentBackground,
  coloredIcons,
  orientation = "vertical",
  panelToolFilter,
  pinnedBottomTools,
  activeTools,
  onToggle,
  availableContextual,
  toolOrder,
  onReorder,
  projectPath,
  bottomTools,
  onMoveToBottom,
  onMoveToSide,
  taskProgress,
  toolInlineMeta,
}: ToolPickerProps) {
  const isHorizontal = orientation === "horizontal";
  const visibleContextual = useMemo(
    () => CONTEXTUAL_TOOLS.filter((t) => availableContextual?.has(t.id)),
    [availableContextual],
  );

  const orderedPanelTools = useMemo(
    () => toolOrder
      .filter((id) => id in PANEL_TOOLS_MAP && (!panelToolFilter || panelToolFilter.has(id)))
      .map((id) => PANEL_TOOLS_MAP[id]),
    [panelToolFilter, toolOrder],
  );

  const [dragOverId, setDragOverId] = useState<ToolId | null>(null);
  const [draggingId, setDraggingId] = useState<ToolId | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, toolId: ToolId) => {
    e.dataTransfer.setData("text/plain", toolId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(toolId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, toolId: ToolId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(toolId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toId: ToolId) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain") as ToolId;
    setDragOverId(null);
    setDraggingId(null);
    if (fromId && fromId !== toId) {
      onReorder(fromId, toId);
    }
  }, [onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
    setDraggingId(null);
  }, []);

  const handleOpenInEditor = useCallback(() => {
    if (projectPath) window.claude.openInEditor(projectPath);
  }, [projectPath]);

  const [editorMenuOpen, setEditorMenuOpen] = useState(false);

  const handleEditorContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setEditorMenuOpen(true);
  }, []);

  const handleOpenWithEditor = useCallback(
    (editor: string) => {
      if (projectPath) window.claude.openInEditor(projectPath, undefined, editor);
    },
    [projectPath],
  );

  const pickerClassName = isHorizontal
    ? "tool-picker no-drag relative flex shrink-0 flex-row items-center gap-0"
    : islandLayout
      ? `tool-picker ${transparentBackground ? "" : "island "}relative flex h-full shrink-0 flex-col items-center gap-1${transparentBackground ? "" : " rounded-[var(--island-radius)] bg-background"} pt-2.5 pb-2.5`
      : `tool-picker ${transparentBackground ? "" : "island "}relative flex h-full w-14 shrink-0 flex-col items-center gap-1.5${transparentBackground ? "" : " rounded-lg bg-background"} pt-3 pb-3`;
  const pickerStyle = !isHorizontal && islandLayout ? { width: "var(--tool-picker-strip-width)" } : undefined;

  const editorButtonSize = islandLayout
    ? (isHorizontal ? "h-8 w-8" : "h-9 w-9")
    : (isHorizontal ? "h-9 w-9" : "h-10 w-10");
  const editorIconSize = islandLayout ? "h-4 w-4" : "h-[18px] w-[18px]";
  const editorRadius = islandLayout ? "rounded-lg" : "rounded-[10px]";

  return (
    <div className={pickerClassName} style={pickerStyle}>
      {!isHorizontal && <div className="drag-region absolute inset-x-0 top-0 h-2" />}

      {visibleContextual.length > 0 && (
        <>
          {visibleContextual.map((tool) => {
            const hasTaskProgress = tool.id === "tasks" && taskProgress && taskProgress.total > 0;
            const progressFraction = hasTaskProgress ? taskProgress.completed / taskProgress.total : 0;
            const isComplete = hasTaskProgress ? taskProgress.completed === taskProgress.total : false;
            const ringSize = islandLayout ? 36 : 40;

            return (
              <div key={tool.id} className="relative">
                {hasTaskProgress && (
                  <ToolProgressRing progress={progressFraction} isComplete={isComplete} size={ringSize} />
                )}
                <ToolButton
                  tool={tool}
                  isActive={activeTools.has(tool.id)}
                  coloredIcons={coloredIcons}
                  islandLayout={islandLayout}
                  orientation={orientation}
                  onClick={() => onToggle(tool.id)}
                  tooltipExtra={hasTaskProgress ? (
                    <p className="text-[10px] text-background/50 tabular-nums">
                      {taskProgress.completed}/{taskProgress.total} completed
                    </p>
                  ) : undefined}
                />
              </div>
            );
          })}
          <div className={isHorizontal ? "mx-0.5 h-5" : `my-0.5 ${islandLayout ? "w-5" : "w-6"}`}>
            <div className={isHorizontal ? "h-full w-px bg-foreground/[0.08]" : "h-px w-full bg-foreground/[0.08]"} />
          </div>
        </>
      )}

      {orderedPanelTools.map((tool, index) => {
        const isPinnedBottom = pinnedBottomTools?.has(tool.id) ?? false;
        const isInBottom = isPinnedBottom || bottomTools.has(tool.id);
        return (
          <div key={tool.id} className="flex items-center">
            <PanelToolWithMenu
              tool={tool}
              isActive={activeTools.has(tool.id)}
              coloredIcons={coloredIcons}
              islandLayout={islandLayout}
            orientation={orientation}
            isDragTarget={dragOverId === tool.id && draggingId !== tool.id}
            isBottom={isInBottom}
            lockBottomPlacement={isPinnedBottom}
            inlineMeta={toolInlineMeta?.[tool.id]}
            onToggle={() => onToggle(tool.id)}
              onMoveToBottom={() => { if (!isPinnedBottom) onMoveToBottom(tool.id); }}
              onMoveToSide={() => { if (!isPinnedBottom) onMoveToSide(tool.id); }}
              onDragStart={(e) => handleDragStart(e, tool.id)}
              onDragOver={(e) => handleDragOver(e, tool.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, tool.id)}
              onDragEnd={handleDragEnd}
            />
            {isHorizontal && index < orderedPanelTools.length - 1 && (
              <div className="mx-1 h-4 w-px bg-foreground/[0.08]" />
            )}
          </div>
        );
      })}

      {projectPath && (
        <div className={isHorizontal ? "ms-1 flex items-center" : "mt-auto flex w-full flex-col items-center"}>
          <div className={isHorizontal ? "me-1 h-5" : `mb-1.5 ${islandLayout ? "w-5" : "w-6"}`}>
            <div className={isHorizontal ? "h-full w-px bg-foreground/[0.06]" : "h-px w-full bg-foreground/[0.06]"} />
          </div>
          <DropdownMenu open={editorMenuOpen} onOpenChange={(open) => { if (!open) setEditorMenuOpen(false); }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={handleOpenInEditor}
                    onContextMenu={handleEditorContextMenu}
                    className={`tool-picker-btn no-drag group/btn relative ${isHorizontal ? "" : "mx-auto "}flex ${editorButtonSize} items-center justify-center ${editorRadius} p-0 transition-all duration-200 cursor-pointer text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.05] active:scale-[0.92]`}
                  >
                    <SquareArrowOutUpRight
                      className={`${editorIconSize} transition-transform duration-200 group-hover/btn:scale-110`}
                      strokeWidth={1.5}
                    />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side={isHorizontal ? "bottom" : "left"} sideOffset={10}>
                <p className="text-xs font-medium">Open in Editor</p>
                <p className="text-[10px] text-background/50">Right-click for options</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side={isHorizontal ? "bottom" : "left"} align="end" sideOffset={10}>
              <DropdownMenuItem onClick={() => handleOpenWithEditor("cursor")}>
                Cursor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenWithEditor("code")}>
                VS Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenWithEditor("zed")}>
                Zed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
});
