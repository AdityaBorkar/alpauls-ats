import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <FileQuestion className="mx-auto size-16 text-muted-foreground" />
        <h1 className="mt-6 font-bold text-6xl text-foreground">404</h1>
        <p className="mt-4 text-gray-700 text-xl">Page not found</p>
        <p className="mt-2 text-gray-400 text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button
          className="mt-8"
          onClick={() => navigate({ to: "/" })}
          variant="outline"
        >
          <ArrowLeft className="size-4" />
          Go Home
        </Button>
      </div>
    </div>
  );
}
