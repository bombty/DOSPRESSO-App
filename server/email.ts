import nodemailer from 'nodemailer';

// Use SMTP as primary, can be extended with Resend
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });
  } catch (error) {
    console.error('Email send error:', error);
    // Don't throw - notifications are best-effort
  }
}

// Send notification email
export async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' = 'info'
): Promise<void> {
  const colorMap = {
    info: '#3498db',
    warning: '#f39c12',
    error: '#e74c3c',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { border-left: 4px solid ${colorMap[type]}; padding: 15px; background-color: #f9f9f9; }
        .title { color: ${colorMap[type]}; font-weight: bold; font-size: 16px; }
        .message { margin: 10px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="alert">
          <div class="title">${title}</div>
          <div class="message">${message.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="footer">
          <p>DOSPRESSO Franchise Management System<br>Bu otomatik bir emaildir.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to,
    subject: title,
    html,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:5000'}/reset-password/${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2c3e50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Şifre Sıfırlama Talebi</h2>
        <p>Merhaba,</p>
        <p>DOSPRESSO hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
        <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
        <p>Veya aşağıdaki linki tarayıcınıza kopyalayın:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>Bu link 1 saat geçerlidir.</strong></p>
        <p>Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
        <div class="footer">
          <p>DOSPRESSO Franchise Management System<br>Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'DOSPRESSO - Şifre Sıfırlama',
    html,
  });
}

export async function sendWelcomeEmail(email: string, username: string, temporaryPassword: string): Promise<void> {
  const loginUrl = `${process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:5000'}/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .credentials { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2c3e50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>DOSPRESSO'ya Hoş Geldiniz!</h2>
        <p>Merhaba,</p>
        <p>Hesabınız onaylandı ve sisteme giriş yapabilirsiniz.</p>
        <div class="credentials">
          <p><strong>Kullanıcı Adı:</strong> ${username}</p>
          <p><strong>Geçici Şifre:</strong> ${temporaryPassword}</p>
        </div>
        <p><strong>Önemli:</strong> İlk girişte lütfen şifrenizi değiştirin.</p>
        <a href="${loginUrl}" class="button">Giriş Yap</a>
        <div class="footer">
          <p>DOSPRESSO Franchise Management System<br>Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'DOSPRESSO - Hoş Geldiniz!',
    html,
  });
}

export async function sendApprovalRequestEmail(adminEmail: string, userName: string, userEmail: string, branchName?: string): Promise<void> {
  const approvalUrl = `${process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:5000'}/admin/user-approvals`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .user-info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2c3e50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Yeni Kullanıcı Onay Talebi</h2>
        <p>Merhaba,</p>
        <p>Sistemde yeni bir kullanıcı kaydı yapıldı ve onayınızı bekliyor:</p>
        <div class="user-info">
          <p><strong>Ad Soyad:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          ${branchName ? `<p><strong>Şube:</strong> ${branchName}</p>` : '<p><strong>Tür:</strong> Merkez (HQ)</p>'}
        </div>
        <p>Kullanıcıyı onaylamak veya reddetmek için yönetim paneline gidin:</p>
        <a href="${approvalUrl}" class="button">Onay Paneline Git</a>
        <div class="footer">
          <p>DOSPRESSO Franchise Management System<br>Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: adminEmail,
    subject: 'DOSPRESSO - Yeni Kullanıcı Onay Talebi',
    html,
  });
}

export async function sendRejectionEmail(email: string, reason?: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Kayıt Talebiniz Hakkında</h2>
        <p>Merhaba,</p>
        <p>Maalesef DOSPRESSO sistemine kayıt talebiniz onaylanmadı.</p>
        ${reason ? `<p><strong>Sebep:</strong> ${reason}</p>` : ''}
        <p>Daha fazla bilgi için lütfen yöneticinizle iletişime geçin.</p>
        <div class="footer">
          <p>DOSPRESSO Franchise Management System<br>Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'DOSPRESSO - Kayıt Talebi Hakkında',
    html,
  });
}

export async function sendFeedbackThankYouEmail(
  email: string,
  options: {
    customerName?: string | null;
    branchName: string;
    feedbackType: 'feedback' | 'complaint';
    requiresContact: boolean;
    rating: number;
  }
): Promise<void> {
  const { customerName, branchName, feedbackType, requiresContact, rating } = options;
  const greeting = customerName ? `Sayın ${customerName}` : 'Değerli Misafirimiz';

  let mainMessage = '';
  let additionalMessage = '';
  let subjectLine = '';
  let accentColor = '#7c3aed';

  if (feedbackType === 'complaint') {
    subjectLine = 'DOSPRESSO - Geri Bildiriminiz Alındı';
    accentColor = '#e74c3c';
    mainMessage = `
      <p>Yaşadığınız olumsuz deneyim için içtenlikle özür dileriz. Geri bildiriminiz bizim için son derece değerlidir.</p>
      <p>Şikayetiniz ilgili ekibimize iletilmiştir ve <strong>en geç 24 saat içinde</strong> sizinle iletişime geçilecektir.</p>
      <p>Misafir memnuniyeti önceliğimizdir ve bu durumun tekrarlanmaması için gerekli önlemler alınacaktır.</p>
    `;
  } else if (rating <= 2) {
    subjectLine = 'DOSPRESSO - Geri Bildiriminiz Alındı';
    accentColor = '#f39c12';
    mainMessage = `
      <p>Yaşadığınız deneyimden memnun kalmadığınızı görüyoruz ve bunun için özür dileriz.</p>
      <p>Geri bildiriminiz ilgili ekibimize iletilmiştir. Hizmet kalitemizi artırmak için değerli görüşlerinizi dikkate alacağız.</p>
    `;
  } else {
    subjectLine = 'DOSPRESSO - Teşekkür Ederiz!';
    accentColor = '#27ae60';
    mainMessage = `
      <p>Geri bildiriminiz için çok teşekkür ederiz! Görüşleriniz, hizmet kalitemizi sürekli iyileştirmemize yardımcı oluyor.</p>
      <p>Sizi tekrar ${branchName} şubemizde ağırlamaktan mutluluk duyarız.</p>
    `;
  }

  if (requiresContact) {
    additionalMessage = `
      <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 15px 0;">
        <p style="margin: 0; font-weight: bold; color: #e65100;">Yanıt Talebiniz Alındı</p>
        <p style="margin: 5px 0 0;">En kısa sürede sizinle iletişime geçilecektir. Tahmini yanıt süresi: <strong>24 saat</strong></p>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${accentColor}; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 22px; }
        .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        .branch-name { font-weight: bold; color: ${accentColor}; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>DOSPRESSO</h1>
        </div>
        <div class="content">
          <p style="font-size: 16px;">${greeting},</p>
          <p><span class="branch-name">${branchName}</span> şubemize yaptığınız ziyaret ve paylaştığınız değerlendirme için teşekkür ederiz.</p>
          ${mainMessage}
          ${additionalMessage}
          <p style="margin-top: 20px;">Saygılarımızla,<br><strong>DOSPRESSO Ailesi</strong></p>
        </div>
        <div class="footer">
          <p>DOSPRESSO Franchise Management System<br>Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: subjectLine,
    html,
  });
}

export async function sendEmployeeOfMonthEmail(
  email: string, 
  employeeName: string, 
  branchName: string, 
  monthYear: string,
  totalScore: number
): Promise<void> {
  const dashboardUrl = `${process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:5000'}/performansim`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ffd700, #ff8c00); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 28px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .star { font-size: 48px; margin-bottom: 10px; }
        .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .score-box { background: linear-gradient(135deg, #4caf50, #2e7d32); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .score-box .score { font-size: 36px; font-weight: bold; }
        .score-box .label { font-size: 14px; opacity: 0.9; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2c3e50; color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        .highlight { background-color: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="star">⭐</div>
          <h1>Tebrikler!</h1>
        </div>
        <div class="content">
          <p style="font-size: 18px;">Sevgili <strong>${employeeName}</strong>,</p>
          
          <div class="highlight">
            <p style="margin: 0;"><strong>${monthYear}</strong> dönemi için <strong>${branchName}</strong> şubesinde <strong>AYIN ELEMANI</strong> seçildiniz!</p>
          </div>
          
          <p>Göstermiş olduğunuz üstün performans, öz veri ve takım ruhu ile bu başarıyı hak ettiniz. Çalışma arkadaşlarınız ve yöneticileriniz sizinle gurur duyuyor.</p>
          
          <div class="score-box">
            <div class="label">Genel Performans Puanınız</div>
            <div class="score">${totalScore.toFixed(1)}/100</div>
          </div>
          
          <p>Bu başarınız profil sayfanızda ve şube panelinde sergilenecektir. Ayrıntılı performans raporunuzu aşağıdaki linkten görüntüleyebilirsiniz:</p>
          
          <center>
            <a href="${dashboardUrl}" class="button">Performansımı Gör</a>
          </center>
          
          <p>Başarılarınızın devamını diliyoruz!</p>
          
          <p style="margin-top: 20px;">Saygılarımızla,<br><strong>DOSPRESSO Aileniz</strong></p>
        </div>
        <div class="footer">
          <p>DOSPRESSO Franchise Management System<br>Bu otomatik bir emaildir.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `🏆 Tebrikler! ${monthYear} Ayın Elemanı Seçildiniz`,
    html,
  });
}
