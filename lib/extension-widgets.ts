import type { ExtensionWidgetItem } from "@/lib/types";

export function updateExtensionWidgets(
  widgets: ExtensionWidgetItem[],
  key: string,
  lines: string[] | null | undefined,
  placement: ExtensionWidgetItem["placement"] = "aboveEditor",
): ExtensionWidgetItem[] {
  if (!Array.isArray(lines) || !lines.every((line) => typeof line === "string")) {
    return widgets.filter((widget) => widget.key !== key);
  }

  const updatedWidget = { key, lines, placement };
  const existingIndex = widgets.findIndex((widget) => widget.key === key);
  if (existingIndex === -1) return [...widgets, updatedWidget];

  return widgets.map((widget, index) => index === existingIndex ? updatedWidget : widget);
}
