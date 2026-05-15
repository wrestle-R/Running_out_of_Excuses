"use client";

import { useEffect } from "react";

const ATTRIBUTION_LINE = "Copied from Russel's Run Blog";

function getTextControlSelection(target: EventTarget | null): string {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    return "";
  }

  const start = target.selectionStart ?? 0;
  const end = target.selectionEnd ?? 0;

  if (end <= start) {
    return "";
  }

  return target.value.slice(start, end);
}

export default function CopyAttribution() {
  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      const fromControl = getTextControlSelection(event.target);
      const selectedText = (fromControl || window.getSelection()?.toString() || "").trim();

      if (!selectedText || !event.clipboardData) {
        return;
      }

      const textWithAttribution = selectedText.endsWith(ATTRIBUTION_LINE)
        ? selectedText
        : `${selectedText}\n\n${ATTRIBUTION_LINE}`;

      event.preventDefault();
      event.clipboardData.setData("text/plain", textWithAttribution);
    };

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, []);

  return null;
}
