import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, RotateCw, Send } from "lucide-react";
import posthog from "posthog-js";

import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export function ErrorPage({ error, reset }: ErrorPageProps) {
  const navigate = useNavigate();

  function handleFeedback() {
    posthog.capture("feedback_submitted", {
      error: error.message,
      source: "error_page",
      url: typeof window !== "undefined" ? window.location.href : "",
    });
  }

  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <AlertTriangle className="mx-auto size-16 text-destructive" />
        <h1 className="mt-6 font-bold text-6xl text-foreground">Error</h1>
        <p className="mt-4 text-gray-700 text-xl">Something went wrong</p>
        <p className="mt-2 max-w-md text-gray-400 text-sm">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={handleFeedback} variant="outline">
            <Send className="size-4" />
            Submit Feedback
          </Button>
          <Button onClick={reset} variant="outline">
            <RotateCw className="size-4" />
            Try Again
          </Button>
          <Button onClick={() => navigate({ to: "/" })} variant="outline">
            <ArrowLeft className="size-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
