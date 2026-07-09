"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Drag-and-drop + file-picker intake for object uploads. Accepts any file type
 * (Apollo is a general object store); content-type is detected downstream.
 */
export function Dropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handle(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        dragging
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/60 hover:bg-accent/40"
      )}
    >
      <UploadCloud className="size-7 text-muted-foreground" />
      <p className="text-sm font-medium">
        Drag &amp; drop files here, or click to choose
      </p>
      <p className="text-xs text-muted-foreground">
        Any file type. Uploaded into the current prefix.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
    </div>
  );
}
