"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      style={{
        background: "transparent",
        border: "1px solid #334155",
        color: "#e2e8f0",
        borderRadius: 6,
        padding: "6px 12px",
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      Sair
    </button>
  );
}
