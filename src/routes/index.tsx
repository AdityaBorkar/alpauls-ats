import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

import { getSession } from "./api/-auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
    return session;
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await authClient.phoneNumber.sendOtp({ phoneNumber });

    setLoading(false);

    if (res.error) {
      setError(res.error.message ?? "Failed to send OTP");
      return;
    }

    setStep("otp");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await authClient.phoneNumber.verify({ code, phoneNumber });

    setLoading(false);

    if (res.error) {
      setError(res.error.message ?? "Verification failed");
      return;
    }

    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="rise-in w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-bold text-2xl">Welcome</CardTitle>
          <CardDescription>Sign in with your phone number</CardDescription>
        </CardHeader>

        <CardContent>
          {step === "phone" ? (
            <form className="space-y-4" onSubmit={handleSendOtp}>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  autoComplete="tel"
                  disabled={loading}
                  id="phone"
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  type="tel"
                  value={phoneNumber}
                />
              </div>

              <p
                aria-live="polite"
                className="min-h-5 text-destructive text-sm"
              >
                {error}
              </p>

              <Button
                className="w-full"
                disabled={loading || !phoneNumber.trim()}
                size="lg"
                type="submit"
              >
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleVerify}>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  autoComplete="one-time-code"
                  className="text-center font-mono text-lg tracking-widest"
                  disabled={loading}
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  required
                  type="text"
                  value={code}
                />
                <p className="text-muted-foreground text-xs">
                  OTP sent to {phoneNumber}
                </p>
              </div>

              <p
                aria-live="polite"
                className="min-h-5 text-destructive text-sm"
              >
                {error}
              </p>

              <Button
                className="w-full"
                disabled={loading || !code.trim()}
                size="lg"
                type="submit"
              >
                {loading ? "Verifying..." : "Verify"}
              </Button>

              <Button
                className="w-full"
                disabled={loading}
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                }}
                type="button"
                variant="link"
              >
                Use a different number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
