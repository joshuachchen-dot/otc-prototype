import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button, Card, Container, H1 } from "@/components/ui";

export default function Auditor() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch("/audit/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e.message ?? "Download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container>
      <H1>Auditor View</H1>
      <Card>
        <p className="mb-4 text-sm text-gray-600">
          Export all on-chain &amp; off-chain actions as CSV for reconciliation.
        </p>
        {err && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
          </div>
        )}
        <Button onClick={download} disabled={busy}>
          {busy ? "Exporting…" : "Download CSV Export"}
        </Button>
      </Card>
    </Container>
  );
}
