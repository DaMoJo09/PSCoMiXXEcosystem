import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message);
      }
      setSubmitted(true);
      toast.success("Check your email for reset instructions");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <img 
              src="/logo.png" 
              alt="Press Start CoMixx" 
              className="h-32 w-auto mx-auto"
            />
          </div>
          <Card className="bg-zinc-950 border-white/20 p-6 text-center space-y-4">
            <h2 className="text-xl font-bold text-white">Check Your Email</h2>
            <p className="text-zinc-400">
              If an account exists with {email}, we've sent password reset instructions.
            </p>
            <Link href="/login">
              <Button variant="outline" className="mt-4" data-testid="button-back-to-login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <img 
            src="/logo.png" 
            alt="Press Start CoMixx" 
            className="h-32 w-auto mx-auto"
          />
        </div>

        <Card className="bg-zinc-950 border-white/20 p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Forgot Password</h2>
            <p className="text-sm text-zinc-400">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="creator@pressstart.space"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-forgot-email"
                className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-zinc-200"
              disabled={isLoading}
              data-testid="button-send-reset"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white" data-testid="link-back-to-login">
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
