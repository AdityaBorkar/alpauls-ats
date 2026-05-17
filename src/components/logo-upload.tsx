import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { client } from "@/rpc/client";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];
const MAX_SIZE = 2 * 1024 * 1024;

type LogoUploadProps = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
};

export function LogoUpload({ value, onChange }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(file: File) {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Invalid file type. Use PNG, JPEG, SVG, or WebP.");
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("File too large. Maximum 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const { url, publicUrl } = await client.client.getUploadUrl({
        contentType: file.type,
        filename: file.name,
      });

      const uploadRes = await fetch(url, {
        body: file,
        headers: { "Content-Type": file.type },
        method: "PUT",
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      onChange(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleRemove() {
    onChange(null);
  }

  function handleClick() {
    inputRef.current?.click();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3">
          <img
            alt="Client logo"
            className="h-16 w-16 rounded-lg border object-contain p-1"
            src={value}
          />
          <Button onClick={handleRemove} size="sm" variant="outline">
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
      ) : (
        <button
          className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-muted-foreground/25 border-dashed transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
          onClick={handleClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          type="button"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-muted-foreground text-xs">
            {isUploading ? "Uploading..." : "Click or drag to upload logo"}
          </p>
        </button>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}

      <input
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}
