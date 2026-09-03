"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        background: "#0f172a",
        color: "#fff",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          padding: 32,
          borderRadius: 12,
          textAlign: "center",
          maxWidth: 360,
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>
          Painel — Parque Ecológico de Vilhena
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>
          Acesso restrito à equipe do IFRO. Entre com sua conta SUAP.
        </p>
        <button
          onClick={() => signIn("suap", { callbackUrl })}
          style={{
            background: "#2a9d8f",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 20px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Entrar com SUAP
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
