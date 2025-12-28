"use client";

import {
  RiInformationLine,
  RiErrorWarningLine,
  RiCheckboxCircleLine,
  RiLightbulbLine,
} from "@remixicon/react";
import { cx } from "@/lib/utils";

type CalloutType = "info" | "warning" | "success" | "tip";

interface CalloutBoxProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const calloutStyles: Record<
  CalloutType,
  { bg: string; border: string; icon: string; title: string }
> = {
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: "text-blue-500",
    title: "text-blue-400",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: "text-amber-500",
    title: "text-amber-400",
  },
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: "text-emerald-500",
    title: "text-emerald-400",
  },
  tip: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    icon: "text-purple-500",
    title: "text-purple-400",
  },
};

const calloutIcons: Record<CalloutType, React.ElementType> = {
  info: RiInformationLine,
  warning: RiErrorWarningLine,
  success: RiCheckboxCircleLine,
  tip: RiLightbulbLine,
};

const defaultTitles: Record<CalloutType, string> = {
  info: "Info",
  warning: "Warning",
  success: "Success",
  tip: "Tip",
};

export function CalloutBox({
  type = "info",
  title,
  children,
}: CalloutBoxProps) {
  const styles = calloutStyles[type];
  const Icon = calloutIcons[type];
  const displayTitle = title || defaultTitles[type];

  return (
    <div
      className={cx(
        "my-4 rounded-lg border p-4",
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cx("h-5 w-5 shrink-0 mt-0.5", styles.icon)} />
        <div className="flex-1 min-w-0">
          <p className={cx("font-semibold text-sm mb-1", styles.title)}>
            {displayTitle}
          </p>
          <div className="text-sm text-[var(--text-muted)] [&>p]:m-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
