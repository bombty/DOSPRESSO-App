import dospressoLogoCert from "@assets/IMG_7142_1773874714999.png";

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
  signerName?: string;
  signerTitle?: string;
}

export const ROLE_LABELS: Record<string, string> = {
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
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

export function CertificateRenderer({
  template,
  recipientName,
  issueDate,
  certificateId,
  moduleName,
  signerName,
  signerTitle,
}: CertificateProps) {
  return (
    <div
      className="certificate-container"
      data-testid="certificate-preview"
      style={{
        width: "1120px",
        height: "790px",
        background: "white",
        color: "#122549",
        border: "3px solid #122549",
        borderRadius: "8px",
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
          inset: "12px",
          border: "1px solid #d4af37",
          borderRadius: "4px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "16px",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          borderRadius: "4px",
          pointerEvents: "none",
        }}
      />

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
            width: "300px",
            height: "2px",
            background: "linear-gradient(90deg, transparent, #d4af37, transparent)",
          }}
        />
      </div>

      <h1
        style={{
          textAlign: "center",
          fontSize: "30px",
          fontWeight: "bold",
          marginBottom: "4px",
          color: "#122549",
          letterSpacing: "1px",
        }}
      >
        {template.title}
      </h1>

      <p
        style={{
          textAlign: "center",
          fontSize: "13px",
          color: "#888",
          marginBottom: "28px",
          letterSpacing: "3px",
          textTransform: "uppercase",
        }}
      >
        {template.subtitle}
      </p>

      <p
        style={{
          textAlign: "center",
          fontSize: "15px",
          color: "#555",
          marginBottom: "8px",
        }}
      >
        Bu belge,
      </p>

      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <span
          style={{
            fontSize: "34px",
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
          fontSize: "15px",
          lineHeight: "1.8",
          maxWidth: "600px",
          margin: "20px auto 8px",
          color: "#444",
        }}
      >
        {template.description}
      </p>

      {moduleName && (
        <p
          style={{
            textAlign: "center",
            fontSize: "18px",
            fontWeight: "bold",
            color: "#cc1f1f",
            marginTop: "8px",
          }}
        >
          {moduleName}
        </p>
      )}

      <div
        style={{
          position: "absolute",
          bottom: "48px",
          left: "72px",
          right: "72px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "2px" }}>
            Sertifika No: {certificateId}
          </p>
          <p style={{ fontSize: "13px", color: "#555" }}>{issueDate}</p>
        </div>

        <div style={{ textAlign: "center" }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="38" fill="none" stroke="#122549" strokeWidth="2" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="#d4af37" strokeWidth="1" />
            <circle cx="40" cy="40" r="30" fill="none" stroke="#122549" strokeWidth="0.5" />
            <text x="40" y="33" textAnchor="middle" fill="#122549" fontSize="9" fontWeight="bold" fontFamily="Georgia, serif">
              DOSPRESSO
            </text>
            <text x="40" y="44" textAnchor="middle" fill="#cc1f1f" fontSize="7" fontFamily="Georgia, serif">
              AKADEMi
            </text>
            <line x1="25" y1="50" x2="55" y2="50" stroke="#d4af37" strokeWidth="0.5" />
            <text x="40" y="58" textAnchor="middle" fill="#122549" fontSize="6" fontFamily="Georgia, serif">
              ONAY
            </text>
          </svg>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "160px",
              borderBottom: "1px solid #122549",
              marginBottom: "6px",
            }}
          />
          <p style={{ fontSize: "12px", color: "#333" }}>
            {signerName || "DOSPRESSO"}
          </p>
          <p style={{ fontSize: "11px", color: "#888" }}>
            {signerTitle || "Eğitim Müdürü"}
          </p>
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

export function generateCertificateHTML(props: CertificateProps): string {
  const raw = props;
  const template = { title: escapeHtml(raw.template.title), subtitle: escapeHtml(raw.template.subtitle), description: escapeHtml(raw.template.description) };
  const recipientName = escapeHtml(raw.recipientName || "");
  const issueDate = escapeHtml(raw.issueDate);
  const certificateId = escapeHtml(raw.certificateId);
  const moduleName = raw.moduleName ? escapeHtml(raw.moduleName) : undefined;
  const signerName = escapeHtml(raw.signerName || "DOSPRESSO");
  const signerTitle = escapeHtml(raw.signerTitle || "Eğitim Müdürü");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${template.title} - ${recipientName}</title>
<style>
  @page { size: landscape; margin: 0; }
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
    border: 3px solid #122549; border-radius: 8px; padding: 48px 64px;
    position: relative; overflow: hidden;
  }
  .inner-border { position: absolute; inset: 12px; border: 1px solid #d4af37; border-radius: 4px; pointer-events: none; }
  .inner-border-2 { position: absolute; inset: 16px; border: 1px solid rgba(212,175,55,0.3); border-radius: 4px; pointer-events: none; }
  .corner { position: absolute; width: 40px; height: 40px; pointer-events: none; }
  .corner-tl { top: 20px; left: 20px; border-top: 2px solid #d4af37; border-left: 2px solid #d4af37; }
  .corner-tr { top: 20px; right: 20px; border-top: 2px solid #d4af37; border-right: 2px solid #d4af37; }
  .corner-bl { bottom: 20px; left: 20px; border-bottom: 2px solid #d4af37; border-left: 2px solid #d4af37; }
  .corner-br { bottom: 20px; right: 20px; border-bottom: 2px solid #d4af37; border-right: 2px solid #d4af37; }
  .logo { display: flex; justify-content: center; margin-bottom: 12px; }
  .logo img { height: 90px; object-fit: contain; }
  .separator { display: flex; justify-content: center; margin-bottom: 20px; }
  .separator-line { width: 300px; height: 2px; background: linear-gradient(90deg, transparent, #d4af37, transparent); }
  .title { text-align: center; font-size: 30px; font-weight: bold; color: #122549; margin-bottom: 4px; letter-spacing: 1px; }
  .subtitle-text { text-align: center; font-size: 13px; color: #888; margin-bottom: 28px; letter-spacing: 3px; text-transform: uppercase; }
  .intro { text-align: center; font-size: 15px; color: #555; margin-bottom: 8px; }
  .name-wrap { text-align: center; margin-bottom: 12px; }
  .name { font-size: 34px; font-weight: bold; color: #122549; border-bottom: 2px solid #122549; padding: 0 24px 6px; }
  .desc { text-align: center; font-size: 15px; line-height: 1.8; max-width: 600px; margin: 20px auto 8px; color: #444; }
  .module-name { text-align: center; font-size: 18px; font-weight: bold; color: #cc1f1f; margin-top: 8px; }
  .bottom { position: absolute; bottom: 48px; left: 72px; right: 72px; display: flex; justify-content: space-between; align-items: flex-end; }
  .cert-id { font-size: 11px; color: #aaa; margin-bottom: 2px; }
  .cert-date { font-size: 13px; color: #555; }
  .sig-line { width: 160px; border-bottom: 1px solid #122549; margin-bottom: 6px; }
  .sig-name { font-size: 12px; color: #333; }
  .sig-title { font-size: 11px; color: #888; }
</style>
</head>
<body>
<div class="print-bar no-print">
  <span>DOSPRESSO Sertifika - ${recipientName}</span>
  <button onclick="window.print()">Yazdir / PDF Kaydet</button>
</div>
<div class="cert-wrapper">
<div class="cert">
  <div class="inner-border"></div>
  <div class="inner-border-2"></div>
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>
  <div class="logo"><img src="/dospresso-logo-cert.png" alt="DOSPRESSO" /></div>
  <div class="separator"><div class="separator-line"></div></div>
  <h1 class="title">${template.title}</h1>
  <p class="subtitle-text">${template.subtitle}</p>
  <p class="intro">Bu belge,</p>
  <div class="name-wrap"><span class="name">${recipientName || "Ad Soyad"}</span></div>
  <p class="desc">${template.description}</p>
  ${moduleName ? `<p class="module-name">${moduleName}</p>` : ""}
  <div class="bottom">
    <div>
      <p class="cert-id">Sertifika No: ${certificateId}</p>
      <p class="cert-date">${issueDate}</p>
    </div>
    <div style="text-align:center">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="38" fill="none" stroke="#122549" stroke-width="2"/>
        <circle cx="40" cy="40" r="34" fill="none" stroke="#d4af37" stroke-width="1"/>
        <circle cx="40" cy="40" r="30" fill="none" stroke="#122549" stroke-width="0.5"/>
        <text x="40" y="33" text-anchor="middle" fill="#122549" font-size="9" font-weight="bold" font-family="Georgia,serif">DOSPRESSO</text>
        <text x="40" y="44" text-anchor="middle" fill="#cc1f1f" font-size="7" font-family="Georgia,serif">AKADEMi</text>
        <line x1="25" y1="50" x2="55" y2="50" stroke="#d4af37" stroke-width="0.5"/>
        <text x="40" y="58" text-anchor="middle" fill="#122549" font-size="6" font-family="Georgia,serif">ONAY</text>
      </svg>
    </div>
    <div style="text-align:center">
      <div class="sig-line"></div>
      <p class="sig-name">${signerName || "DOSPRESSO"}</p>
      <p class="sig-title">${signerTitle || "Eğitim Müdürü"}</p>
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
