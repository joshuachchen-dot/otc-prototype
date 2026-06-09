import Head from "next/head";
import { useState } from "react";

const ROLES = [
  "Asset Manager / Fund Manager",
  "Prime Broker / Settlement Agent",
  "Fund Administrator",
  "Institutional Investor / LP",
  "Compliance Officer",
  "Auditor",
  "Technology / Integration Partner",
  "Other",
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", institution: "", email: "", role: "", aum: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #e5e5ea",
    fontSize: 14,
    color: "#1d1d1f",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <>
      <Head>
        <title>Request Access — Archon</title>
        <meta name="description" content="Request early access to the Archon on-chain OTC settlement platform." />
      </Head>

      <div style={{ background: "linear-gradient(180deg,#fff 0%,#f5f5f7 100%)", minHeight: "100vh" }}>
        <div className="max-w-4xl mx-auto" style={{ padding: "72px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 56 }}>
            <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-4" style={{ color: "#c0c0c8" }}>Early access</p>
            <h1 className="font-extrabold text-[#1d1d1f] animate-fade-up" style={{ fontSize: 48, letterSpacing: -1.6, lineHeight: 1.08, marginBottom: 16 }}>
              Request access<br />
              <span style={{ color: "#86868b" }}>to the platform.</span>
            </h1>
            <p className="text-[16px] leading-relaxed" style={{ color: "#86868b", maxWidth: 480 }}>
              Archon is currently in private beta. Tell us about your institution and use case and we'll be in touch within 2 business days.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 48, alignItems: "start" }}>

            {/* Form */}
            {submitted ? (
              <div style={{ background: "#fff", borderRadius: 22, padding: 48, border: "1px solid #e5e5ea", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>
                  ✓
                </div>
                <h2 className="font-bold text-[#1d1d1f]" style={{ fontSize: 22, marginBottom: 10 }}>Request received.</h2>
                <p style={{ color: "#86868b", fontSize: 14 }}>
                  We'll review your details and follow up at <strong>{form.email}</strong> within 2 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 22, padding: 40, border: "1px solid #e5e5ea", display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="text-[12px] font-semibold" style={{ color: "#555", display: "block", marginBottom: 6 }}>Full name *</label>
                    <input required name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold" style={{ color: "#555", display: "block", marginBottom: 6 }}>Work email *</label>
                    <input required type="email" name="email" value={form.email} onChange={handleChange} placeholder="jane@institution.com" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold" style={{ color: "#555", display: "block", marginBottom: 6 }}>Institution *</label>
                  <input required name="institution" value={form.institution} onChange={handleChange} placeholder="Acme Capital Management" style={inputStyle} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="text-[12px] font-semibold" style={{ color: "#555", display: "block", marginBottom: 6 }}>Your role *</label>
                    <select required name="role" value={form.role} onChange={handleChange} style={inputStyle}>
                      <option value="">Select role…</option>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold" style={{ color: "#555", display: "block", marginBottom: 6 }}>AUM under management</label>
                    <select name="aum" value={form.aum} onChange={handleChange} style={inputStyle}>
                      <option value="">Prefer not to say</option>
                      <option>Under $50M</option>
                      <option>$50M – $500M</option>
                      <option>$500M – $5B</option>
                      <option>Over $5B</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold" style={{ color: "#555", display: "block", marginBottom: 6 }}>Tell us about your use case</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={4}
                    placeholder="We're a tokenized credit fund looking for a compliant OTC settlement layer for our secondary market…"
                    style={{ ...inputStyle, resize: "vertical" as const }}
                  />
                </div>

                <button
                  type="submit"
                  className="font-semibold text-white transition-transform hover:-translate-y-0.5"
                  style={{ padding: "14px", borderRadius: 12, background: "#1d1d1f", border: "none", cursor: "pointer", fontSize: 15 }}
                >
                  Submit request →
                </button>
              </form>
            )}

            {/* Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#0d1117", borderRadius: 22, padding: 28 }}>
                <p className="font-bold text-white" style={{ fontSize: 15, marginBottom: 16 }}>What happens next</p>
                {[
                  { n: "1", text: "We review your request and institution within 1 business day" },
                  { n: "2", text: "A team member reaches out to schedule a 30-minute technical walkthrough" },
                  { n: "3", text: "You receive sandbox credentials scoped to your role" },
                  { n: "4", text: "We support your integration with dedicated technical onboarding" },
                ].map((s) => (
                  <div key={s.n} className="flex gap-3 mb-3">
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1a2332", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="text-[10px] font-bold" style={{ color: "#00c9a7" }}>{s.n}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{s.text}</p>
                  </div>
                ))}
              </div>

              <div style={{ background: "#fff", borderRadius: 22, padding: 28, border: "1px solid #e5e5ea" }}>
                <p className="font-bold text-[#1d1d1f]" style={{ fontSize: 14, marginBottom: 14 }}>Already have a question?</p>
                <p style={{ fontSize: 13, color: "#86868b", marginBottom: 12 }}>Reach us directly for technical or compliance inquiries.</p>
                <a href="mailto:contact@archon.finance" className="text-[13px] font-semibold no-underline" style={{ color: "#1d1d1f" }}>
                  contact@archon.finance →
                </a>
              </div>

              <div style={{ background: "#f5f5f7", borderRadius: 18, padding: "18px 22px", border: "1px solid #e5e5ea" }}>
                <p style={{ fontSize: 12, color: "#86868b", lineHeight: 1.6 }}>
                  Archon is designed for institutional participants only. Access is subject to review and onboarding. All submitted information is treated confidentially.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
