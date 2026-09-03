"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/types/models";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        setCategories(await response.json());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Busca inicial ao montar o hook — padrão comum de "fetch on mount".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  return { categories, loading, refresh };
}
