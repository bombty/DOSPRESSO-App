export interface ActionTemplate {
  key: string;
  labelTr: string;
  messageTemplate: string;
  defaultActionType: 'send_notification' | 'create_task' | 'both';
}

export const ACTION_TEMPLATES: Record<string, ActionTemplate> = {
  overdue_stock_count: {
    key: 'overdue_stock_count',
    labelTr: 'Gecikmiş Stok Sayımı',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde stok sayımı gecikmiştir. En kısa sürede stok sayımını tamamlamanızı rica ederiz. Gecikme süresi: {details}.',
    defaultActionType: 'send_notification',
  },
  low_performance: {
    key: 'low_performance',
    labelTr: 'Düşük Performans Uyarısı',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde performans skorları beklenenin altında seyretmektedir (Skor: {details}). Performans iyileştirme planı hazırlanması ve birebir görüşme yapılması gerekmektedir.',
    defaultActionType: 'both',
  },
  missing_checklist: {
    key: 'missing_checklist',
    labelTr: 'Eksik Checklist',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde {details} checklist\'i tamamlanmamıştır. Lütfen en kısa sürede kontrol ediniz.',
    defaultActionType: 'send_notification',
  },
  maintenance_overdue: {
    key: 'maintenance_overdue',
    labelTr: 'Gecikmiş Bakım',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde {details} bakımı gecikmiştir. Lütfen bakım planlaması yapınız ve ilgili teknisyenle iletişime geçiniz.',
    defaultActionType: 'create_task',
  },
  capa_overdue: {
    key: 'capa_overdue',
    labelTr: 'Gecikmiş Düzeltici Aksiyon',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde atanmış düzeltici aksiyon (CAPA) {details} gündür tamamlanmamıştır. Lütfen aksiyonu öncelikli olarak tamamlayınız.',
    defaultActionType: 'both',
  },
  low_customer_rating: {
    key: 'low_customer_rating',
    labelTr: 'Düşük Müşteri Memnuniyeti',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde müşteri memnuniyet puanı düşük seyretmektedir ({details}). Müşteri geri bildirimlerini inceleyip iyileştirme adımları atmanızı rica ederiz.',
    defaultActionType: 'send_notification',
  },
  training_overdue: {
    key: 'training_overdue',
    labelTr: 'Gecikmiş Eğitim',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde {details} eğitim modülü tamamlanmamıştır. Lütfen eğitim programını takip ediniz.',
    defaultActionType: 'send_notification',
  },
  branch_inactivity: {
    key: 'branch_inactivity',
    labelTr: 'Şube İnaktivite Uyarısı',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde {details} gündür operasyonel aktivite kaydedilmemiştir. Lütfen durumu kontrol ediniz.',
    defaultActionType: 'both',
  },
  onboarding_stuck: {
    key: 'onboarding_stuck',
    labelTr: 'Onboarding Takılmış',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde yeni personelin onboarding süreci {details} gündür ilerlememiştir. Lütfen mentör ile koordinasyon sağlayınız.',
    defaultActionType: 'send_notification',
  },
  fault_unresolved: {
    key: 'fault_unresolved',
    labelTr: 'Çözülmemiş Arıza',
    messageTemplate: 'Sayın {targetName}, {branchName} şubesinde {details} arıza kaydı halen çözüme kavuşturulamamıştır. Lütfen teknik ekiple koordinasyon sağlayarak çözüm sürecini hızlandırınız.',
    defaultActionType: 'create_task',
  },
  generic_reminder: {
    key: 'generic_reminder',
    labelTr: 'Genel Hatırlatma',
    messageTemplate: 'Sayın {targetName}, {details}',
    defaultActionType: 'send_notification',
  },
};

export function resolveTemplate(
  templateKey: string,
  variables: Record<string, string>
): string {
  const template = ACTION_TEMPLATES[templateKey];
  if (!template) {
    return variables.details || 'Lütfen kontrol ediniz.';
  }
  let msg = template.messageTemplate;
  for (const [key, value] of Object.entries(variables)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return msg;
}

export function getTemplateForSuggestionType(suggestionMessage: string): string {
  const msg = suggestionMessage.toLowerCase();
  if (msg.includes('stok') && (msg.includes('sayım') || msg.includes('düşük') || msg.includes('kritik'))) return 'overdue_stock_count';
  if (msg.includes('performans') || msg.includes('skor') || msg.includes('düşük puan')) return 'low_performance';
  if (msg.includes('checklist') || msg.includes('tamamlanma')) return 'missing_checklist';
  if (msg.includes('bakım') || msg.includes('maintenance')) return 'maintenance_overdue';
  if (msg.includes('capa') || msg.includes('düzeltici')) return 'capa_overdue';
  if (msg.includes('müşteri') || msg.includes('memnuniyet') || msg.includes('puan')) return 'low_customer_rating';
  if (msg.includes('eğitim') || msg.includes('modül') || msg.includes('kurs')) return 'training_overdue';
  if (msg.includes('inaktif') || msg.includes('aktivite yok')) return 'branch_inactivity';
  if (msg.includes('onboarding') || msg.includes('başlatılmamış')) return 'onboarding_stuck';
  if (msg.includes('arıza') || msg.includes('fault')) return 'fault_unresolved';
  return 'generic_reminder';
}

export function getAvailableTemplates(): Array<{ key: string; labelTr: string; defaultActionType: string }> {
  return Object.values(ACTION_TEMPLATES).map(t => ({
    key: t.key,
    labelTr: t.labelTr,
    defaultActionType: t.defaultActionType,
  }));
}
