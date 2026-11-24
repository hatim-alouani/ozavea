import { Suspense } from "react";
import LoginForm from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7F5EF] px-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}