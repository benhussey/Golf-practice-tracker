import { useState, useEffect } from "react";

const STORAGE_KEY = "golf-sessions-v2";
const DRAFT_KEY = "golf-draft-v1";
const LEGACY_KEYS = ["golf-sessions-v1", "golf_practice_sessions_v2"];
const CHIP_MAX = 9;
const PUTT_MAX = 8;
const DRIVE_MAX = 10;

function getTodayStr() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Light palette score colors
function scoreColor(val, max) {
  const p = val / max;
  if (p >= 0.78) return "#2e9e5b";   // strong green
  if (p >= 0.55) return "#7ca838";   // olive
  if (p >= 0.33) return "#d99e2b";   // amber
  return "#d96a4a";                   // terracotta
}

async function loadSessions() {
  // Load current v2 sessions
  let current = [];
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) current = JSON.parse(v);
  } catch {}

  // Merge any legacy data that isn't already present
  let merged = [...current];
  for (const key of LEGACY_KEYS) {
    try {
      const v = localStorage.getItem(key);
      if (!v) continue;
      const old = JSON.parse(v);
      for (const s of old) {
        if (merged.some(m => m.ts === s.ts)) continue; // already have it
        // Old format had single scores per session; convert to rep groups
        if (!s.reps) {
          const reps = { drive: [], chip: [], putt: [], lag: [] };
          if (s.drive != null) reps.drive.push({ score: s.drive, miss: s.miss, id: s.ts + 0.1 });
          if (s.chip != null) reps.chip.push({ score: s.chip, club: s.chipClub, diff: s.chipDiff, id: s.ts + 0.2 });
          if (s.putt != null) reps.putt.push({ score: s.putt, feet: s.puttFeet, id: s.ts + 0.3 });
          if (s.lag != null) reps.lag.push({ score: s.lag, feet: s.lagFeet, id: s.ts + 0.4 });
          merged.push({ ts: s.ts, date: s.date, reps, notes: s.notes || "" });
        } else {
          merged.push(s);
        }
      }
    } catch {}
  }

  // Sort newest first
  merged.sort((a, b) => b.ts - a.ts);

  // Persist the merged set so legacy data is now permanently in v2
  if (merged.length !== current.length) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
  }
  return merged;
}
async function saveSessions(sessions) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch (e) { console.error(e); }
}

async function loadDraft() {
  try {
    const v = localStorage.getItem(DRAFT_KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}
async function saveDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}
async function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

const DRILL_META = {
  drive: { label: "Fairway Finder", icon: "🎯", color: "#c8892b", soft: "#f5ead2", max: DRIVE_MAX },
  chip:  { label: "9-Ball Chip",    icon: "🪄", color: "#4e9e57", soft: "#e3f1e2", max: CHIP_MAX },
  putt:  { label: "Circle Putt",    icon: "⛳", color: "#3a9e8c", soft: "#dcf0eb", max: PUTT_MAX },
  lag:   { label: "Lag Putt",       icon: "📏", color: "#5a8ec0", soft: "#e0ecf6", max: PUTT_MAX },
};

// theme tokens
const T = {
  bg: "#f5f3ec",
  card: "#ffffff",
  cardBorder: "#e6e2d6",
  ink: "#2c3a2e",
  inkSoft: "#6f7d6c",
  inkFaint: "#9aa697",
  field: "#faf8f2",
  accent: "#4e9e57",
  font: "'Georgia', serif",
};

// ── helpers ──
function Sparkline({ data, max, color }) {
  if (data.length < 2) return null;
  const W = 84, H = 30, pad = 3;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v / max) * (H - pad * 2));
    return `${x},${y}`;
  });
  const last = pts.at(-1).split(",");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

function ScorePicker({ max, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {Array.from({ length: max + 1 }, (_, i) => {
        const sel = value === i;
        const c = sel ? scoreColor(i, max) : null;
        return (
          <button key={i} onClick={() => onChange(sel ? null : i)} style={{
            width: 44, height: 44, borderRadius: 12,
            border: sel ? `2px solid ${c}` : `1px solid ${T.cardBorder}`,
            background: sel ? `${c}1a` : T.field,
            color: sel ? c : T.inkFaint,
            fontFamily: T.font, fontSize: 16, cursor: "pointer",
            fontWeight: sel ? "bold" : "normal", transition: "all 0.15s",
          }}>{i}</button>
        );
      })}
    </div>
  );
}

function OptionRow({ options, value, onChange, color }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(({ val, label }) => {
        const sel = value === val;
        return (
          <button key={val} onClick={() => onChange(sel ? null : val)} style={{
            padding: "9px 14px", borderRadius: 10, cursor: "pointer",
            fontFamily: T.font, fontSize: 13,
            border: sel ? `2px solid ${color}` : `1px solid ${T.cardBorder}`,
            background: sel ? `${color}18` : T.field,
            color: sel ? color : T.inkSoft,
            fontWeight: sel ? "bold" : "normal", transition: "all 0.15s",
          }}>{label}</button>
        );
      })}
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 3px rgba(60,70,55,0.04)", ...style }}>{children}</div>;
}

function CardLabel({ icon, title, subtitle, color, soft, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: soft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: "bold", color: T.ink, letterSpacing: 0.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function SectionDivider({ icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 8 }}>
      <div style={{ fontSize: 14 }}>{icon}</div>
      <div style={{ fontSize: 11, color: T.inkSoft, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold" }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: T.cardBorder }} />
    </div>
  );
}

function StatBox({ label, val, sub, color }) {
  return (
    <div style={{ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "12px 8px", textAlign: "center", boxShadow: "0 1px 3px rgba(60,70,55,0.04)" }}>
      <div style={{ fontSize: 21, fontWeight: "bold", color, lineHeight: 1.1 }}>{val}</div>
      {sub && <div style={{ fontSize: 11, color: T.inkFaint, marginTop: 1 }}>{sub}</div>}
      <div style={{ fontSize: 9.5, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Bar({ val, max, color, label }) {
  return (
    <div style={{ flex: 1 }}>
      {label && <div style={{ fontSize: 10, color: T.inkFaint, marginBottom: 3 }}>{label}</div>}
      <div style={{ height: 7, background: "#ece8dd", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${(val / max) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function RepChip({ rep, color, max, onRemove }) {
  const detail = [rep.club, rep.diff, rep.feet ? `${rep.feet}′` : null, rep.miss].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.field, border: `1px solid ${color}33`, borderRadius: 10, padding: "7px 8px 7px 12px" }}>
      <span style={{ fontSize: 16, fontWeight: "bold", color: scoreColor(rep.score, max) }}>{rep.score}<span style={{ fontSize: 10, color: T.inkFaint }}>/{max}</span></span>
      {detail && <span style={{ fontSize: 11.5, color: T.inkSoft }}>{detail}</span>}
      <button onClick={onRemove} style={{ marginLeft: "auto", background: "none", border: "none", color: T.inkFaint, cursor: "pointer", fontSize: 14, padding: "0 2px" }}>✕</button>
    </div>
  );
}

function AddRepButton({ onClick, disabled, color }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", marginTop: 14, padding: "11px 0",
      background: disabled ? T.field : `${color}14`,
      border: `1px solid ${disabled ? T.cardBorder : color + "55"}`,
      borderRadius: 11, color: disabled ? T.inkFaint : color,
      fontSize: 14, fontFamily: T.font, cursor: disabled ? "default" : "pointer",
      letterSpacing: 0.3, transition: "all 0.15s", fontWeight: disabled ? "normal" : "bold",
    }}>+ Add rep to session</button>
  );
}

// ── Main ──
export default function App() {
  const [tab, setTab] = useState("log");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reps, setReps] = useState({ drive: [], chip: [], putt: [], lag: [] });

  const [driveScore, setDriveScore] = useState(null);
  const [missTend, setMissTend] = useState(null);
  const [chipScore, setChipScore] = useState(null);
  const [chipClub, setChipClub] = useState(null);
  const [chipDiff, setChipDiff] = useState(null);
  const [puttScore, setPuttScore] = useState(null);
  const [puttFeet, setPuttFeet] = useState(null);
  const [lagScore, setLagScore] = useState(null);
  const [lagFeet, setLagFeet] = useState(null);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  function exportData() {
    const payload = { version: 2, exported: new Date().toISOString(), sessions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `golf-practice-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const incoming = Array.isArray(parsed) ? parsed : parsed.sessions;
        if (!Array.isArray(incoming)) throw new Error("bad format");
        // Merge by ts, no duplicates
        const merged = [...sessions];
        let added = 0;
        for (const s of incoming) {
          if (!merged.some(m => m.ts === s.ts)) { merged.push(s); added++; }
        }
        merged.sort((a, b) => b.ts - a.ts);
        await persist(merged);
        setImportMsg(`✓ Imported ${added} session${added !== 1 ? "s" : ""}`);
      } catch {
        setImportMsg("✕ Could not read that file");
      }
      setTimeout(() => setImportMsg(""), 4000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  useEffect(() => {
    (async () => {
      const [data, draft] = await Promise.all([loadSessions(), loadDraft()]);
      setSessions(data);
      if (draft) {
        if (draft.reps) setReps(draft.reps);
        if (draft.notes) setNotes(draft.notes);
      }
      setLoading(false);
    })();
  }, []);

  // Auto-save the in-progress session (reps + notes) any time they change
  useEffect(() => {
    if (loading) return;
    const total = reps.drive.length + reps.chip.length + reps.putt.length + reps.lag.length;
    if (total === 0 && !notes) {
      clearDraft();
    } else {
      saveDraft({ reps, notes });
    }
  }, [reps, notes, loading]);

  async function persist(updated) {
    setSessions(updated);          // update UI first
    await saveSessions(updated);   // always persist
  }

  function addRep(drill) {
    if (drill === "drive") {
      if (driveScore === null) return;
      setReps(r => ({ ...r, drive: [...r.drive, { score: driveScore, miss: missTend, id: Date.now() + Math.random() }] }));
      setDriveScore(null); setMissTend(null);
    } else if (drill === "chip") {
      if (chipScore === null) return;
      setReps(r => ({ ...r, chip: [...r.chip, { score: chipScore, club: chipClub, diff: chipDiff, id: Date.now() + Math.random() }] }));
      setChipScore(null); setChipClub(null); setChipDiff(null);
    } else if (drill === "putt") {
      if (puttScore === null) return;
      setReps(r => ({ ...r, putt: [...r.putt, { score: puttScore, feet: puttFeet, id: Date.now() + Math.random() }] }));
      setPuttScore(null); setPuttFeet(null);
    } else if (drill === "lag") {
      if (lagScore === null) return;
      setReps(r => ({ ...r, lag: [...r.lag, { score: lagScore, feet: lagFeet, id: Date.now() + Math.random() }] }));
      setLagScore(null); setLagFeet(null);
    }
  }

  function removeRep(drill, id) {
    setReps(r => ({ ...r, [drill]: r[drill].filter(x => x.id !== id) }));
  }

  const totalReps = reps.drive.length + reps.chip.length + reps.putt.length + reps.lag.length;

  async function handleSaveSession() {
    if (totalReps === 0) return;
    setSaving(true);
    const entry = { ts: Date.now(), date: getTodayStr(), reps, notes: notes.trim() };
    await persist([entry, ...sessions]);
    setReps({ drive: [], chip: [], putt: [], lag: [] });
    setNotes("");
    await clearDraft();
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function deleteSession(ts) {
    await persist(sessions.filter(s => s.ts !== ts));
  }

  const allRepsFor = drill => sessions.flatMap(s => (s.reps?.[drill] || [])).map(r => r.score);
  const flat = { drive: allRepsFor("drive"), chip: allRepsFor("chip"), putt: allRepsFor("putt"), lag: allRepsFor("lag") };
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const best = arr => arr.length ? Math.max(...arr) : null;

  const streak = (() => {
    if (!sessions.length) return 0;
    const days = [...new Set(sessions.map(s => s.date))];
    let count = 1;
    for (let i = 0; i < days.length - 1; i++) {
      const a = new Date(days[i]), b = new Date(days[i + 1]);
      if ((a - b) / 86400000 <= 1.5) count++; else break;
    }
    return count;
  })();

  const sessionTrend = (drill) => sessions.slice(0, 8).reverse().map(s => {
    const rs = s.reps?.[drill] || [];
    return rs.length ? rs.reduce((a, r) => a + r.score, 0) / rs.length : null;
  }).filter(v => v !== null);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.inkSoft, fontFamily: T.font }}>Loading…</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.ink, paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.cardBorder}`, padding: "20px 18px 0", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 8px rgba(60,70,55,0.05)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ fontSize: 24 }}>⛳</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: "bold", color: T.ink }}>Practice Tracker</div>
                <div style={{ fontSize: 10, color: T.inkFaint, letterSpacing: 1.5, textTransform: "uppercase" }}>Driving · Chipping · Putting</div>
              </div>
            </div>
            {streak > 1 && (
              <div style={{ background: "#fdf3df", border: "1px solid #ecd9a8", borderRadius: 20, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 14 }}>🔥</span>
                <span style={{ fontSize: 13, color: "#c8892b", fontWeight: "bold" }}>{streak}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex" }}>
            {[["log", "Log"], ["history", "History"], ["progress", "Progress"]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, background: "none", border: "none", cursor: "pointer", padding: "8px 0 12px",
                fontSize: 13.5, fontFamily: T.font,
                color: tab === t ? T.accent : T.inkFaint,
                borderBottom: tab === t ? `2px solid ${T.accent}` : "2px solid transparent",
                fontWeight: tab === t ? "bold" : "normal", marginBottom: -1,
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "18px 16px 0" }}>

        {/* ════ LOG ════ */}
        {tab === "log" && (
          <div>
            {totalReps > 0 && (
              <div style={{ background: "#eaf4e7", border: "1px solid #cfe6c8", borderRadius: 14, padding: "12px 15px", marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, color: T.accent, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3, fontWeight: "bold" }}>Current session</div>
                <div style={{ fontSize: 13.5, color: T.ink }}>
                  {totalReps} rep{totalReps !== 1 ? "s" : ""} logged
                  {["drive", "chip", "putt", "lag"].filter(d => reps[d].length).map(d => ` · ${reps[d].length} ${DRILL_META[d].label.split(" ")[0].toLowerCase()}`).join("")}
                </div>
              </div>
            )}

            <SectionDivider icon="🏌️‍♂️" label="Driving" />
            <Card>
              <CardLabel icon="🎯" title="Fairway Finder" subtitle="Hit 10 drives — count fairways found" color={DRILL_META.drive.color} soft={DRILL_META.drive.soft}
                right={reps.drive.length > 0 && <span style={{ fontSize: 12, color: DRILL_META.drive.color, background: DRILL_META.drive.soft, borderRadius: 12, padding: "3px 10px", fontWeight: "bold" }}>×{reps.drive.length}</span>} />
              <ScorePicker max={DRIVE_MAX} value={driveScore} onChange={setDriveScore} />
              <div style={{ marginTop: 13 }}>
                <div style={{ fontSize: 11, color: T.inkFaint, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Miss tendency</div>
                <OptionRow options={[{ val: "Left", label: "← Left" }, { val: "Straight", label: "● Straight" }, { val: "Right", label: "Right →" }]} value={missTend} onChange={setMissTend} color={DRILL_META.drive.color} />
              </div>
              <AddRepButton onClick={() => addRep("drive")} disabled={driveScore === null} color={DRILL_META.drive.color} />
              {reps.drive.length > 0 && <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>{reps.drive.map(rep => <RepChip key={rep.id} rep={rep} color={DRILL_META.drive.color} max={DRIVE_MAX} onRemove={() => removeRep("drive", rep.id)} />)}</div>}
            </Card>

            <SectionDivider icon="🪄" label="Chipping" />
            <Card>
              <CardLabel icon="🪄" title="9-Ball Chip Drill" subtitle="Count balls inside 3 ft of hole" color={DRILL_META.chip.color} soft={DRILL_META.chip.soft}
                right={reps.chip.length > 0 && <span style={{ fontSize: 12, color: DRILL_META.chip.color, background: DRILL_META.chip.soft, borderRadius: 12, padding: "3px 10px", fontWeight: "bold" }}>×{reps.chip.length}</span>} />
              <ScorePicker max={CHIP_MAX} value={chipScore} onChange={setChipScore} />
              <div style={{ marginTop: 13, display: "flex", flexDirection: "column", gap: 11 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.inkFaint, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Club</div>
                  <OptionRow options={[{ val: "60°", label: "60° Lob" }, { val: "56°", label: "56° Sand" }]} value={chipClub} onChange={setChipClub} color={DRILL_META.chip.color} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.inkFaint, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Lie difficulty</div>
                  <OptionRow options={[{ val: "Easy", label: "🟢 Easy" }, { val: "Medium", label: "🟡 Medium" }, { val: "Hard", label: "🔴 Hard" }, { val: "Land Short", label: "💧 Short" }]} value={chipDiff} onChange={setChipDiff} color={DRILL_META.chip.color} />
                </div>
              </div>
              <AddRepButton onClick={() => addRep("chip")} disabled={chipScore === null} color={DRILL_META.chip.color} />
              {reps.chip.length > 0 && <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>{reps.chip.map(rep => <RepChip key={rep.id} rep={rep} color={DRILL_META.chip.color} max={CHIP_MAX} onRemove={() => removeRep("chip", rep.id)} />)}</div>}
            </Card>

            <SectionDivider icon="⛳" label="Putting" />
            <Card>
              <CardLabel icon="⛳" title="Circle Putt Drill" subtitle="8 balls around hole — how many drop" color={DRILL_META.putt.color} soft={DRILL_META.putt.soft}
                right={reps.putt.length > 0 && <span style={{ fontSize: 12, color: DRILL_META.putt.color, background: DRILL_META.putt.soft, borderRadius: 12, padding: "3px 10px", fontWeight: "bold" }}>×{reps.putt.length}</span>} />
              <ScorePicker max={PUTT_MAX} value={puttScore} onChange={setPuttScore} />
              <div style={{ marginTop: 13 }}>
                <div style={{ fontSize: 11, color: T.inkFaint, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Distance</div>
                <OptionRow options={[3,4,5,6,8,10,12,15,20].map(f => ({ val: f, label: `${f}′` }))} value={puttFeet} onChange={setPuttFeet} color={DRILL_META.putt.color} />
              </div>
              <AddRepButton onClick={() => addRep("putt")} disabled={puttScore === null} color={DRILL_META.putt.color} />
              {reps.putt.length > 0 && <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>{reps.putt.map(rep => <RepChip key={rep.id} rep={rep} color={DRILL_META.putt.color} max={PUTT_MAX} onRemove={() => removeRep("putt", rep.id)} />)}</div>}
            </Card>

            <Card>
              <CardLabel icon="📏" title="Lag Putt Drill" subtitle="Long putts finishing inside 3 ft" color={DRILL_META.lag.color} soft={DRILL_META.lag.soft}
                right={reps.lag.length > 0 && <span style={{ fontSize: 12, color: DRILL_META.lag.color, background: DRILL_META.lag.soft, borderRadius: 12, padding: "3px 10px", fontWeight: "bold" }}>×{reps.lag.length}</span>} />
              <ScorePicker max={PUTT_MAX} value={lagScore} onChange={setLagScore} />
              <div style={{ marginTop: 13 }}>
                <div style={{ fontSize: 11, color: T.inkFaint, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Distance</div>
                <OptionRow options={[20,25,30,35,40,50,60].map(f => ({ val: f, label: `${f}′` }))} value={lagFeet} onChange={setLagFeet} color={DRILL_META.lag.color} />
              </div>
              <AddRepButton onClick={() => addRep("lag")} disabled={lagScore === null} color={DRILL_META.lag.color} />
              {reps.lag.length > 0 && <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>{reps.lag.map(rep => <RepChip key={rep.id} rep={rep} color={DRILL_META.lag.color} max={PUTT_MAX} onRemove={() => removeRep("lag", rep.id)} />)}</div>}
            </Card>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.inkFaint, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Session notes</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Conditions, what felt good, things to work on…" rows={2} style={{
                width: "100%", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12,
                color: T.ink, fontFamily: T.font, fontSize: 13, padding: "11px 13px",
                resize: "none", outline: "none", boxSizing: "border-box",
              }} />
            </div>

            <button onClick={handleSaveSession} disabled={saving || totalReps === 0} style={{
              width: "100%", padding: "15px 0",
              background: totalReps === 0 ? "#e6e2d6" : saved ? "#3a8e48" : T.accent,
              border: "none", borderRadius: 13, color: totalReps === 0 ? T.inkFaint : "#ffffff",
              fontSize: 16, fontFamily: T.font, cursor: totalReps === 0 ? "default" : "pointer",
              letterSpacing: 0.5, transition: "background 0.2s", fontWeight: "bold",
              boxShadow: totalReps === 0 ? "none" : "0 2px 10px rgba(78,158,87,0.25)",
            }}>
              {saving ? "Saving…" : saved ? "✓ Session Saved!" : totalReps === 0 ? "Add reps to save a session" : `Save Session (${totalReps} reps)`}
            </button>
          </div>
        )}

        {/* ════ HISTORY ════ */}
        {tab === "history" && (
          <div>
            {sessions.length === 0 ? (
              <div style={{ textAlign: "center", color: T.inkFaint, marginTop: 60, fontSize: 15 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⛳</div>No sessions logged yet.
              </div>
            ) : (
              sessions.map(s => {
                const r = s.reps || {};
                const totalR = ["drive", "chip", "putt", "lag"].reduce((a, d) => a + (r[d]?.length || 0), 0);
                return (
                  <Card key={s.ts}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div>
                        <span style={{ fontSize: 14, color: T.ink, fontWeight: "bold" }}>{s.date}</span>
                        <span style={{ fontSize: 11, color: T.inkFaint, marginLeft: 8 }}>{totalR} reps</span>
                      </div>
                      <button onClick={() => deleteSession(s.ts)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkFaint, fontSize: 16 }}>✕</button>
                    </div>

                    {["drive", "chip", "putt", "lag"].map(d => {
                      const list = r[d] || [];
                      if (!list.length) return null;
                      const m = DRILL_META[d];
                      const repAvg = list.reduce((a, x) => a + x.score, 0) / list.length;
                      return (
                        <div key={d} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                            <span style={{ fontSize: 13 }}>{m.icon}</span>
                            <span style={{ fontSize: 12.5, color: m.color, fontWeight: "bold" }}>{m.label}</span>
                            <span style={{ fontSize: 11, color: T.inkFaint }}>· avg {repAvg.toFixed(1)}/{m.max}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {list.map(rep => {
                              const detail = [rep.club, rep.diff, rep.feet ? `${rep.feet}′` : null, rep.miss].filter(Boolean).join(" ");
                              return (
                                <div key={rep.id} title={detail} style={{
                                  minWidth: 40, height: 40, padding: "0 7px", borderRadius: 10, display: "flex", flexDirection: "column",
                                  alignItems: "center", justifyContent: "center",
                                  background: `${scoreColor(rep.score, m.max)}14`, border: `1px solid ${scoreColor(rep.score, m.max)}40`,
                                }}>
                                  <span style={{ fontSize: 14, fontWeight: "bold", color: scoreColor(rep.score, m.max), lineHeight: 1 }}>{rep.score}</span>
                                  {detail && <span style={{ fontSize: 7, color: T.inkSoft, lineHeight: 1, marginTop: 1, maxWidth: 46, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {s.notes && <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 6, fontStyle: "italic", borderTop: `1px solid ${T.cardBorder}`, paddingTop: 10 }}>{s.notes}</div>}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ════ PROGRESS ════ */}
        {tab === "progress" && (
          <div>
            {sessions.length === 0 ? (
              <div style={{ textAlign: "center", color: T.inkFaint, marginTop: 60, fontSize: 15 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>Log a few sessions to see progress.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <StatBox label="Sessions" val={sessions.length} color={T.ink} />
                  <StatBox label="Total Reps" val={["drive","chip","putt","lag"].reduce((a,d)=>a+flat[d].length,0)} color={T.accent} />
                  <StatBox label="Streak" val={`${streak}d`} sub="🔥" color="#c8892b" />
                </div>

                {["drive", "chip", "putt", "lag"].map(d => {
                  if (!flat[d].length) return null;
                  const m = DRILL_META[d];
                  const a = avg(flat[d]), b = best(flat[d]);
                  return (
                    <Card key={d}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: m.soft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{m.icon}</div>
                          <span style={{ fontSize: 14.5, fontWeight: "bold", color: T.ink }}>{m.label}</span>
                        </div>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: "bold", color: m.color }}>{a.toFixed(1)}</div>
                            <div style={{ fontSize: 9, color: T.inkFaint, textTransform: "uppercase" }}>avg</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: "bold", color: "#2e9e5b" }}>{b}</div>
                            <div style={{ fontSize: 9, color: T.inkFaint, textTransform: "uppercase" }}>best</div>
                          </div>
                          <Sparkline data={sessionTrend(d)} max={m.max} color={m.color} />
                        </div>
                      </div>
                      <Bar val={a} max={m.max} color={m.color} />
                      <div style={{ fontSize: 10.5, color: T.inkFaint, marginTop: 7 }}>{flat[d].length} reps across {sessions.filter(s => s.reps?.[d]?.length).length} sessions · out of {m.max}</div>
                    </Card>
                  );
                })}

                {(() => {
                  const misses = sessions.flatMap(s => (s.reps?.drive || [])).map(r => r.miss).filter(Boolean);
                  if (!misses.length) return null;
                  const left = misses.filter(m => m === "Left").length;
                  const right = misses.filter(m => m === "Right").length;
                  const straight = misses.filter(m => m === "Straight").length;
                  return (
                    <Card>
                      <div style={{ fontSize: 14.5, fontWeight: "bold", color: T.ink, marginBottom: 12 }}>Drive Miss Pattern</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[["← Left", left, "#d96a4a"], ["● Straight", straight, "#2e9e5b"], ["Right →", right, "#d96a4a"]].map(([lbl, cnt, c]) => (
                          <div key={lbl} style={{ flex: 1, background: T.field, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "12px 6px", textAlign: "center" }}>
                            <div style={{ fontSize: 21, fontWeight: "bold", color: c }}>{cnt}</div>
                            <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 3 }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })()}
              </>
            )}

            {/* Backup & Restore — always available */}
            <Card style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14.5, fontWeight: "bold", color: T.ink, marginBottom: 4 }}>Backup & Restore</div>
              <div style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 14 }}>Save a copy of all your sessions to a file, or restore from one. Keep this somewhere safe.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={exportData} style={{
                  flex: 1, padding: "12px 0", background: `${T.accent}14`, border: `1px solid ${T.accent}55`,
                  borderRadius: 11, color: T.accent, fontSize: 13.5, fontFamily: T.font, cursor: "pointer", fontWeight: "bold",
                }}>⬇ Export backup</button>
                <label style={{
                  flex: 1, padding: "12px 0", background: T.field, border: `1px solid ${T.cardBorder}`,
                  borderRadius: 11, color: T.inkSoft, fontSize: 13.5, fontFamily: T.font, cursor: "pointer", fontWeight: "bold",
                  textAlign: "center", display: "block",
                }}>
                  ⬆ Import backup
                  <input type="file" accept="application/json,.json" onChange={importData} style={{ display: "none" }} />
                </label>
              </div>
              {importMsg && <div style={{ fontSize: 12.5, color: importMsg.startsWith("✓") ? T.accent : "#d96a4a", marginTop: 12, textAlign: "center" }}>{importMsg}</div>}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
