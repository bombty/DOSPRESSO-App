import { useEffect } from "react";
import dospressoLogoCert from "@assets/IMG_7142_1773875710595.png";

let _dancingScriptLoaded = false;
function loadDancingScript() {
  if (_dancingScriptLoaded) return;
  _dancingScriptLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap";
  document.head.appendChild(link);
}

export interface CertificateTemplate {
  id: string;
  fromRole: string | null;
  toRole: string | null;
  title: string;
  subtitle: string;
  description: string;
}

export interface CertificateProps {
  template: CertificateTemplate;
  recipientName: string;
  issueDate: string;
  certificateId: string;
  moduleName?: string;
  quizScore?: number;
  branchName?: string;
  signer1Name: string;
  signer1Title: string;
  signer2Name: string;
  signer2Title: string;
  customTitle?: string;
  customDescription?: string;
}

export const ROLE_LABELS: Record<string, string> = {
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
  mudur: "Müdür",
  owner: "Partner", // Aslan 10 May 2026: Franchise sahibi
};

export const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: "stajyer-to-bar_buddy",
    fromRole: "stajyer",
    toRole: "bar_buddy",
    title: "Bar Buddy Başarı Sertifikası",
    subtitle: "DOSPRESSO Donut & Coffee",
    description: "temel barista eğitimlerini başarıyla tamamlayarak Bar Buddy seviyesine yükselmiştir.",
  },
  {
    id: "bar_buddy-to-barista",
    fromRole: "bar_buddy",
    toRole: "barista",
    title: "Barista Yetkinlik Sertifikası",
    subtitle: "DOSPRESSO Donut & Coffee",
    description: "tüm barista yetkinlik modüllerini ve sınavlarını başarıyla tamamlayarak Barista unvanını almaya hak kazanmıştır.",
  },
  {
    id: "barista-to-supervisor_buddy",
    fromRole: "barista",
    toRole: "supervisor_buddy",
    title: "Supervisor Buddy Terfi Sertifikası",
    subtitle: "DOSPRESSO Donut & Coffee",
    description: "liderlik ve operasyon yönetimi eğitimlerini başarıyla tamamlayarak Supervisor Buddy pozisyonuna terfi etmiştir.",
  },
  {
    id: "supervisor_buddy-to-supervisor",
    fromRole: "supervisor_buddy",
    toRole: "supervisor",
    title: "Supervisor Sertifikası",
    subtitle: "DOSPRESSO Donut & Coffee",
    description: "vardiya yönetimi, ekip liderliği ve kalite kontrol eğitimlerini başarıyla tamamlayarak Supervisor unvanına layık görülmüştür.",
  },
  {
    id: "module-completion",
    fromRole: null,
    toRole: null,
    title: "Eğitim Tamamlama Sertifikası",
    subtitle: "DOSPRESSO Akademi",
    description: "eğitim modülünü başarıyla tamamlamıştır.",
  },
];

function VintageSeal() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r="42" fill="none" stroke="#122549" strokeWidth="2" strokeDasharray="2 1" />
      <circle cx="45" cy="45" r="37" fill="none" stroke="#122549" strokeWidth="0.5" />
      <circle cx="45" cy="6" r="1.5" fill="#c9a84c" />
      <circle cx="45" cy="84" r="1.5" fill="#c9a84c" />
      <circle cx="6" cy="45" r="1.5" fill="#c9a84c" />
      <circle cx="84" cy="45" r="1.5" fill="#c9a84c" />
      <defs>
        <path id="topArc" d="M 15 45 A 30 30 0 0 1 75 45" fill="none" />
        <path id="bottomArc" d="M 75 50 A 30 30 0 0 1 15 50" fill="none" />
      </defs>
      <text fontFamily="Georgia,serif" fontSize="7" fontWeight="bold" fill="#122549" letterSpacing="2">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">DOSPRESSO</textPath>
      </text>
      <text fontFamily="Georgia,serif" fontSize="7" fill="#122549" letterSpacing="2">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">AKADEMİ</textPath>
      </text>
      <polygon points="45,28 48,38 58,38 50,44 53,54 45,48 37,54 40,44 32,38 42,38" fill="#c9a84c" opacity="0.8" />
      <text x="45" y="63" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#122549" letterSpacing="1.5" fontWeight="bold">ONAY</text>
      <text x="45" y="73" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill="#888">2026</text>
    </svg>
  );
}

export function CertificateRenderer({
  template,
  recipientName,
  issueDate,
  certificateId,
  moduleName,
  quizScore,
  branchName,
  signer1Name,
  signer1Title,
  signer2Name,
  signer2Title,
  customTitle,
  customDescription,
}: CertificateProps) {
  useEffect(() => { loadDancingScript(); }, []);
  const displayTitle = customTitle || template.title;
  const displayDescription = customDescription || template.description;

  return (
    <div
      className="certificate-container"
      data-testid="certificate-preview"
      style={{
        width: "1120px",
        height: "790px",
        background: "white",
        color: "#122549",
        border: "4px solid #122549",
        borderRadius: "6px",
        padding: "48px 64px",
        position: "relative",
        fontFamily: "Georgia, 'Times New Roman', serif",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "10px",
          border: "0.5px dashed #c9a84c",
          borderRadius: "4px",
          pointerEvents: "none",
          opacity: 0.5,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "16px",
          border: "1.5px solid #c9a84c",
          borderRadius: "4px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <img
          src={dospressoLogoCert}
          alt=""
          style={{ width: "300px", objectFit: "contain" }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
          <img
            src={dospressoLogoCert}
            alt="DOSPRESSO"
            style={{ height: "90px", objectFit: "contain" }}
            crossOrigin="anonymous"
          />
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "200px",
              height: "1.5px",
              background: "linear-gradient(90deg, transparent, #d4af37, transparent)",
            }}
          />
        </div>

        <h1
          style={{
            textAlign: "center",
            fontSize: "26px",
            fontWeight: "bold",
            marginBottom: "4px",
            color: "#122549",
            letterSpacing: "1px",
          }}
        >
          {displayTitle}
        </h1>

        <p
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: "#888",
            marginBottom: "24px",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}
        >
          {template.subtitle}
        </p>

        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#444",
            marginBottom: "8px",
          }}
        >
          Bu belge,
        </p>

        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <span
            style={{
              fontSize: "30px",
              fontWeight: "bold",
              color: "#122549",
              borderBottom: "2px solid #122549",
              paddingBottom: "6px",
              paddingLeft: "24px",
              paddingRight: "24px",
            }}
          >
            {recipientName || "Ad Soyad"}
          </span>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            lineHeight: "1.8",
            maxWidth: "480px",
            margin: "16px auto 8px",
            color: "#444",
          }}
        >
          {displayDescription}
        </p>

        {moduleName && (
          <p
            style={{
              textAlign: "center",
              fontSize: "15px",
              fontWeight: "bold",
              color: "#cc1f1f",
              marginTop: "4px",
            }}
          >
            {moduleName}
          </p>
        )}

        {quizScore !== undefined && quizScore !== null && (
          <p style={{ textAlign: "center", fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Sınav Puanı: {quizScore}/100
          </p>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "48px",
          left: "72px",
          right: "72px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          zIndex: 1,
        }}
      >
        <div>
          <p style={{ fontSize: "10px", color: "#999", marginBottom: "2px", fontFamily: "sans-serif" }}>
            Sertifika No: {certificateId}
          </p>
          <p style={{ fontSize: "10px", color: "#999", fontFamily: "sans-serif" }}>{issueDate}</p>
          {branchName && (
            <p style={{ fontSize: "10px", color: "#999", fontFamily: "sans-serif" }}>{branchName}</p>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <VintageSeal />
        </div>

        <div style={{ display: "flex", gap: "32px" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "150px",
                borderBottom: "0.5px solid #122549",
                marginBottom: "6px",
              }}
            />
            <p style={{ fontSize: "22px", color: "#122549", fontFamily: "'Dancing Script', cursive" }}>
              {signer1Name}
            </p>
            <p style={{ fontSize: "9px", color: "#888", letterSpacing: "0.5px", fontFamily: "sans-serif" }}>
              {signer1Title}
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "150px",
                borderBottom: "0.5px solid #122549",
                marginBottom: "6px",
              }}
            />
            <p style={{ fontSize: "22px", color: "#122549", fontFamily: "'Dancing Script', cursive" }}>
              {signer2Name}
            </p>
            <p style={{ fontSize: "9px", color: "#888", letterSpacing: "0.5px", fontFamily: "sans-serif" }}>
              {signer2Title}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          width: "40px",
          height: "40px",
          borderTop: "2px solid #d4af37",
          borderLeft: "2px solid #d4af37",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          width: "40px",
          height: "40px",
          borderTop: "2px solid #d4af37",
          borderRight: "2px solid #d4af37",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          width: "40px",
          height: "40px",
          borderBottom: "2px solid #d4af37",
          borderLeft: "2px solid #d4af37",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          width: "40px",
          height: "40px",
          borderBottom: "2px solid #d4af37",
          borderRight: "2px solid #d4af37",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function vintageSealSVG(): string {
  return `<svg width="90" height="90" viewBox="0 0 90 90">
    <circle cx="45" cy="45" r="42" fill="none" stroke="#122549" stroke-width="2" stroke-dasharray="2 1"/>
    <circle cx="45" cy="45" r="37" fill="none" stroke="#122549" stroke-width="0.5"/>
    <circle cx="45" cy="6" r="1.5" fill="#c9a84c"/>
    <circle cx="45" cy="84" r="1.5" fill="#c9a84c"/>
    <circle cx="6" cy="45" r="1.5" fill="#c9a84c"/>
    <circle cx="84" cy="45" r="1.5" fill="#c9a84c"/>
    <defs>
      <path id="topArc" d="M 15 45 A 30 30 0 0 1 75 45" fill="none"/>
      <path id="bottomArc" d="M 75 50 A 30 30 0 0 1 15 50" fill="none"/>
    </defs>
    <text font-family="Georgia,serif" font-size="7" font-weight="bold" fill="#122549" letter-spacing="2">
      <textPath href="#topArc" startOffset="50%" text-anchor="middle">DOSPRESSO</textPath>
    </text>
    <text font-family="Georgia,serif" font-size="7" fill="#122549" letter-spacing="2">
      <textPath href="#bottomArc" startOffset="50%" text-anchor="middle">AKADEM&#304;</textPath>
    </text>
    <polygon points="45,28 48,38 58,38 50,44 53,54 45,48 37,54 40,44 32,38 42,38" fill="#c9a84c" opacity="0.8"/>
    <text x="45" y="63" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#122549" letter-spacing="1.5" font-weight="bold">ONAY</text>
    <text x="45" y="73" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#888">2026</text>
  </svg>`;
}

export function generateCertificateHTML(props: CertificateProps): string {
  const displayTitle = escapeHtml(props.customTitle || props.template.title);
  const displayDesc = escapeHtml(props.customDescription || props.template.description);
  const subtitle = escapeHtml(props.template.subtitle);
  const recipientName = escapeHtml(props.recipientName || "");
  const issueDate = escapeHtml(props.issueDate);
  const certificateId = escapeHtml(props.certificateId);
  const moduleName = props.moduleName ? escapeHtml(props.moduleName) : undefined;
  const branchName = props.branchName ? escapeHtml(props.branchName) : undefined;
  const signer1Name = escapeHtml(props.signer1Name);
  const signer1Title = escapeHtml(props.signer1Title);
  const signer2Name = escapeHtml(props.signer2Name);
  const signer2Title = escapeHtml(props.signer2Title);
  const quizScore = props.quizScore;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${displayTitle} - ${recipientName}</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 0; }
  @media print { 
    body { margin: 0; padding: 0; }
    .no-print { display: none !important; }
    .cert-wrapper { box-shadow: none !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100vh; background: #f5f5f5; font-family: Georgia, 'Times New Roman', serif;
  }
  .print-bar {
    position: fixed; top: 0; left: 0; right: 0;
    background: #122549; color: white; padding: 12px 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    z-index: 100; font-family: system-ui, sans-serif;
  }
  .print-bar button {
    background: #cc1f1f; color: white; border: none; padding: 8px 24px;
    border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;
  }
  .print-bar button:hover { opacity: 0.9; }
  .cert-wrapper {
    margin-top: 80px; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  .cert {
    width: 1120px; height: 790px; background: white; color: #122549;
    border: 4px solid #122549; border-radius: 6px; padding: 48px 64px;
    position: relative; overflow: hidden;
  }
  .dashed-border { position: absolute; inset: 10px; border: 0.5px dashed #c9a84c; border-radius: 4px; pointer-events: none; opacity: 0.5; }
  .inner-border { position: absolute; inset: 16px; border: 1.5px solid #c9a84c; border-radius: 4px; pointer-events: none; }
  .watermark {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    opacity: 0.04; pointer-events: none; z-index: 0;
  }
  .watermark img { width: 300px; object-fit: contain; }
  .content { position: relative; z-index: 1; }
  .corner { position: absolute; width: 40px; height: 40px; pointer-events: none; }
  .corner-tl { top: 20px; left: 20px; border-top: 2px solid #d4af37; border-left: 2px solid #d4af37; }
  .corner-tr { top: 20px; right: 20px; border-top: 2px solid #d4af37; border-right: 2px solid #d4af37; }
  .corner-bl { bottom: 20px; left: 20px; border-bottom: 2px solid #d4af37; border-left: 2px solid #d4af37; }
  .corner-br { bottom: 20px; right: 20px; border-bottom: 2px solid #d4af37; border-right: 2px solid #d4af37; }
  .logo { display: flex; justify-content: center; margin-bottom: 12px; }
  .logo img { height: 90px; object-fit: contain; }
  .separator { display: flex; justify-content: center; margin-bottom: 20px; }
  .separator-line { width: 200px; height: 1.5px; background: linear-gradient(90deg, transparent, #d4af37, transparent); }
  .title { text-align: center; font-size: 26px; font-weight: bold; color: #122549; margin-bottom: 4px; letter-spacing: 1px; }
  .subtitle-text { text-align: center; font-size: 11px; color: #888; margin-bottom: 24px; letter-spacing: 3px; text-transform: uppercase; }
  .intro { text-align: center; font-size: 14px; color: #444; margin-bottom: 8px; }
  .name-wrap { text-align: center; margin-bottom: 12px; }
  .name { font-size: 30px; font-weight: bold; color: #122549; border-bottom: 2px solid #122549; padding: 0 24px 6px; }
  .desc { text-align: center; font-size: 14px; line-height: 1.8; max-width: 480px; margin: 16px auto 8px; color: #444; }
  .module-name { text-align: center; font-size: 15px; font-weight: bold; color: #cc1f1f; margin-top: 4px; }
  .quiz-score { text-align: center; font-size: 11px; color: #888; margin-top: 4px; }
  .bottom { position: absolute; bottom: 48px; left: 72px; right: 72px; display: flex; justify-content: space-between; align-items: flex-end; z-index: 1; }
  .meta { font-size: 10px; color: #999; font-family: sans-serif; }
  .meta p { margin-bottom: 2px; }
  .sig-block { text-align: center; }
  .sig-line { width: 150px; border-bottom: 0.5px solid #122549; margin-bottom: 6px; }
  .sig-name { font-size: 22px; color: #122549; font-family: 'Dancing Script', cursive; }
  .sig-title { font-size: 9px; color: #888; letter-spacing: 0.5px; font-family: sans-serif; }
  .sigs { display: flex; gap: 32px; }
</style>
</head>
<body>
<div class="print-bar no-print">
  <span>DOSPRESSO Sertifika - ${recipientName}</span>
  <button onclick="window.print()">Yazdır / PDF Kaydet</button>
</div>
<div class="cert-wrapper">
<div class="cert">
  <div class="dashed-border"></div>
  <div class="inner-border"></div>
  <div class="watermark"><img src="/dospresso-logo-cert.png" alt="" /></div>
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>
  <div class="content">
    <div class="logo"><img src="/dospresso-logo-cert.png" alt="DOSPRESSO" /></div>
    <div class="separator"><div class="separator-line"></div></div>
    <h1 class="title">${displayTitle}</h1>
    <p class="subtitle-text">${subtitle}</p>
    <p class="intro">Bu belge,</p>
    <div class="name-wrap"><span class="name">${recipientName || "Ad Soyad"}</span></div>
    <p class="desc">${displayDesc}</p>
    ${moduleName ? `<p class="module-name">${moduleName}</p>` : ""}
    ${quizScore !== undefined && quizScore !== null ? `<p class="quiz-score">Sınav Puanı: ${quizScore}/100</p>` : ""}
  </div>
  <div class="bottom">
    <div class="meta">
      <p>Sertifika No: ${certificateId}</p>
      <p>${issueDate}</p>
      ${branchName ? `<p>${branchName}</p>` : ""}
    </div>
    <div style="text-align:center">
      ${vintageSealSVG()}
    </div>
    <div class="sigs">
      <div class="sig-block">
        <div class="sig-line"></div>
        <p class="sig-name">${signer1Name}</p>
        <p class="sig-title">${signer1Title}</p>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <p class="sig-name">${signer2Name}</p>
        <p class="sig-title">${signer2Title}</p>
      </div>
    </div>
  </div>
</div>
</div>
</body>
</html>`;
}

export function printCertificate(props: CertificateProps) {
  const html = generateCertificateHTML(props);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
