"use client";

import { whenLabel, type HistoryItem } from "@/lib/history";

export default function ProgressCard({ items }: { items: HistoryItem[] }) {
  return (
    <section className="card">
      <h2>Your progress</h2>
      {items.length === 0 ? (
        <p className="status">Your attempts in both modes will appear here.</p>
      ) : (
        <div className="scroll" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Mode</th>
                <th>Text</th>
                <th className="num">Result</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 8).map((h) => (
                <tr key={h.d}>
                  <td>{whenLabel(h.d)}</td>
                  <td>{h.mode}</td>
                  <td>{h.label}</td>
                  <td className="num">{h.pct !== null ? `${h.pct}%` : h.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
