import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { API, apiFetch } from "@/lib/api";
import { Badge, Button, Card, Container, Field, H1, H2 } from "@/components/ui";

// Default to Anvil account #1 (pre-funded test address)
const DEFAULT_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

export default function Investor() {
  const [addr, setAddr] = useState<string>(DEFAULT_ADDR);
  const [risk, setRisk] = useState<"green" | "yellow" | "red">("green");
  const [balance, setBalance] = useState<string>("0");
  const [amount, setAmount] = useState("1000000000000000000"); // 1e18

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const riskRes = await fetch(API("/risk"));
      if (riskRes.ok) {
        const { status } = await riskRes.json();
        setRisk((status as "green" | "yellow" | "red") ?? "green");
      }

      if (addr) {
        const balRes = await fetch(API(`/token/balance/${addr}`));
        if (balRes.ok) {
          const { balance: b } = await balRes.json();
          setBalance(String(b));
        }
      }
    } catch {
      setMsg({ type: "err", text: "API not reachable. Is @ots/api running on :3001?" });
    }
  }, [addr]);

  async function subscribe() {
    if (!addr) return setMsg({ type: "err", text: "Enter a wallet address first." });
    setBusy(true);
    setMsg({ type: "info", text: "Submitting subscription..." });

    try {
      const res = await apiFetch("/token/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: addr, amount }),
      });

      const data = await res.json();
      if (res.ok) {
        await refresh();
        setMsg({ type: "ok", text: `Subscribed. Tx: ${data.tx}` });
      } else {
        setMsg({ type: "err", text: `Subscription failed: ${JSON.stringify(data.error)}` });
      }
    } catch {
      setMsg({ type: "err", text: "Subscription failed (network/API error)." });
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    if (!addr) return setMsg({ type: "err", text: "Enter a wallet address first." });
    setBusy(true);
    setMsg({ type: "info", text: "Submitting redemption..." });

    try {
      const res = await apiFetch("/token/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: addr, amount }),
      });

      const data = await res.json();
      if (res.ok) {
        await refresh();
        setMsg({ type: "ok", text: `Redeemed. Tx: ${data.tx}` });
      } else {
        setMsg({ type: "err", text: `Redeem failed: ${JSON.stringify(data.error)}` });
      }
    } catch {
      setMsg({ type: "err", text: "Redeem failed (network/API error)." });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  const msgStyle =
    msg?.type === "ok"
      ? "bg-green-50 text-green-800 border-green-200"
      : msg?.type === "err"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-gray-50 text-gray-800 border-gray-200";

  return (
    <Container>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <H1>Investor Portal</H1>
          <p className="text-sm text-gray-600">
            Simulate subscription (mint) and redemption (burn) against the local contracts.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          ← Home
        </Link>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${msgStyle}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account card */}
        <div className="lg:col-span-1">
          <Card>
            <H2>Account</H2>
            <div className="space-y-2">
              <Field label="Risk" value={<Badge tone={risk}>{risk}</Badge>} />
              <Field label="Balance (wei)" value={<code className="text-xs break-all">{balance}</code>} />
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-medium text-gray-600">Wallet Address</label>
              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/30"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                placeholder="0x..."
              />
            </div>

            <div className="mt-3">
              <Button variant="ghost" onClick={refresh} disabled={busy}>
                Refresh
              </Button>
            </div>
          </Card>
        </div>

        {/* Action card */}
        <div className="lg:col-span-2">
          <Card>
            <H2>Subscribe / Redeem</H2>
            <p className="text-sm text-gray-600">
              Amount is in <b>wei</b> (1e18 = 1 token unit in this prototype).
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Amount (wei)
                </label>
                <input
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1000000000000000000"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={subscribe} disabled={busy}>
                  {busy ? "Working..." : "Mint (subscribe)"}
                </Button>
                <Button variant="ghost" onClick={redeem} disabled={busy}>
                  {busy ? "Working..." : "Burn (redeem)"}
                </Button>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <div className="font-semibold mb-1">What happens when you click?</div>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Mint</b>: API sends <code>{`{ to: addr, amount }`}</code> → FundToken.mint() on-chain</li>
                <li><b>Burn</b>: API sends <code>{`{ from: addr, amount }`}</code> → FundToken.burnFrom() on-chain</li>
                <li>Balance refresh reads on-chain balanceOf for the address above</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}