import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Luggage } from "lucide-react";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 pt-24 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
        <Luggage className="size-6" />
      </span>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Smart Packing Planner</h1>
        <p className="text-muted-foreground">Sign in to continue.</p>
      </div>
      <LoginForm />
    </div>
  );
}
