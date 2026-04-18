import { useState, useEffect } from "react";

// ─── Theme hook — follows system preference ───────────────────────────────────
function useSystemTheme() {
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return [dark, setDark];
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const user = {
  name: "Cihan",
  role: "Barista",
  branch: "Işıklar Şubesi",
  level: 3,
  levelName: "Barista",
  compositeScore: 68,
  streak: 5,
  xp: 1240,
  nextLevel: "Supervisor Buddy",
  nextLevelXp: 2000,
  avatar: null,
};

const mandatoryModules = [
  { id: 1, title: "Gıda Güvenliği Temelleri", category: "Hijyen & Güvenlik", progress: 60, daysLeft: 3, duration: "25 dk", urgent: true },
  { id: 2, title: "Soğuk Zincir Protokolü", category: "Hijyen & Güvenlik", progress: 0, daysLeft: 7, duration: "15 dk", urgent: false },
  { id: 3, title: "Ekipman Bakım Prosedürleri", category: "Ekipman", progress: 30, daysLeft: 14, duration: "40 dk", urgent: false },
];

const categories = [
  { slug: "barista_temelleri", title: "Barista Temelleri", count: 17, icon: "☕", gradient: ["#c0392b", "#922b21"] },
  { slug: "hijyen_guvenlik", title: "Hijyen & Güvenlik", count: 5, icon: "🛡️", gradient: ["#1a5276", "#154360"] },
  { slug: "ekipman", title: "Ekipman", count: 2, icon: "⚙️", gradient: ["#7d6608", "#6e2f1a"] },
  { slug: "musteri_iliskileri", title: "Müşteri İlişkileri", count: 1, icon: "🤝", gradient: ["#1e8449", "#196f3d"] },
  { slug: "yonetim", title: "Yönetim & Liderlik", count: 12, icon: "📊", gradient: ["#6c3483", "#5b2c6f"] },
  { slug: "genel_gelisim", title: "Genel Gelişim", count: 7, icon: "🚀", gradient: ["#1f618d", "#1a5276"] },
];

const upcomingWebinar = {
  title: "Yeni Ürün Tanıtımı: Berry Serisi",
  host: "Ayşe Kaya",
  date: "Yarın 14:00",
  registered: true,
  isLive: false,
};

const allModules = [
  { id: 10, title: "Espresso Çekimi Teknikleri", category: "Barista Temelleri", progress: 100, duration: "30 dk", isRequired: false, thumbnail: "☕" },
  { id: 11, title: "Süt Köpürtme Sanatı", category: "Barista Temelleri", progress: 75, duration: "25 dk", isRequired: false, thumbnail: "🥛" },
  { id: 12, title: "Gıda Güvenliği Temelleri", category: "Hijyen & Güvenlik", progress: 60, duration: "25 dk", isRequired: true, thumbnail: "🛡️" },
  { id: 13, title: "Soğuk Zincir Protokolü", category: "Hijyen & Güvenlik", progress: 0, duration: "15 dk", isRequired: true, thumbnail: "❄️" },
  { id: 14, title: "Müşteri Karşılama", category: "Müşteri İlişkileri", progress: 100, duration: "20 dk", isRequired: false, thumbnail: "🤝" },
  { id: 15, title: "Ekipman Bakım", category: "Ekipman", progress: 30, duration: "40 dk", isRequired: true, thumbnail: "⚙️" },
  { id: 16, title: "Çatışma Yönetimi", category: "Yönetim & Liderlik", progress: 0, duration: "35 dk", isRequired: false, thumbnail: "📊" },
  { id: 17, title: "Reçete Geliştirme", category: "Barista Temelleri", progress: 0, duration: "45 dk", isRequired: false, thumbnail: "📝" },
];

const careerLevels = [
  { level: 1, title: "Stajyer", done: true },
  { level: 2, title: "Bar Buddy", done: true },
  { level: 3, title: "Barista", current: true },
  { level: 4, title: "Supervisor Buddy", done: false },
  { level: 5, title: "Supervisor", done: false },
];

// ─── CircularProgress ─────────────────────────────────────────────────────────
function CircularProgress({ value, size = 80, stroke = 7, color = "#e74c3c" }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} opacity={0.15} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

// ─── ModuleThumbnail ──────────────────────────────────────────────────────────
function ModuleThumbnail({ emoji, gradient, size = 48 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45, flexShrink: 0,
      boxShadow: `0 4px 12px ${gradient[0]}55`
    }}>{emoji}</div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function AkademiV3() {
  const [dark, setDark] = useSystemTheme();
  const [tab, setTab] = useState("home");
  const [trainingFilter, setTrainingFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [dobodyDismissed, setDobodyDismissed] = useState(false);

  const t = {
    bg: dark ? "#0d1117" : "#f4f6f8",
    surface: dark ? "#161b22" : "#ffffff",
    surface2: dark ? "#21262d" : "#f0f2f5",
    border: dark ? "#30363d" : "#e1e4e8",
    text: dark ? "#e6edf3" : "#1a1a2e",
    textMuted: dark ? "#8b949e" : "#6b7280",
    textFaint: dark ? "#484f58" : "#c0c4cc",
    accent: "#e74c3c",
    accentLight: dark ? "#5c1a1a" : "#fdecea",
    accentText: dark ? "#f87171" : "#c0392b",
    success: "#27ae60",
    warning: "#f39c12",
    cardShadow: dark ? "0 2px 16px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.08)",
  };

  const tabs = [
    { id: "home", label: "Ana Sayfa", icon: "🏠" },
    { id: "training", label: "Eğitimler", icon: "📚" },
    { id: "webinar", label: "Webinarlar", icon: "🎥" },
    { id: "career", label: "Kariyer", icon: "🏆" },
  ];

  return (
    <div style={{ background: t.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', 'Nunito', system-ui, sans-serif", color: t.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: `linear-gradient(135deg, ${t.accent}, #922b21)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 15
            }}>{user.name[0]}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: t.textMuted }}>{user.role} · {user.branch}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: dark ? "#2d2a1e" : "#fff8e7", border: `1px solid ${dark ? "#5a4a1a" : "#fde68a"}`, borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: t.warning, display: "flex", alignItems: "center", gap: 4 }}>
              🔥 {user.streak} gün
            </div>
            <button onClick={() => setDark(!dark)} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 14, color: t.textMuted }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", borderTop: `1px solid ${t.border}` }}>
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              flex: 1, padding: "10px 4px 8px", border: "none", background: "transparent",
              cursor: "pointer", fontSize: 11, fontWeight: 600,
              color: tab === tb.id ? t.accent : t.textMuted,
              borderBottom: `2px solid ${tab === tb.id ? t.accent : "transparent"}`,
              transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 2
            }}>
              <span style={{ fontSize: 16 }}>{tb.icon}</span>
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 100px" }}>

        {/* ═══ HOME TAB ═══ */}
        {tab === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Dobody card */}
            {!dobodyDismissed && (
              <div style={{
                background: dark ? "#1a1200" : "#fffbeb",
                border: `1.5px solid ${dark ? "#856404" : "#f59e0b"}`,
                borderRadius: 16, padding: "14px 16px",
                boxShadow: t.cardShadow
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 28 }}>🤖</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: dark ? "#fbbf24" : "#b45309", marginBottom: 4 }}>
                        Mr. Dobody'den Öneri
                      </div>
                      <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5 }}>
                        <strong>Gıda Güvenliği</strong> modülünü 3 gün içinde tamamlaman gerekiyor. Şu an %60 ilerledin — kaldığın yerden devam et!
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setDobodyDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 18, padding: "0 0 0 8px" }}>×</button>
                </div>
                <button style={{
                  marginTop: 12, width: "100%", background: t.accent, color: "#fff",
                  border: "none", borderRadius: 10, padding: "10px", fontWeight: 700,
                  fontSize: 13, cursor: "pointer"
                }}>Devam Et →</button>
              </div>
            )}

            {/* Career progress card */}
            <div style={{ background: t.surface, borderRadius: 20, padding: 18, boxShadow: t.cardShadow, border: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Kariyer Seviyesi</div>
                  <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{user.levelName}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Hedef: {user.nextLevel}</div>
                </div>
                <div style={{ position: "relative", width: 80, height: 80 }}>
                  <CircularProgress value={user.compositeScore} color={user.compositeScore >= 70 ? t.success : user.compositeScore >= 50 ? t.warning : t.accent} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{user.compositeScore}</div>
                    <div style={{ fontSize: 9, color: t.textMuted }}>puan</div>
                  </div>
                </div>
              </div>

              {/* Score breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Eğitim", v: 72, icon: "📚" },
                  { label: "Pratik", v: 65, icon: "🛠️" },
                  { label: "Devam", v: 80, icon: "📅" },
                  { label: "Yönetici", v: 55, icon: "⭐" },
                ].map(s => (
                  <div key={s.label} style={{ background: t.surface2, borderRadius: 10, padding: "8px 10px" }}>
                    <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>{s.icon} {s.label}</div>
                    <div style={{ height: 5, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${s.v}%`, height: "100%", background: s.v >= 70 ? t.success : s.v >= 50 ? t.warning : t.accent, borderRadius: 99, transition: "width 1s ease" }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: s.v >= 70 ? t.success : s.v >= 50 ? t.warning : t.accentText }}>{s.v}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mandatory modules */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>🔴 Zorunlu Eğitimler</div>
                <button style={{ background: "none", border: "none", fontSize: 12, color: t.accent, cursor: "pointer", fontWeight: 600 }}>Tümünü Gör</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mandatoryModules.map(m => (
                  <div key={m.id} style={{
                    background: m.urgent ? (dark ? "#1f0a0a" : "#fff5f5") : t.surface,
                    border: `1px solid ${m.urgent ? (dark ? "#7f1d1d" : "#fecaca") : t.border}`,
                    borderRadius: 14, padding: "12px 14px", boxShadow: t.cardShadow
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1, paddingRight: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{m.category} · {m.duration}</div>
                      </div>
                      {m.urgent && (
                        <div style={{ background: t.accent, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>
                          {m.daysLeft} gün
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${m.progress}%`, height: "100%", background: m.urgent ? t.accent : t.success, borderRadius: 99 }} />
                      </div>
                      <div style={{ fontSize: 11, color: t.textMuted, flexShrink: 0 }}>{m.progress}%</div>
                      <button style={{
                        background: m.progress > 0 ? t.accent : t.surface2,
                        color: m.progress > 0 ? "#fff" : t.text,
                        border: `1px solid ${m.progress > 0 ? t.accent : t.border}`,
                        borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0
                      }}>{m.progress > 0 ? "Devam" : "Başla"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category grid */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>📂 Kategoriler</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {categories.map(c => (
                  <button key={c.slug} onClick={() => { setTab("training"); setCategoryFilter(c.slug); }} style={{
                    background: `linear-gradient(135deg, ${c.gradient[0]}22, ${c.gradient[1]}33)`,
                    border: `1px solid ${c.gradient[0]}44`,
                    borderRadius: 14, padding: "14px 8px", cursor: "pointer", textAlign: "center",
                    transition: "transform 0.15s"
                  }}>
                    <div style={{ fontSize: 22 }}>{c.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.text, marginTop: 6, lineHeight: 1.3 }}>{c.title}</div>
                    <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3 }}>{c.count} modül</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Upcoming webinar banner */}
            {upcomingWebinar && (
              <div style={{
                background: `linear-gradient(135deg, #c0392b, #922b21)`,
                borderRadius: 16, padding: "14px 16px", color: "#fff"
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  🎥 Yaklaşan Webinar
                </div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{upcomingWebinar.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>{upcomingWebinar.date} · {upcomingWebinar.host}</div>
                  <button style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "5px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {upcomingWebinar.registered ? "✓ Kayıtlı" : "Kayıt Ol"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TRAINING TAB ═══ */}
        {tab === "training" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Toggle */}
            <div style={{ background: t.surface2, borderRadius: 12, padding: 4, display: "flex", gap: 4 }}>
              {["all", "mandatory", "optional"].map(f => (
                <button key={f} onClick={() => setTrainingFilter(f)} style={{
                  flex: 1, padding: "8px 4px", border: "none", borderRadius: 9,
                  background: trainingFilter === f ? t.surface : "transparent",
                  color: trainingFilter === f ? t.text : t.textMuted,
                  fontWeight: trainingFilter === f ? 700 : 500,
                  fontSize: 12, cursor: "pointer",
                  boxShadow: trainingFilter === f ? t.cardShadow : "none",
                  transition: "all 0.2s"
                }}>
                  {f === "all" ? "Tümü" : f === "mandatory" ? "🔴 Zorunlu" : "📖 İsteğe Bağlı"}
                </button>
              ))}
            </div>

            {/* Category chips */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              <button onClick={() => setCategoryFilter(null)} style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20,
                border: `1px solid ${!categoryFilter ? t.accent : t.border}`,
                background: !categoryFilter ? t.accentLight : t.surface,
                color: !categoryFilter ? t.accentText : t.textMuted,
                fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}>Tümü</button>
              {categories.map(c => (
                <button key={c.slug} onClick={() => setCategoryFilter(c.slug === categoryFilter ? null : c.slug)} style={{
                  flexShrink: 0, padding: "6px 14px", borderRadius: 20,
                  border: `1px solid ${categoryFilter === c.slug ? t.accent : t.border}`,
                  background: categoryFilter === c.slug ? t.accentLight : t.surface,
                  color: categoryFilter === c.slug ? t.accentText : t.textMuted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer"
                }}>{c.icon} {c.title}</button>
              ))}
            </div>

            {/* Module list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allModules
                .filter(m => {
                  if (trainingFilter === "mandatory" && !m.isRequired) return false;
                  if (trainingFilter === "optional" && m.isRequired) return false;
                  return true;
                })
                .map(m => {
                  const cat = categories.find(c => c.title.toLowerCase().includes(m.category.toLowerCase().split(" ")[0]));
                  const grad = cat ? cat.gradient : ["#555", "#333"];
                  return (
                    <div key={m.id} style={{
                      background: t.surface, border: `1px solid ${t.border}`,
                      borderRadius: 16, padding: "14px", boxShadow: t.cardShadow,
                      display: "flex", gap: 12, alignItems: "center"
                    }}>
                      {/* Thumbnail */}
                      <ModuleThumbnail emoji={m.thumbnail} gradient={grad} size={52} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, paddingRight: 8 }}>{m.title}</div>
                          {m.isRequired && (
                            <div style={{ flexShrink: 0, background: t.accent, color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 6px" }}>Zorunlu</div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 6 }}>{m.category} · ⏱ {m.duration}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: t.border, borderRadius: 99 }}>
                            <div style={{ width: `${m.progress}%`, height: "100%", background: m.progress === 100 ? t.success : t.accent, borderRadius: 99 }} />
                          </div>
                          <div style={{ fontSize: 11, color: t.textMuted, flexShrink: 0 }}>
                            {m.progress === 100 ? "✓ Tamam" : `${m.progress}%`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ═══ WEBINAR TAB ═══ */}
        {tab === "webinar" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Live card */}
            <div style={{ background: `linear-gradient(135deg, #7b1f1f, #c0392b)`, borderRadius: 20, padding: 20, color: "#fff", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 16, right: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,0.3)", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>CANLI</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 8, textTransform: "uppercase" }}>Şu An Yayında</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Kahve Tadım & Kalite Kontrolü</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 14 }}>Eğitmen: Mehmet Yılmaz · 47 katılımcı</div>
              <button style={{ background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.5)", borderRadius: 10, padding: "10px 20px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", backdropFilter: "blur(10px)" }}>
                Katıl →
              </button>
            </div>

            <div style={{ fontSize: 15, fontWeight: 800 }}>📅 Yaklaşan Webinarlar</div>
            {[
              { title: "Yeni Ürün Tanıtımı: Berry Serisi", host: "Ayşe Kaya", date: "Yarın 14:00", registered: true },
              { title: "KVKK Güncellemesi", host: "Hukuk Ekibi", date: "20 Mar 10:00", registered: false },
              { title: "Q1 Değerlendirme", host: "Genel Müdür", date: "28 Mar 15:00", registered: false },
            ].map((w, i) => (
              <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "14px 16px", boxShadow: t.cardShadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{w.title}</div>
                    <div style={{ fontSize: 12, color: t.textMuted }}>👤 {w.host}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>📅 {w.date}</div>
                  </div>
                  <button style={{
                    flexShrink: 0, marginLeft: 10,
                    background: w.registered ? t.surface2 : t.accent,
                    border: `1px solid ${w.registered ? t.border : t.accent}`,
                    color: w.registered ? t.textMuted : "#fff",
                    borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                  }}>{w.registered ? "✓ Kayıtlı" : "Kayıt Ol"}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ CAREER TAB ═══ */}
        {tab === "career" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Timeline */}
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: 20, boxShadow: t.cardShadow }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>🗺️ Kariyer Yolculuğun</div>
              <div style={{ position: "relative", paddingLeft: 36 }}>
                {/* Vertical line */}
                <div style={{ position: "absolute", left: 15, top: 10, bottom: 10, width: 2, background: t.border }} />

                {careerLevels.map((l, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: i < careerLevels.length - 1 ? 20 : 0 }}>
                    {/* Dot */}
                    <div style={{
                      position: "absolute", left: -28, top: 2, width: 20, height: 20, borderRadius: "50%",
                      background: l.done ? t.success : l.current ? t.accent : t.surface2,
                      border: `2.5px solid ${l.done ? t.success : l.current ? t.accent : t.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: l.current ? `0 0 0 4px ${t.accent}33` : "none",
                      zIndex: 1
                    }}>
                      {l.done && <span style={{ fontSize: 10, color: "#fff" }}>✓</span>}
                      {l.current && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "block" }} />}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: l.current ? 800 : 600, color: l.done ? t.textMuted : t.text }}>
                          Seviye {l.level}: {l.title}
                        </div>
                        {l.current && <div style={{ fontSize: 11, color: t.accent, marginTop: 2 }}>◀ Mevcut seviyesin</div>}
                      </div>
                      {l.done && <div style={{ fontSize: 12, color: t.success, fontWeight: 700 }}>✓ Tamamlandı</div>}
                      {!l.done && !l.current && <div style={{ fontSize: 12, color: t.textFaint }}>Kilitli 🔒</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gate progress */}
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: 20, boxShadow: t.cardShadow }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>🚪 Sonraki Kapı (Gate-2)</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 14 }}>Barista → Supervisor Buddy yükselmek için:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Modüller", done: 7, total: 11, icon: "📚" },
                  { label: "Sınav", done: 0, total: 1, icon: "📝", note: "Min %85" },
                  { label: "Pratik", done: 2, total: 5, icon: "🛠️" },
                  { label: "HQ Onay", done: false, icon: "✅", note: "Son adım" },
                ].map((g, i) => (
                  <div key={i} style={{ background: t.surface2, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{g.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{g.label}</div>
                    {g.total ? (
                      <>
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{g.done}/{g.total}</div>
                        <div style={{ height: 4, background: t.border, borderRadius: 99, marginTop: 6 }}>
                          <div style={{ width: `${(g.done / g.total) * 100}%`, height: "100%", background: g.done === g.total ? t.success : t.accent, borderRadius: 99 }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{g.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: 20, boxShadow: t.cardShadow }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>🏅 Rozetler</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { emoji: "⭐", title: "İlk Adım", earned: true },
                  { emoji: "🔥", title: "5 Günlük Seri", earned: true },
                  { emoji: "📚", title: "Okuyucu", earned: false },
                  { emoji: "🏆", title: "Şampiyon", earned: false },
                  { emoji: "⚡", title: "Hızlı Başlangıç", earned: false },
                  { emoji: "🎯", title: "Hedef Odaklı", earned: false },
                  { emoji: "💡", title: "Meraklı", earned: false },
                  { emoji: "🌟", title: "Yıldız", earned: false },
                ].map((b, i) => (
                  <div key={i} style={{ textAlign: "center", opacity: b.earned ? 1 : 0.35 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14, margin: "0 auto 6px",
                      background: b.earned ? (dark ? "#1a3a1a" : "#f0fdf4") : t.surface2,
                      border: `1.5px solid ${b.earned ? t.success : t.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                    }}>{b.emoji}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: t.textMuted, lineHeight: 1.2 }}>{b.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: t.surface, borderTop: `1px solid ${t.border}`,
        display: "flex", justifyContent: "space-around", padding: "8px 0 20px",
        backdropFilter: "blur(20px)"
      }}>
        {[
          { icon: "🏠", label: "Ana Sayfa" },
          { icon: "📚", label: "Akademi", active: true },
          { icon: "🕐", label: "Vardiyam" },
          { icon: "🔧", label: "Arızalar" },
          { icon: "👤", label: "Profil" },
        ].map((item, i) => (
          <div key={i} style={{ textAlign: "center", cursor: "pointer", opacity: item.active ? 1 : 0.5 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, margin: "0 auto 2px",
              background: item.active ? t.accent : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
            }}>{item.icon}</div>
            <div style={{ fontSize: 9, fontWeight: item.active ? 700 : 500, color: item.active ? t.accent : t.textMuted }}>{item.label}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #888; border-radius: 99px; }
      `}</style>
    </div>
  );
}
