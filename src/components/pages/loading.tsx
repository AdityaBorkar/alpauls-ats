import { Loader2 } from "lucide-react";

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <Loader2 className="mx-auto size-10 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}
