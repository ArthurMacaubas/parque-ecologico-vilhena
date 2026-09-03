"use client";

import dynamic from "next/dynamic";

const AdminMap = dynamic(() => import("@/components/admin/AdminMap"), {
  ssr: false,
});

export default function AdminPage() {
  return <AdminMap />;
}
