"use client";

import { useState } from "react";
import { useCategories } from "@/lib/use-categories";

export default function CategoriasPage() {
  const { categories, loading, refresh } = useCategories();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2a9d8f");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Erro ao criar categoria.");
        return;
      }
      setName("");
      setColor("#2a9d8f");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "32px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Categorias</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          placeholder="Nome da categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
          }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 44, height: 38, border: "none", padding: 0 }}
        />
        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          style={{
            background: "#2a9d8f",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Adicionar
        </button>
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {categories.map((category) => (
            <li
              key={category.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: category.color,
                }}
              />
              {category.name}
            </li>
          ))}
          {categories.length === 0 && (
            <p style={{ color: "#64748b", fontSize: 13 }}>
              Nenhuma categoria ainda. Crie a primeira acima.
            </p>
          )}
        </ul>
      )}
    </main>
  );
}
