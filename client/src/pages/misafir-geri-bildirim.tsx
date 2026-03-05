import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, Loader2, MapPin, User, Sparkles, Brush, Package, Camera, X, Globe, AlertTriangle, Navigation } from "lucide-react";
import imageCompression from "browser-image-compression";
import logoImage from "@assets/old_board2_1767131525410.png";

interface BranchInfo {
  branch: { id: number; name: string; city: string; latitude?: number; longitude?: number };
  staff: { id: string; firstName: string; lastName: string }[];
}

interface FormSettings {
  branchId: number;
  bannerUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  welcomeMessageTr: string;
  welcomeMessageEn: string;
  welcomeMessageZh: string;
  welcomeMessageAr: string;
  welcomeMessageDe: string;
  welcomeMessageKo: string;
  welcomeMessageFr: string;
  showServiceRating: boolean;
  showCleanlinessRating: boolean;
  showProductRating: boolean;
  showStaffRating: boolean;
  showStaffSelection: boolean;
  showPhotoUpload: boolean;
  showFeedbackTypeSelection: boolean;
  showContactPreference: boolean;
  showCommentField: boolean;
  requireComment: boolean;
  allowAnonymous: boolean;
  defaultAnonymous: boolean;
  requireLocationVerification: boolean;
  maxDistanceFromBranch: number;
  availableLanguages: string[];
  defaultLanguage: string;
  isActive: boolean;
}

// Translations for 7 languages
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Geri Bildirim Formu",
    subtitle: "Görüşleriniz bizim için çok değerli",
    overallRating: "Genel Değerlendirme",
    required: "(Zorunlu)",
    optional: "(Opsiyonel)",
    detailedRating: "Detaylı Puanlama",
    serviceQuality: "Hizmet Kalitesi",
    cleanliness: "Temizlik",
    productQuality: "Ürün Kalitesi",
    staff: "Personel",
    selectStaff: "Hizmet Aldığınız Personel",
    selectStaffPlaceholder: "Personel seçin...",
    dontWantToSpecify: "Belirtmek istemiyorum",
    yourComment: "Yorumunuz",
    commentPlaceholder: "Deneyiminizi paylaşın...",
    addPhotos: "Fotoğraf Ekle",
    maxPhotos: "En fazla 3 fotoğraf",
    anonymous: "Anonim olarak gönder",
    contactInfo: "İletişim Bilgileriniz",
    name: "Adınız",
    namePlaceholder: "Ad Soyad",
    email: "E-posta",
    emailPlaceholder: "ornek@email.com",
    phone: "Telefon",
    phonePlaceholder: "05XX XXX XX XX",
    submit: "Geri Bildirimi Gönder",
    submitting: "Gönderiliyor...",
    thankYou: "Teşekkür Ederiz!",
    feedbackReceived: "Geri bildiriminiz başarıyla alındı. Değerli görüşleriniz için teşekkür ederiz.",
    invalidQr: "Geçersiz QR Kod",
    invalidQrDesc: "Bu QR kod artık geçerli değil veya şube bulunamadı.",
    alreadySubmitted: "Bugün Zaten Geri Bildirim Gönderdiniz",
    alreadySubmittedDesc: "Günde sadece bir kez geri bildirim gönderebilirsiniz. Yarın tekrar deneyebilirsiniz.",
    locationRequired: "Konum Doğrulama",
    locationRequiredDesc: "Geri bildirim göndermek için şubeye yakın olmanız gerekmektedir.",
    enableLocation: "Konumu Etkinleştir",
    locationVerified: "Konum doğrulandı",
    locationFailed: "Şubeden çok uzaktasınız",
    verifyingLocation: "Konum doğrulanıyor...",
    error: "Bir hata oluştu. Lütfen tekrar deneyin.",
    feedbackTypeLabel: "Bildirim Türü",
    feedbackOption: "Geri Bildirim",
    complaintOption: "Şikayet",
    requiresContact: "Cevap Bekliyorum",
    requiresContactDesc: "Size geri dönüş yapmamızı istiyorsanız işaretleyin",
    staffRequired: "Personel puanı verdiyseniz lütfen personel seçin",
  },
  en: {
    title: "Feedback Form",
    subtitle: "Your opinion is very valuable to us",
    overallRating: "Overall Rating",
    required: "(Required)",
    optional: "(Optional)",
    detailedRating: "Detailed Rating",
    serviceQuality: "Service Quality",
    cleanliness: "Cleanliness",
    productQuality: "Product Quality",
    staff: "Staff",
    selectStaff: "Staff Who Served You",
    selectStaffPlaceholder: "Select staff...",
    dontWantToSpecify: "Prefer not to say",
    yourComment: "Your Comment",
    commentPlaceholder: "Share your experience...",
    addPhotos: "Add Photos",
    maxPhotos: "Maximum 3 photos",
    anonymous: "Submit anonymously",
    contactInfo: "Your Contact Information",
    name: "Your Name",
    namePlaceholder: "Full Name",
    email: "Email",
    emailPlaceholder: "example@email.com",
    phone: "Phone",
    phonePlaceholder: "+1 XXX XXX XXXX",
    submit: "Submit Feedback",
    submitting: "Submitting...",
    thankYou: "Thank You!",
    feedbackReceived: "Your feedback has been received successfully. Thank you for your valuable input.",
    invalidQr: "Invalid QR Code",
    invalidQrDesc: "This QR code is no longer valid or the branch was not found.",
    alreadySubmitted: "You've Already Submitted Today",
    alreadySubmittedDesc: "You can only submit feedback once per day. Please try again tomorrow.",
    locationRequired: "Location Verification",
    locationRequiredDesc: "You need to be near the branch to submit feedback.",
    enableLocation: "Enable Location",
    locationVerified: "Location verified",
    locationFailed: "You are too far from the branch",
    verifyingLocation: "Verifying location...",
    error: "An error occurred. Please try again.",
    feedbackTypeLabel: "Feedback Type",
    feedbackOption: "Feedback",
    complaintOption: "Complaint",
    requiresContact: "I want a response",
    requiresContactDesc: "Check if you want us to contact you back",
    staffRequired: "Please select a staff member if you rated them",
  },
  zh: {
    title: "反馈表",
    subtitle: "您的意见对我们非常宝贵",
    overallRating: "总体评价",
    required: "(必填)",
    optional: "(选填)",
    detailedRating: "详细评分",
    serviceQuality: "服务质量",
    cleanliness: "清洁度",
    productQuality: "产品质量",
    staff: "员工",
    selectStaff: "为您服务的员工",
    selectStaffPlaceholder: "选择员工...",
    dontWantToSpecify: "不想说明",
    yourComment: "您的评论",
    commentPlaceholder: "分享您的体验...",
    addPhotos: "添加照片",
    maxPhotos: "最多3张照片",
    anonymous: "匿名提交",
    contactInfo: "您的联系方式",
    name: "您的姓名",
    namePlaceholder: "全名",
    email: "电子邮件",
    emailPlaceholder: "example@email.com",
    phone: "电话",
    phonePlaceholder: "+86 XXX XXXX XXXX",
    submit: "提交反馈",
    submitting: "提交中...",
    thankYou: "谢谢您！",
    feedbackReceived: "您的反馈已成功收到。感谢您的宝贵意见。",
    invalidQr: "无效的二维码",
    invalidQrDesc: "此二维码已失效或未找到分店。",
    alreadySubmitted: "您今天已经提交过了",
    alreadySubmittedDesc: "每天只能提交一次反馈。请明天再试。",
    locationRequired: "位置验证",
    locationRequiredDesc: "您需要在分店附近才能提交反馈。",
    enableLocation: "启用位置",
    locationVerified: "位置已验证",
    locationFailed: "您离分店太远",
    verifyingLocation: "正在验证位置...",
    error: "发生错误。请重试。",
    feedbackTypeLabel: "反馈类型",
    feedbackOption: "反馈",
    complaintOption: "投诉",
    requiresContact: "我需要回复",
    requiresContactDesc: "如果您希望我们联系您，请勾选",
    staffRequired: "如果您评价了员工，请选择员工",
  },
  ar: {
    title: "نموذج التعليقات",
    subtitle: "رأيك مهم جداً بالنسبة لنا",
    overallRating: "التقييم العام",
    required: "(مطلوب)",
    optional: "(اختياري)",
    detailedRating: "التقييم التفصيلي",
    serviceQuality: "جودة الخدمة",
    cleanliness: "النظافة",
    productQuality: "جودة المنتج",
    staff: "الموظفين",
    selectStaff: "الموظف الذي خدمك",
    selectStaffPlaceholder: "اختر الموظف...",
    dontWantToSpecify: "أفضل عدم التحديد",
    yourComment: "تعليقك",
    commentPlaceholder: "شارك تجربتك...",
    addPhotos: "إضافة صور",
    maxPhotos: "3 صور كحد أقصى",
    anonymous: "إرسال بشكل مجهول",
    contactInfo: "معلومات الاتصال الخاصة بك",
    name: "اسمك",
    namePlaceholder: "الاسم الكامل",
    email: "البريد الإلكتروني",
    emailPlaceholder: "example@email.com",
    phone: "الهاتف",
    phonePlaceholder: "+XXX XXX XXX",
    submit: "إرسال التعليق",
    submitting: "جاري الإرسال...",
    thankYou: "شكراً لك!",
    feedbackReceived: "تم استلام تعليقك بنجاح. شكراً لآرائك القيمة.",
    invalidQr: "رمز QR غير صالح",
    invalidQrDesc: "رمز QR هذا لم يعد صالحاً أو لم يتم العثور على الفرع.",
    alreadySubmitted: "لقد قمت بالإرسال اليوم بالفعل",
    alreadySubmittedDesc: "يمكنك إرسال تعليق مرة واحدة فقط في اليوم. يرجى المحاولة غداً.",
    locationRequired: "التحقق من الموقع",
    locationRequiredDesc: "يجب أن تكون بالقرب من الفرع لإرسال التعليقات.",
    enableLocation: "تفعيل الموقع",
    locationVerified: "تم التحقق من الموقع",
    locationFailed: "أنت بعيد جداً عن الفرع",
    verifyingLocation: "جاري التحقق من الموقع...",
    error: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    feedbackTypeLabel: "نوع الملاحظات",
    feedbackOption: "ملاحظات",
    complaintOption: "شكوى",
    requiresContact: "أريد رداً",
    requiresContactDesc: "حدد إذا كنت تريد منا الاتصال بك",
    staffRequired: "إذا قمت بتقييم الموظف، يرجى اختيار الموظف",
  },
  de: {
    title: "Feedback-Formular",
    subtitle: "Ihre Meinung ist uns sehr wichtig",
    overallRating: "Gesamtbewertung",
    required: "(Erforderlich)",
    optional: "(Optional)",
    detailedRating: "Detaillierte Bewertung",
    serviceQuality: "Servicequalität",
    cleanliness: "Sauberkeit",
    productQuality: "Produktqualität",
    staff: "Personal",
    selectStaff: "Mitarbeiter, der Sie bedient hat",
    selectStaffPlaceholder: "Mitarbeiter auswählen...",
    dontWantToSpecify: "Möchte ich nicht angeben",
    yourComment: "Ihr Kommentar",
    commentPlaceholder: "Teilen Sie Ihre Erfahrung...",
    addPhotos: "Fotos hinzufügen",
    maxPhotos: "Maximal 3 Fotos",
    anonymous: "Anonym absenden",
    contactInfo: "Ihre Kontaktdaten",
    name: "Ihr Name",
    namePlaceholder: "Vollständiger Name",
    email: "E-Mail",
    emailPlaceholder: "beispiel@email.com",
    phone: "Telefon",
    phonePlaceholder: "+49 XXX XXXXXXX",
    submit: "Feedback absenden",
    submitting: "Wird gesendet...",
    thankYou: "Vielen Dank!",
    feedbackReceived: "Ihr Feedback wurde erfolgreich empfangen. Vielen Dank für Ihre wertvollen Anregungen.",
    invalidQr: "Ungültiger QR-Code",
    invalidQrDesc: "Dieser QR-Code ist nicht mehr gültig oder die Filiale wurde nicht gefunden.",
    alreadySubmitted: "Sie haben heute bereits eingereicht",
    alreadySubmittedDesc: "Sie können nur einmal pro Tag Feedback einreichen. Bitte versuchen Sie es morgen erneut.",
    locationRequired: "Standortverifizierung",
    locationRequiredDesc: "Sie müssen sich in der Nähe der Filiale befinden, um Feedback einzureichen.",
    enableLocation: "Standort aktivieren",
    locationVerified: "Standort verifiziert",
    locationFailed: "Sie sind zu weit von der Filiale entfernt",
    verifyingLocation: "Standort wird überprüft...",
    error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    feedbackTypeLabel: "Feedback-Typ",
    feedbackOption: "Feedback",
    complaintOption: "Beschwerde",
    requiresContact: "Ich möchte eine Antwort",
    requiresContactDesc: "Ankreuzen, wenn Sie möchten, dass wir Sie kontaktieren",
    staffRequired: "Bitte wählen Sie einen Mitarbeiter, wenn Sie ihn bewertet haben",
  },
  ko: {
    title: "피드백 양식",
    subtitle: "귀하의 의견은 저희에게 매우 소중합니다",
    overallRating: "전체 평가",
    required: "(필수)",
    optional: "(선택)",
    detailedRating: "상세 평가",
    serviceQuality: "서비스 품질",
    cleanliness: "청결도",
    productQuality: "제품 품질",
    staff: "직원",
    selectStaff: "서비스를 제공한 직원",
    selectStaffPlaceholder: "직원 선택...",
    dontWantToSpecify: "지정하고 싶지 않음",
    yourComment: "귀하의 의견",
    commentPlaceholder: "경험을 공유하세요...",
    addPhotos: "사진 추가",
    maxPhotos: "최대 3장",
    anonymous: "익명으로 제출",
    contactInfo: "연락처 정보",
    name: "이름",
    namePlaceholder: "전체 이름",
    email: "이메일",
    emailPlaceholder: "example@email.com",
    phone: "전화번호",
    phonePlaceholder: "+82 XXX XXXX XXXX",
    submit: "피드백 제출",
    submitting: "제출 중...",
    thankYou: "감사합니다!",
    feedbackReceived: "피드백이 성공적으로 접수되었습니다. 소중한 의견 감사드립니다.",
    invalidQr: "잘못된 QR 코드",
    invalidQrDesc: "이 QR 코드는 더 이상 유효하지 않거나 지점을 찾을 수 없습니다.",
    alreadySubmitted: "오늘 이미 제출하셨습니다",
    alreadySubmittedDesc: "하루에 한 번만 피드백을 제출할 수 있습니다. 내일 다시 시도해 주세요.",
    locationRequired: "위치 확인",
    locationRequiredDesc: "피드백을 제출하려면 지점 근처에 있어야 합니다.",
    enableLocation: "위치 활성화",
    locationVerified: "위치 확인됨",
    locationFailed: "지점에서 너무 멀리 있습니다",
    verifyingLocation: "위치 확인 중...",
    error: "오류가 발생했습니다. 다시 시도해 주세요.",
    feedbackTypeLabel: "피드백 유형",
    feedbackOption: "피드백",
    complaintOption: "불만",
    requiresContact: "답변을 원합니다",
    requiresContactDesc: "연락을 원하시면 체크하세요",
    staffRequired: "직원을 평가했다면 직원을 선택해 주세요",
  },
  fr: {
    title: "Formulaire de commentaires",
    subtitle: "Votre avis nous est très précieux",
    overallRating: "Évaluation globale",
    required: "(Obligatoire)",
    optional: "(Facultatif)",
    detailedRating: "Évaluation détaillée",
    serviceQuality: "Qualité du service",
    cleanliness: "Propreté",
    productQuality: "Qualité des produits",
    staff: "Personnel",
    selectStaff: "Personnel qui vous a servi",
    selectStaffPlaceholder: "Sélectionner le personnel...",
    dontWantToSpecify: "Je préfère ne pas préciser",
    yourComment: "Votre commentaire",
    commentPlaceholder: "Partagez votre expérience...",
    addPhotos: "Ajouter des photos",
    maxPhotos: "Maximum 3 photos",
    anonymous: "Soumettre anonymement",
    contactInfo: "Vos coordonnées",
    name: "Votre nom",
    namePlaceholder: "Nom complet",
    email: "E-mail",
    emailPlaceholder: "exemple@email.com",
    phone: "Téléphone",
    phonePlaceholder: "+33 X XX XX XX XX",
    submit: "Soumettre les commentaires",
    submitting: "Envoi en cours...",
    thankYou: "Merci !",
    feedbackReceived: "Vos commentaires ont été reçus avec succès. Merci pour vos précieuses suggestions.",
    invalidQr: "Code QR invalide",
    invalidQrDesc: "Ce code QR n'est plus valide ou l'établissement n'a pas été trouvé.",
    alreadySubmitted: "Vous avez déjà soumis aujourd'hui",
    alreadySubmittedDesc: "Vous ne pouvez soumettre des commentaires qu'une fois par jour. Veuillez réessayer demain.",
    locationRequired: "Vérification de la localisation",
    locationRequiredDesc: "Vous devez être près de l'établissement pour soumettre des commentaires.",
    enableLocation: "Activer la localisation",
    locationVerified: "Localisation vérifiée",
    locationFailed: "Vous êtes trop loin de l'établissement",
    verifyingLocation: "Vérification de la localisation...",
    error: "Une erreur s'est produite. Veuillez réessayer.",
    feedbackTypeLabel: "Type de commentaire",
    feedbackOption: "Commentaire",
    complaintOption: "Réclamation",
    requiresContact: "Je souhaite une réponse",
    requiresContactDesc: "Cochez si vous souhaitez que nous vous contactions",
    staffRequired: "Veuillez sélectionner un membre du personnel si vous l'avez évalué",
  },
};

const languageFlags: Record<string, { flag: string; name: string }> = {
  tr: { flag: "🇹🇷", name: "Türkçe" },
  en: { flag: "🇬🇧", name: "English" },
  zh: { flag: "🇨🇳", name: "中文" },
  ar: { flag: "🇸🇦", name: "العربية" },
  de: { flag: "🇩🇪", name: "Deutsch" },
  ko: { flag: "🇰🇷", name: "한국어" },
  fr: { flag: "🇫🇷", name: "Français" },
};

// Calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate device fingerprint
function getDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('fingerprint', 10, 10);
  const canvasData = canvas.toDataURL();
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    canvasData.slice(0, 50),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export default function MisafirGeriBildirim() {
  const { token } = useParams<{ token: string }>();
  const [lang, setLang] = useState("tr");
  const [rating, setRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [productRating, setProductRating] = useState(0);
  const [staffRating, setStaffRating] = useState(0);
  const [staffId, setStaffId] = useState("");
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'complaint'>('feedback');
  const [requiresContact, setRequiresContact] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [alreadySubmittedToday, setAlreadySubmittedToday] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'verifying' | 'verified' | 'failed' | 'skipped'>('pending');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [formStartedAt] = useState(() => new Date().toISOString());
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  const t = translations[lang];

  // Check if already submitted today
  useEffect(() => {
    const fingerprint = getDeviceFingerprint();
    const storageKey = `feedback_${token}_${fingerprint}`;
    const lastSubmission = localStorage.getItem(storageKey);
    
    if (lastSubmission) {
      const lastDate = new Date(lastSubmission);
      const today = new Date();
      if (lastDate.toDateString() === today.toDateString()) {
        setAlreadySubmittedToday(true);
      }
    }
  }, [token]);

  const { data: branchInfo, isLoading, error } = useQuery<BranchInfo>({
    queryKey: ['/api/feedback/branch', token],
    queryFn: async () => {
      const res = await fetch(`/api/feedback/branch/${token}`);
      if (!res.ok) throw new Error('Branch not found');
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch form settings for this branch
  const { data: formSettings } = useQuery<FormSettings | null>({
    queryKey: ['/api/feedback-form-settings/public', branchInfo?.branch.id],
    queryFn: async () => {
      const res = await fetch(`/api/feedback-form-settings/public/${branchInfo?.branch.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!branchInfo?.branch.id,
  });

  // Apply default settings from formSettings
  useEffect(() => {
    if (formSettings?.defaultLanguage) {
      setLang(formSettings.defaultLanguage);
    }
    // When allowAnonymous is false, force isAnonymous to false
    if (formSettings?.allowAnonymous === false) {
      setIsAnonymous(false);
    } else if (formSettings?.defaultAnonymous !== undefined) {
      setIsAnonymous(formSettings.defaultAnonymous);
    }
    // Skip location verification when disabled
    if (formSettings?.requireLocationVerification === false) {
      setLocationStatus('skipped');
    }
  }, [formSettings]);

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      setSubmitErrorMessage(null);
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const serverMessage = errorData?.message || 'Gönderim başarısız';
        throw new Error(serverMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      const fingerprint = getDeviceFingerprint();
      const storageKey = `feedback_${token}_${fingerprint}`;
      localStorage.setItem(storageKey, new Date().toISOString());
      setSubmitted(true);
    },
    onError: (error: Error) => {
      setSubmitErrorMessage(error.message);
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || photos.length >= 3) return;

    setUploadingPhoto(true);
    const newPhotos: { file: File; preview: string }[] = [];

    for (let i = 0; i < Math.min(files.length, 3 - photos.length); i++) {
      try {
        const compressed = await imageCompression(files[i], {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });
        const preview = URL.createObjectURL(compressed);
        newPhotos.push({ file: compressed, preview });
      } catch (err) {
        console.error("Photo compression failed:", err);
      }
    }

    setPhotos(prev => [...prev, ...newPhotos]);
    setUploadingPhoto(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const requestLocation = () => {
    setLocationStatus('verifying');
    
    if (!navigator.geolocation) {
      setLocationStatus('skipped');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Check distance to branch
        if (branchInfo?.branch.latitude && branchInfo?.branch.longitude) {
          const distance = calculateDistance(
            latitude, longitude,
            branchInfo.branch.latitude, branchInfo.branch.longitude
          );
          
          const maxDistance = formSettings?.maxDistanceFromBranch || 500;
          if (distance <= maxDistance) {
            setLocationStatus('verified');
          } else {
            setLocationStatus('failed');
          }
        } else {
          // No branch coordinates, skip verification
          setLocationStatus('skipped');
        }
      },
      () => {
        setLocationStatus('skipped');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const [staffValidationError, setStaffValidationError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    if (staffRating > 0 && !staffId && branchInfo && branchInfo.staff.length > 0 && (formSettings?.showStaffSelection !== false)) {
      setStaffValidationError(true);
      return;
    }
    setStaffValidationError(false);

    // Upload photos first
    const photoUrls: string[] = [];
    for (const photo of photos) {
      try {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('folder', 'feedback');
        
        const res = await fetch('/api/upload/public', {
          method: 'POST',
          body: formData,
        });
        
        if (res.ok) {
          const { url } = await res.json();
          photoUrls.push(url);
        }
      } catch (err) {
        console.error("Photo upload failed:", err);
      }
    }

    const fingerprint = getDeviceFingerprint();

    submitMutation.mutate({
      branchToken: token,
      rating,
      serviceRating: serviceRating || null,
      cleanlinessRating: cleanlinessRating || null,
      productRating: productRating || null,
      staffRating: staffRating || null,
      staffId: staffId || null,
      comment,
      customerName,
      customerEmail,
      customerPhone,
      isAnonymous,
      photoUrls,
      deviceFingerprint: fingerprint,
      userLatitude: userLocation?.lat || null,
      userLongitude: userLocation?.lng || null,
      language: lang,
      feedbackType,
      requiresContact,
      formStartedAt,
    });
  };

  const StarRating = ({ value, onChange, label, icon: Icon, required = false }: { 
    value: number; 
    onChange: (v: number) => void; 
    label: string; 
    icon?: any;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        {Icon && <Icon className="h-4 w-4 text-amber-600" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-all hover:scale-110 active:scale-95"
            data-testid={`star-${label.toLowerCase().replace(/\s/g, '-')}-${star}`}
          >
            <Star
              className={`h-10 w-10 transition-colors ${
                star <= value 
                  ? 'fill-amber-400 text-amber-400 drop-shadow-md' 
                  : 'text-gray-300 hover:text-amber-200'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  // Language Selector
  const LanguageSelector = () => (
    <div className="flex flex-wrap justify-center gap-2 mb-4">
      {Object.entries(languageFlags).map(([code, { flag, name }]) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
            lang === code 
              ? 'bg-amber-600 text-white shadow-md' 
              : 'bg-white/80 hover:bg-white text-gray-700 shadow'
          }`}
          data-testid={`lang-${code}`}
        >
          <span className="text-lg">{flag}</span>
          <span className="hidden sm:inline">{name}</span>
        </button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !branchInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 p-4">
        <img src={logoImage} alt="DOSPRESSO" className="h-24 mb-6 drop-shadow-lg" />
        <Card className="max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">{translations.tr.invalidQr}</h2>
            <p className="text-muted-foreground">{translations.tr.invalidQrDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySubmittedToday) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 p-4">
        <img src={logoImage} alt="DOSPRESSO" className="h-24 mb-6 drop-shadow-lg" />
        <LanguageSelector />
        <Card className="max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">{t.alreadySubmitted}</h2>
            <p className="text-muted-foreground">{t.alreadySubmittedDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-100 via-emerald-50 to-green-200 p-4">
        <img src={logoImage} alt="DOSPRESSO" className="h-24 mb-6 drop-shadow-lg" />
        <Card className="max-w-md text-center shadow-xl">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-20 w-20 mx-auto text-green-500 mb-4 drop-shadow-md" />
            <h2 className="text-2xl font-bold text-green-800 mb-3">{t.thankYou}</h2>
            <p className="text-muted-foreground mb-4">
              {t.feedbackReceived}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {branchInfo.branch.name} - {branchInfo.branch.city}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen p-4 py-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`}
      style={{ 
        background: formSettings?.backgroundColor 
          ? formSettings.backgroundColor 
          : 'linear-gradient(to bottom right, #fef3c7, #ffedd5, #fde68a)' 
      }}
    >
      <div className="max-w-lg mx-auto">
        {/* Banner Image */}
        {formSettings?.bannerUrl && (
          <div className="mb-4 rounded-xl overflow-hidden shadow-lg">
            <img 
              src={formSettings.bannerUrl} 
              alt="Banner" 
              className="w-full h-32 object-cover"
            />
          </div>
        )}

        {/* Header with Logo */}
        <div className="text-center mb-6">
          <img 
            src={formSettings?.logoUrl || logoImage} 
            alt="DOSPRESSO" 
            className="h-28 mx-auto mb-4 drop-shadow-lg"
          />
          <div className="bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 inline-block shadow-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{branchInfo.branch.name}</span>
              <span className="text-amber-600">•</span>
              <span>{branchInfo.branch.city}</span>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        <LanguageSelector />

        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader 
            className="text-white pb-4"
            style={{ 
              background: formSettings?.primaryColor 
                ? `linear-gradient(to right, ${formSettings.primaryColor}, ${formSettings.primaryColor}dd)` 
                : 'linear-gradient(to right, #f59e0b, #ea580c)' 
            }}
          >
            <CardTitle className="text-xl flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t.title}
            </CardTitle>
            <CardDescription className="text-amber-100">
              {(() => {
                if (!formSettings) return t.subtitle;
                switch (lang) {
                  case 'en': return formSettings.welcomeMessageEn || t.subtitle;
                  case 'de': return formSettings.welcomeMessageDe || t.subtitle;
                  case 'ar': return formSettings.welcomeMessageAr || t.subtitle;
                  case 'zh': return formSettings.welcomeMessageZh || t.subtitle;
                  case 'ko': return formSettings.welcomeMessageKo || t.subtitle;
                  case 'fr': return formSettings.welcomeMessageFr || t.subtitle;
                  default: return formSettings.welcomeMessageTr || t.subtitle;
                }
              })()}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location Status */}
              {formSettings?.requireLocationVerification !== false && locationStatus === 'pending' && branchInfo.branch.latitude && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Navigation className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">{t.locationRequired}</p>
                      <p className="text-xs text-blue-600 mt-1">{t.locationRequiredDesc}</p>
                      <Button 
                        type="button"
                        size="sm" 
                        className="mt-2"
                        onClick={requestLocation}
                      >
                        {t.enableLocation}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {locationStatus === 'verifying' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                  <span className="text-sm text-amber-800">{t.verifyingLocation}</span>
                </div>
              )}

              {locationStatus === 'verified' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-800">{t.locationVerified}</span>
                </div>
              )}

              {locationStatus === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-800">{t.locationFailed}</span>
                </div>
              )}

              {/* Feedback Type Selection */}
              {(formSettings?.showFeedbackTypeSelection !== false) && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    {t.feedbackTypeLabel}
                  </Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={feedbackType === 'feedback' ? 'default' : 'outline'}
                      className={`flex-1 ${feedbackType === 'feedback' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                      onClick={() => setFeedbackType('feedback')}
                      data-testid="button-feedback-type-feedback"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t.feedbackOption}
                    </Button>
                    <Button
                      type="button"
                      variant={feedbackType === 'complaint' ? 'default' : 'outline'}
                      className={`flex-1 ${feedbackType === 'complaint' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                      onClick={() => setFeedbackType('complaint')}
                      data-testid="button-feedback-type-complaint"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {t.complaintOption}
                    </Button>
                  </div>
                </div>
              )}

              {/* Overall Rating */}
              <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                <StarRating
                  value={rating}
                  onChange={setRating}
                  label={t.overallRating}
                  icon={Star}
                  required
                />
              </div>

              {/* Detailed Ratings */}
              {(formSettings?.showServiceRating !== false || formSettings?.showCleanlinessRating !== false || 
                formSettings?.showProductRating !== false || formSettings?.showStaffRating !== false) && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                    {t.detailedRating} 
                    <Badge variant="outline" className="text-xs">{t.optional}</Badge>
                  </p>
                  <div className="grid gap-4">
                    {(formSettings?.showServiceRating !== false) && (
                      <StarRating
                        value={serviceRating}
                        onChange={setServiceRating}
                        label={t.serviceQuality}
                        icon={Sparkles}
                      />
                    )}
                    {(formSettings?.showCleanlinessRating !== false) && (
                      <StarRating
                        value={cleanlinessRating}
                        onChange={setCleanlinessRating}
                        label={t.cleanliness}
                        icon={Brush}
                      />
                    )}
                    {(formSettings?.showProductRating !== false) && (
                      <StarRating
                        value={productRating}
                        onChange={setProductRating}
                        label={t.productQuality}
                        icon={Package}
                      />
                    )}
                    {(formSettings?.showStaffRating !== false) && (
                      <StarRating
                        value={staffRating}
                        onChange={setStaffRating}
                        label={t.staff}
                        icon={User}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Staff Selection */}
              {branchInfo.staff.length > 0 && (formSettings?.showStaffSelection !== false) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-600" />
                    {t.selectStaff}
                    {staffRating > 0 ? (
                      <span className="text-red-500 text-xs">{t.required}</span>
                    ) : (
                      <Badge variant="outline" className="text-xs">{t.optional}</Badge>
                    )}
                  </Label>
                  <Select value={staffId} onValueChange={(val) => { setStaffId(val === "_none" ? "" : val); setStaffValidationError(false); }}>
                    <SelectTrigger data-testid="select-staff" className={staffValidationError ? "border-red-500 ring-red-500" : ""}>
                      <SelectValue placeholder={t.selectStaffPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {!staffRating && <SelectItem value="_none">{t.dontWantToSpecify}</SelectItem>}
                      {branchInfo.staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {staffValidationError && (
                    <p className="text-red-500 text-sm" data-testid="text-staff-validation-error">{t.staffRequired}</p>
                  )}
                </div>
              )}

              {/* Comment */}
              {(formSettings?.showCommentField !== false) && (
                <div className="space-y-2">
                  <Label htmlFor="comment">
                    {t.yourComment}
                    {formSettings?.requireComment && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t.commentPlaceholder}
                    className="min-h-[100px]"
                    data-testid="input-comment"
                    required={formSettings?.requireComment}
                  />
                </div>
              )}

              {/* Photo Upload */}
              {(formSettings?.showPhotoUpload !== false) && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-amber-600" />
                    {t.addPhotos}
                    <Badge variant="outline" className="text-xs">{t.maxPhotos}</Badge>
                  </Label>
                  
                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={photo.preview} 
                            alt={`Photo ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {photos.length < 3 && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-upload"
                        disabled={uploadingPhoto}
                      />
                      <label htmlFor="photo-upload">
                        <Button
                          type="button"
                          variant="outline"
                          className="cursor-pointer"
                          disabled={uploadingPhoto}
                          asChild
                        >
                          <span>
                            {uploadingPhoto ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Yükleniyor...</>
                            ) : (
                              <><Camera className="h-4 w-4 mr-2" /> {t.addPhotos}</>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Anonymous Checkbox */}
              {(formSettings?.allowAnonymous !== false) && (
                <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(!!checked)}
                    data-testid="checkbox-anonymous"
                  />
                  <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                    {t.anonymous}
                  </Label>
                </div>
              )}

              {/* Requires Contact Checkbox */}
              {(formSettings?.showContactPreference !== false) && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Checkbox
                    id="requiresContact"
                    checked={requiresContact}
                    onCheckedChange={(checked) => setRequiresContact(!!checked)}
                    data-testid="checkbox-requires-contact"
                  />
                  <div className="flex flex-col">
                    <Label htmlFor="requiresContact" className="text-sm cursor-pointer font-medium text-blue-800">
                      {t.requiresContact}
                    </Label>
                    <span className="text-xs text-blue-600">{t.requiresContactDesc}</span>
                  </div>
                </div>
              )}

              {/* Contact Info (if not anonymous OR if requires contact) */}
              {(!isAnonymous || requiresContact) && (
                <div className="space-y-4 border-t pt-4">
                  <p className="text-sm font-medium text-amber-800">
                    {t.contactInfo}
                    {requiresContact && isAnonymous && (
                      <span className="ml-2 text-xs text-blue-600">
                        ({t.requiresContactDesc})
                      </span>
                    )}
                  </p>
                  {!isAnonymous && (
                    <div className="space-y-2">
                      <Label htmlFor="name">{t.name}</Label>
                      <Input
                        id="name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        data-testid="input-name"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.email} {requiresContact && <span className="text-red-500">*</span>}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      required={requiresContact}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t.phone} {requiresContact && <span className="text-red-500">*</span>}</Label>
                    <Input
                      id="phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={t.phonePlaceholder}
                      data-testid="input-phone"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-6 text-lg shadow-lg"
                disabled={rating === 0 || submitMutation.isPending || locationStatus === 'failed'}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t.submitting}</>
                ) : (
                  t.submit
                )}
              </Button>

              {submitMutation.isError && (
                <p className="text-sm text-red-500 text-center" data-testid="text-submit-error">
                  {submitErrorMessage || t.error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-amber-700/70 mt-4">
          DOSPRESSO Franchise Management System
        </p>
      </div>
    </div>
  );
}
