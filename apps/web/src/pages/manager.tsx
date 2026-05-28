import { useEffect, useState } from "react";
import { API, apiFetch } from "@/lib/api";
import { Button, Card, Container, Field, H1, H2 } from "@/components/ui";

export default function Manager() {
  const [nav, setNav] = useState("123456789");
  const [asOf, setAsOf] = useState(String(Math.floor(Date.now()/1000)));
  const [latest, setLatest] = useState<{nav:string; asOf:string; storedAt:string}|null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function postNAV() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch("/nav/post", {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({ nav, asOf: Number(asOf) }),
      });
      const data = await res.json();
      if (res.ok) {
        await load();
        setMsg({ type: "ok", text: `NAV posted. Tx: ${data.tx}` });
      } else {
        setMsg({ type: "err", text: `Post failed: ${JSON.stringify(data.error)}` });
      }
    } catch {
      setMsg({ type: "err", text: "Post failed (network/API error)." });
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    const r = await fetch(API("/nav/latest"));
    if (r.ok) setLatest(await r.json());
  }

  useEffect(() => { load(); }, []);

  return (
    <Container>
      <H1>Manager Console</H1>

      {msg && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
          msg.type === "ok"
            ? "bg-green-50 text-green-800 border-green-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <H2>Post NAV</H2>
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <div className="w-full">
              <label className="mb-1 block text-xs font-medium text-gray-600">NAV (integer, scaled × 1e6)</label>
              <input className="w-full rounded-xl border px-3 py-2 text-sm"
                     placeholder="e.g. 2000000000"
                     value={nav} onChange={e=>setNav(e.target.value)} />
            </div>
            <div className="w-full">
              <label className="mb-1 block text-xs font-medium text-gray-600">asOf (Unix timestamp)</label>
              <input className="w-full rounded-xl border px-3 py-2 text-sm"
                     placeholder="e.g. 1710000000"
                     value={asOf} onChange={e=>setAsOf(e.target.value)} />
            </div>
            <div className="pt-5">
              <Button onClick={postNAV} disabled={busy}>{busy ? "Posting…" : "Post NAV"}</Button>
            </div>
          </div>
        </Card>

        <Card>
          <H2>Latest NAV</H2>
          {latest ? (
            <div className="space-y-1">
              <Field label="nav" value={latest.nav} />
              <Field label="asOf" value={latest.asOf} />
              <Field label="storedAt" value={latest.storedAt} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">No NAV posted yet.</p>
          )}
        </Card>
      </div>
    </Container>
  );
}