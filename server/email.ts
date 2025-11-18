import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
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
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
    console.log(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
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
