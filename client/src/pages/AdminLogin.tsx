import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { adminLogin } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter admin email");
      return;
    }
    
    if (!password.trim()) {
      toast.error("Please enter the admin password");
      return;
    }

    setIsLoading(true);
    try {
      await adminLogin(email, password);
      toast.success("Admin login successful");
      navigate("/admin");
    } catch (error: any) {
      toast.error(error.message || "Invalid admin credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 border-4 border-black bg-white shadow-hard">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-black mx-auto mb-4 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-display font-bold uppercase tracking-tight">Admin Access</h1>
            <p className="text-muted-foreground mt-2 text-sm font-mono">
              PRESS START GAMING INC
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Admin login form">
            <div className="space-y-2">
              <label htmlFor="admin-email" className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email"
                  className="pl-10 h-12 text-lg border-2 border-black focus:ring-0 focus:border-black"
                  data-testid="input-admin-email"
                  aria-required="true"
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="pl-10 pr-10 h-12 text-lg border-2 border-black focus:ring-0 focus:border-black"
                  data-testid="input-admin-password"
                  aria-required="true"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-black text-white hover:bg-zinc-800 font-bold text-lg uppercase tracking-wider mt-6"
              data-testid="button-admin-login"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  Authenticating...
                </span>
              ) : (
                "Access Admin Console"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              Authorized personnel only. All access is logged.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
