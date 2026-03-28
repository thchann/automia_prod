import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import signupHero from "@/assets/signup-hero.jpg";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login submitted:", form);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-[var(--font-heading)]">
              Welcome back
            </h1>
            <p className="mt-2 text-muted-foreground">
              Don't have an account?{" "}
              <a href="#" className="text-primary underline underline-offset-4 hover:opacity-80">
                Sign up
              </a>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-12 bg-muted/50 border-border placeholder:text-muted-foreground"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="h-12 bg-muted/50 border-border placeholder:text-muted-foreground pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm text-primary underline underline-offset-4 hover:opacity-80">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
            >
              Log in
            </Button>

            <div className="relative flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">Or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 gap-2 font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 gap-2 font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right panel — hero image */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden rounded-2xl m-4">
        <img
          src={signupHero}
          alt="Luxury car showroom at golden hour"
          className="absolute inset-0 w-full h-full object-cover"
          width={800}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white font-[var(--font-heading)]">
              Automia
            </h2>
            <Button
              variant="outline"
              className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm text-sm"
            >
              Back to website →
            </Button>
          </div>
          <div className="pb-12">
            <p className="text-3xl font-semibold text-white font-[var(--font-heading)] leading-tight">
              Automate Your Sales,
              <br />
              Accelerate Growth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
