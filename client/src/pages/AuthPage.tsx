import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function AuthPage() {
  const { login, signup, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    name: "",
    dateOfBirth: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  function getAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  const age = signupData.dateOfBirth ? getAge(signupData.dateOfBirth) : null;
  const accountTypePreview = age !== null ? (age >= 18 ? "Creator" : age >= 6 ? "Student" : null) : null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast.success("Welcome back to Press Start CoMixx");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!signupData.dateOfBirth) {
      toast.error("Please enter your date of birth");
      return;
    }
    if (age !== null && age < 6) {
      toast.error("You must be at least 6 years old to sign up");
      return;
    }
    setIsLoading(true);
    try {
      await signup(signupData.email, signupData.password, signupData.name, signupData.dateOfBirth);
      const type = age !== null && age >= 18 ? "Creator" : "Student";
      toast.success(`Welcome to Press Start CoMixx! You're signed up as a ${type}.`);
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
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
          <p className="text-xl text-zinc-400">Creator Platform</p>
        </div>

        <Card className="bg-zinc-950 border-white/20 p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
              <TabsTrigger
                value="login"
                data-testid="tab-login"
                className="data-[state=active]:bg-white data-[state=active]:text-black"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                data-testid="tab-signup"
                className="data-[state=active]:bg-white data-[state=active]:text-black"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="creator@pressstart.space"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    required
                    data-testid="input-login-email"
                    className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-white">
                    Password
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                    data-testid="input-login-password"
                    className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500"
                    aria-required="true"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={isLoading}
                  data-testid="button-login"
                  aria-busy={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
                <div className="text-center">
                  <Link href="/forgot-password" className="text-sm text-zinc-400 hover:text-white" data-testid="link-forgot-password">
                    Forgot your password?
                  </Link>
                </div>
              </form>

            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-white">
                    Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your name"
                    value={signupData.name}
                    onChange={(e) =>
                      setSignupData({ ...signupData, name: e.target.value })
                    }
                    required
                    data-testid="input-signup-name"
                    className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="creator@pressstart.space"
                    value={signupData.email}
                    onChange={(e) =>
                      setSignupData({ ...signupData, email: e.target.value })
                    }
                    required
                    data-testid="input-signup-email"
                    className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-dob" className="text-white">
                    Date of Birth
                  </Label>
                  <Input
                    id="signup-dob"
                    type="date"
                    value={signupData.dateOfBirth}
                    onChange={(e) =>
                      setSignupData({ ...signupData, dateOfBirth: e.target.value })
                    }
                    required
                    data-testid="input-signup-dob"
                    className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500"
                    max={new Date().toISOString().split("T")[0]}
                  />
                  {accountTypePreview && (
                    <div className={`text-xs mt-1 px-2 py-1 rounded inline-block ${
                      accountTypePreview === "Creator" 
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                        : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    }`}
                    data-testid="text-account-type-preview"
                    >
                      {accountTypePreview === "Creator" 
                        ? "Creator Account (18+) - Full access with monetization" 
                        : "Student Account (6-17) - Create and learn"}
                    </div>
                  )}
                  {age !== null && age < 6 && (
                    <p className="text-xs text-red-400 mt-1">Must be at least 6 years old to sign up</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-white">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupData.password}
                    onChange={(e) =>
                      setSignupData({ ...signupData, password: e.target.value })
                    }
                    required
                    data-testid="input-signup-password"
                    className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={isLoading || (age !== null && age < 6)}
                  data-testid="button-signup"
                  aria-busy={isLoading}
                >
                  {isLoading ? "Creating account..." : accountTypePreview ? `Sign Up as ${accountTypePreview}` : "Sign Up"}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-950 px-2 text-zinc-500">Or sign up with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-zinc-800 flex items-center justify-center gap-2"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-google-signup"
                aria-label="Sign up with Google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </Button>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center text-sm text-zinc-500">
          Part of the Press Start CoMixx Ecosystem
        </div>
      </div>
    </div>
  );
}
