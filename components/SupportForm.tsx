"use client";

import { useState } from "react";

export function SupportForm() {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    message: "",
    category: "general",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setNotice("");

    try {
      const res = await fetch("/api/support/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setNotice(data.error || "Failed to submit support request");
        return;
      }

      setNotice("✓ Ticket submitted. We'll get back to you soon.");
      setFormData({ email: "", subject: "", message: "", category: "general" });
    } catch (err) {
      setNotice("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="page-panel">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Support</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Get help</h1>
        <p className="mt-2 text-sm text-ink-2">
          Tell us what's on your mind. We'll respond within 24 hours.
        </p>

        {notice && (
          <div className={`card mt-4 ${notice.startsWith("✓") ? "bg-cyan/10 border-cyan/30" : "bg-red/10 border-red/30"}`}>
            <p className={`text-sm ${notice.startsWith("✓") ? "text-cyan" : "text-red"}`}>{notice}</p>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="subject">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              className="input"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief summary (optional)"
            />
          </div>

          <div>
            <label className="label" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              name="category"
              className="input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="general">General</option>
              <option value="bug">Bug Report</option>
              <option value="feature_request">Feature Request</option>
              <option value="billing">Billing</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              minLength={10}
              className="input min-h-32"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Tell us more..."
            />
          </div>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit"}
          </button>
        </form>

        <p className="mt-6 text-xs text-ink-3 text-center">
          For urgent issues, email us directly at <a href="mailto:support@lyrixis.dev" className="text-cyan hover:underline">support@lyrixis.dev</a>
        </p>
      </div>
    </div>
  );
}
