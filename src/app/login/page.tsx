import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 pt-16">
      <div>
        <h1 className="text-2xl font-semibold">Smart Packing Planner</h1>
        <p className="text-muted-foreground">Sign in to continue.</p>
      </div>
      <LoginForm />
    </div>
  );
}
