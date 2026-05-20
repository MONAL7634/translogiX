"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateField = (field: keyof LoginInput, value: string) => {
    const result = loginSchema.shape[field].safeParse(value);
    if (!result.success) {
      setErrors((prev) => ({ ...prev, [field]: result.error.issues[0].message }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginInput;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError("Invalid credentials");
        setLoading(false);
        return;
      }

      // The sign-in response includes user data with role
      const role = data?.user?.role;
      let homePath = "/customer";

      switch (role) {
        case "ADMIN":
          homePath = "/admin";
          break;
        case "TRANSPORTER":
          homePath = "/transporter";
          break;
        case "DRIVER":
          homePath = "/driver";
          break;
        case "CUSTOMER":
          homePath = "/customer";
          break;
        default:
          homePath = "/customer";
      }
      router.push(homePath);
      router.refresh();
      setLoading(false);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <MapPin className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">TransLogiX</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {serverError && (
                <div className="rounded-md bg-destructive/15 px-4 py-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, email: e.target.value }));
                    if (errors.email) validateField("email", e.target.value);
                  }}
                  onBlur={() => validateField("email", form.email)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  disabled={loading}
                  autoComplete="email"
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, password: e.target.value }));
                    if (errors.password) validateField("password", e.target.value);
                  }}
                  onBlur={() => validateField("password", form.password)}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  disabled={loading}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
