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
    parentalConsent: false,
  });

  useEffect(() => {
    if (isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const ssoRedirect = params.get("sso_redirect");
      if (ssoRedirect) {
        window.location.href = `/api/auth/sso/authorize?redirect_uri=${encodeURIComponent(ssoRedirect)}&app=${encodeURIComponent(params.get("sso_app") || "")}`;
        return;
      }
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
  const accountTypePreview = age !== null ? (age >= 18 ? "Creator" : age >= 13 ? "Student" : null) : null;
  const isUnder13 = age !== null && age < 13;

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
    if (age !== null && age < 13) {
      toast.error("Public sign-up is for ages 13 and up. Ask your teacher to invite you through a classroom.");
      return;
    }
    if (signupData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (!/[a-zA-Z]/.test(signupData.password) || !/[0-9]/.test(signupData.password)) {
      toast.error("Password must contain at least one letter and one number");
      return;
    }
    if (age !== null && age < 18 && !signupData.parentalConsent) {
      toast.error("Parental or guardian consent is required for students under 18");
      return;
    }
    setIsLoading(true);
    try {
      await signup(signupData.email, signupData.password, signupData.name, signupData.dateOfBirth, signupData.parentalConsent);
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
    <div className="min-h-screen bg-black flex items-start justify-center p-4 sm:p-6 sm:items-center overflow-y-auto">
      <div className="w-full max-w-md space-y-6 sm:space-y-8 py-6 sm:py-10">
        <div className="text-center space-y-3 sm:space-y-4">
          <img 
            src="/logo.png" 
            alt="Press Start CoMixx" 
            className="h-20 sm:h-32 w-auto mx-auto"
          />
          <p className="text-base sm:text-xl text-zinc-400">Creator Platform</p>
        </div>

        <Card className="bg-zinc-950 border-white/20 p-4 sm:p-6">
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
              <div className="mb-4 p-3 bg-zinc-900 border border-zinc-700 rounded">
                <button
                  type="button"
                  onClick={() => {
                    const domain = prompt("Enter your school or organization email domain (e.g., school.edu):");
                    if (domain) {
                      window.location.href = `/api/auth/sso/login?domain=${encodeURIComponent(domain)}`;
                    }
                  }}
                  className="w-full py-2 px-4 bg-zinc-800 border-2 border-zinc-600 text-white font-bold hover:border-white transition-colors flex items-center justify-center gap-2"
                  data-testid="button-sso-login"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  SIGN IN WITH SSO
                </button>
                <p className="text-xs text-zinc-500 mt-1 text-center">For schools and organizations with SSO configured</p>
              </div>

              <div className="relative mb-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-700" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-zinc-950 px-2 text-zinc-500">OR</span></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="creator@pscomixx.com"
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
                    placeholder="creator@pscomixx.com"
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
                        : "Student Account (13-17) - Create and learn"}
                    </div>
                  )}
                  {isUnder13 && (
                    <div className="mt-2 p-3 border border-red-500/40 bg-red-500/5 rounded space-y-2" data-testid="section-under-13-block">
                      <p className="text-sm text-red-300 font-semibold">Public sign-up is for ages 13 and up.</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        If you're a student under 13, your teacher needs to invite you through a classroom — we don't collect data from kids under 13 on the public site. Parents and educators can reach us at <span className="text-cyan-400">support@pscomixx.com</span>.
                      </p>
                    </div>
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
                    minLength={8}
                    data-testid="input-signup-password"
                    className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500"
                  />
                  <p className="text-[10px] text-muted-foreground">Min 8 characters, at least one letter and one number</p>
                </div>
                {age !== null && age < 18 && age >= 13 && (
                  <div className="flex items-start gap-2 p-3 border border-yellow-500/30 bg-yellow-500/5" data-testid="section-parental-consent">
                    <input
                      type="checkbox"
                      id="parental-consent"
                      checked={signupData.parentalConsent}
                      onChange={(e) => setSignupData({ ...signupData, parentalConsent: e.target.checked })}
                      className="mt-0.5 accent-yellow-500"
                      data-testid="input-parental-consent"
                    />
                    <label htmlFor="parental-consent" className="text-xs text-yellow-300 leading-relaxed">
                      I confirm that a parent or legal guardian has reviewed and consents to the creation of this Student Account, in accordance with COPPA requirements.
                    </label>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={isLoading || isUnder13}
                  data-testid="button-signup"
                  aria-busy={isLoading}
                >
                  {isLoading ? "Creating account..." : accountTypePreview ? `Sign Up as ${accountTypePreview}` : "Sign Up"}
                </Button>
              </form>

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
