import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SignOutButton from "@/components/admin/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // O middleware já protege /admin, mas checamos de novo aqui (defesa em
  // profundidade) caso este layout seja alcançado por outra rota no futuro.
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "#0f172a",
          color: "#fff",
        }}
      >
        <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <strong style={{ fontSize: 14 }}>Painel — Parque Ecológico</strong>
          <Link href="/admin" style={navLinkStyle}>
            Mapa
          </Link>
          <Link href="/admin/categorias" style={navLinkStyle}>
            Categorias
          </Link>
          <Link href="/" style={navLinkStyle}>
            Ver site público
          </Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{session.user.name}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  textDecoration: "none",
};
