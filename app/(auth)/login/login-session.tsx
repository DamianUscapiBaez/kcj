import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import LoginForm from "./login-form";

// Lee la sesión (dato dinámico), por eso la página lo envuelve en <Suspense>.
export default async function LoginSession() {
  await connection();
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return <LoginForm />;
}
