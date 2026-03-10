import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, type UserRoleType, type TrainingModule } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Save, Eye, Plus, Trash2, ChevronUp, ChevronDown,
  BookOpen, ListChecks, HelpCircle, Video, Theater, ClipboardList,
  Sparkles, Upload, FileText, Coffee, Utensils, Leaf, IceCream,
  Heart, Shield, AlertTriangle, Users, Store, Sparkle, Package,
  Warehouse, GraduationCap, Clock, Globe, Loader2, X, Play,
  Layout, Sun, Snowflake, Send, CheckCircle, XCircle, Wand2
} from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import type { LucideIcon } from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface TemplateStep {
  stepNumber: number;
  title: string;
  content: string;
}

interface TemplateQuiz {
  questionId: string;
  questionType: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

interface ModuleTemplate {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  estimatedDuration: number;
  requiredForRole: string[];
  moduleType: string;
  learningObjectives: string[];
  steps: TemplateStep[];
  quiz: TemplateQuiz[];
}

const MODULE_TEMPLATES: ModuleTemplate[] = [
  {
    id: "dospresso-hikaye",
    icon: Heart,
    title: "DOSPRESSO Hikayesi & Kültür",
    description: "Şirket hikayesi, değerler, büyük resmin parçası olmak",
    category: "kultur",
    level: "beginner",
    estimatedDuration: 20,
    requiredForRole: ["stajyer", "bar_buddy"],
    moduleType: "onboarding",
    learningObjectives: [
      "DOSPRESSO'nun kuruluş hikayesini ve vizyonunu anlamak",
      "Marka değerlerini ve kültürünü içselleştirmek",
      "Ekibin bir parçası olmanın önemini kavramak",
      "Misafir odaklı yaklaşımı benimsemek"
    ],
    steps: [
      { stepNumber: 1, title: "DOSPRESSO Nasıl Doğdu?", content: "DOSPRESSO, kaliteli kahve deneyimini herkes için erişilebilir kılma vizyonuyla yola çıkmıştır. İlk şubemizden bugünkü büyük ailemize uzanan yolculuğumuzda, her zaman kalite ve samimiyet ön planda olmuştur." },
      { stepNumber: 2, title: "Değerlerimiz", content: "Kalite, tutku, samimiyet ve sürekli gelişim. DOSPRESSO'da bu dört değer her kararımızın temelini oluşturur. Her bardak kahve bu değerlerin bir yansımasıdır." },
      { stepNumber: 3, title: "Büyük Resmin Parçası Olmak", content: "Sen sadece bir çalışan değilsin, bir ailenin parçasısın. Misafirlerimize sunduğun her gülümseme, hazırladığın her içecek bu hikayenin bir parçası." },
      { stepNumber: 4, title: "Misafir Odaklı Yaklaşım", content: "Misafirlerimiz kapıdan girdiği andan itibaren kendilerini özel hissetmelidir. Göz teması, samimi bir selam ve ilgili bir tavır her şeyin başlangıcıdır." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "DOSPRESSO'nun temel değerleri nelerdir?", options: ["Hız ve verimlilik", "Kalite, tutku, samimiyet, sürekli gelişim", "Fiyat ve rekabet", "Teknoloji ve inovasyon"], correctOptionIndex: 1 },
      { questionId: "q2", questionType: "true_false", questionText: "DOSPRESSO'da misafir odaklı yaklaşım sadece yöneticilerin sorumluluğundadır.", options: ["Doğru", "Yanlış"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "guler-yuz",
    icon: Sparkle,
    title: "Güler Yüz & Psikolojik Dayanıklılık",
    description: "Gülümsemenin gücü, psikolojik zorluklar ve başa çıkma yolları",
    category: "soft-skills",
    level: "beginner",
    estimatedDuration: 25,
    requiredForRole: ["stajyer", "bar_buddy", "barista"],
    moduleType: "skill",
    learningObjectives: [
      "Güler yüzün müşteri memnuniyetine etkisini anlamak",
      "Zor müşteri durumlarında sakin kalma tekniklerini öğrenmek",
      "Stres yönetimi ve psikolojik dayanıklılık becerilerini geliştirmek",
      "Pozitif iletişim dilini benimsemek"
    ],
    steps: [
      { stepNumber: 1, title: "Gülümsemenin Bilimi", content: "Araştırmalar, samimi bir gülümsemenin müşteri memnuniyetini %40 artırdığını göstermektedir. Gülümseme bulaşıcıdır ve pozitif bir atmosfer yaratır." },
      { stepNumber: 2, title: "Zor Anlar İçin Teknikler", content: "Derin nefes alma, 5 saniye kuralı ve pozitif iç diyalog teknikleri ile zorlu anlarda sakinliğinizi koruyabilirsiniz." },
      { stepNumber: 3, title: "Stres Yönetimi", content: "Vardiya öncesi hazırlık ritüelleri, mola zamanlarını etkin kullanma ve ekip desteğinin önemi." },
      { stepNumber: 4, title: "Pozitif İletişim", content: "'Hayır' yerine alternatif sunma, empati kurma ve aktif dinleme teknikleri." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "Samimi bir gülümseme müşteri memnuniyetini yaklaşık ne kadar artırır?", options: ["%10", "%20", "%40", "%60"], correctOptionIndex: 2 },
      { questionId: "q2", questionType: "mcq", questionText: "Zor bir müşteri durumunda ilk yapılması gereken nedir?", options: ["Müdürü çağırmak", "Derin nefes alıp sakin kalmak", "Müşteriyi görmezden gelmek", "Konuyu tartışmak"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "temizlik-hijyen",
    icon: Sparkle,
    title: "Temizlik & Hijyen",
    description: "Temizlik protokolleri, bakteri bilgisi, hijyenin önemi",
    category: "hijyen",
    level: "beginner",
    estimatedDuration: 30,
    requiredForRole: ["stajyer", "bar_buddy", "barista", "supervisor_buddy", "supervisor"],
    moduleType: "skill",
    learningObjectives: [
      "Gıda hijyeni temel kurallarını bilmek",
      "Bakteri üremesini önleme yöntemlerini öğrenmek",
      "Günlük ve haftalık temizlik prosedürlerini uygulamak",
      "El hijyeni ve kişisel hijyen standartlarını kavramak"
    ],
    steps: [
      { stepNumber: 1, title: "Neden Hijyen?", content: "Gıda güvenliği, müşteri sağlığı ve marka güvenilirliği açısından hijyen en kritik konudur. Bir kontaminasyon vakası tüm şubenin kapanmasına yol açabilir." },
      { stepNumber: 2, title: "Bakteri Bilgisi", content: "Bakteriler 5°C-60°C arasında hızla çoğalır. Bu 'tehlike bölgesi'nde gıdalar en fazla 2 saat kalabilir. Soğuk zincirin kırılmaması hayati önem taşır." },
      { stepNumber: 3, title: "El Hijyeni", content: "Her işlem değişikliğinde, tuvaletten sonra, çiğ gıdaya dokunduktan sonra eller en az 20 saniye sabunlu su ile yıkanmalıdır." },
      { stepNumber: 4, title: "Günlük Temizlik Prosedürleri", content: "Açılış temizliği, vardiya arası temizlik, kapanış temizliği listelerini eksiksiz uygulama." },
      { stepNumber: 5, title: "Haftalık Derin Temizlik", content: "Ekipman detay temizliği, buzdolabı düzeni, depo kontrolü ve genel alan dezenfeksiyonu." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "Bakterilerin hızla çoğaldığı tehlike bölgesi hangi sıcaklık aralığıdır?", options: ["0°C - 5°C", "5°C - 60°C", "60°C - 100°C", "20°C - 40°C"], correctOptionIndex: 1 },
      { questionId: "q2", questionType: "true_false", questionText: "Eller en az 20 saniye sabunlu su ile yıkanmalıdır.", options: ["Doğru", "Yanlış"], correctOptionIndex: 0 },
      { questionId: "q3", questionType: "mcq", questionText: "Gıdalar tehlike bölgesinde en fazla ne kadar kalabilir?", options: ["30 dakika", "1 saat", "2 saat", "4 saat"], correctOptionIndex: 2 },
    ]
  },
  {
    id: "kahve-istasyonu",
    icon: Coffee,
    title: "Kahve İstasyonu",
    description: "Espresso hazırlama, süt köpürtme, kahve istasyonu düzeni",
    category: "istasyon",
    level: "intermediate",
    estimatedDuration: 45,
    requiredForRole: ["bar_buddy", "barista"],
    moduleType: "recipe",
    learningObjectives: [
      "Espresso çekme tekniğini doğru uygulamak",
      "Süt köpürtme sanatını öğrenmek",
      "Kahve istasyonunu verimli düzenlemek",
      "Kahve kalitesini etkileyen faktörleri bilmek",
      "Latte art temel tekniklerini uygulamak"
    ],
    steps: [
      { stepNumber: 1, title: "Espresso Temelleri", content: "Doğru öğütme inceliği, doz (18-20g), tamping basıncı (15kg) ve çekim süresi (25-30sn) espressonun dört temel parametresidir." },
      { stepNumber: 2, title: "Makine Hazırlığı", content: "Makine ısınması, grup kafası temizliği, öğütücü ayarı ve ilk atık çekim prosedürü." },
      { stepNumber: 3, title: "Süt Köpürtme", content: "Sütün sıcaklığı (60-65°C), köpürtme açısı, vorteks hareketi ve mikro-köpük oluşturma teknikleri." },
      { stepNumber: 4, title: "İçecek Standartları", content: "DOSPRESSO standart reçetelerine göre her içeceğin ölçüleri, süt/espresso oranları ve sunum kuralları." },
      { stepNumber: 5, title: "İstasyon Düzeni", content: "Bardak dizilimi, malzeme yerleşimi, temizlik malzemeleri erişimi ve iş akışı optimizasyonu." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "Standart bir espresso çekimi kaç saniye sürer?", options: ["15-20 saniye", "25-30 saniye", "35-40 saniye", "45-50 saniye"], correctOptionIndex: 1 },
      { questionId: "q2", questionType: "mcq", questionText: "Süt köpürtme için ideal sıcaklık nedir?", options: ["40-45°C", "50-55°C", "60-65°C", "70-75°C"], correctOptionIndex: 2 },
      { questionId: "q3", questionType: "true_false", questionText: "Tamping basıncı yaklaşık 15 kg olmalıdır.", options: ["Doğru", "Yanlış"], correctOptionIndex: 0 },
    ]
  },
  {
    id: "food-istasyonu",
    icon: Utensils,
    title: "Food İstasyonu",
    description: "Yiyecek hazırlama, sunum standartları, food safety",
    category: "istasyon",
    level: "intermediate",
    estimatedDuration: 35,
    requiredForRole: ["bar_buddy", "barista"],
    moduleType: "recipe",
    learningObjectives: [
      "Yiyecek hazırlama prosedürlerini öğrenmek",
      "Sunum standartlarını uygulamak",
      "Gıda güvenliği kurallarını bilmek",
      "Stok rotasyonunu doğru uygulamak"
    ],
    steps: [
      { stepNumber: 1, title: "Gıda Güvenliği Temelleri", content: "Çapraz kontaminasyonu önleme, eldiven kullanımı, alerjen yönetimi ve sıcaklık kontrolleri." },
      { stepNumber: 2, title: "Ürün Hazırlama", content: "Sandviç hazırlama, ısıtma prosedürleri, porsiyonlama ve tabak düzenleme standartları." },
      { stepNumber: 3, title: "Sunum Kuralları", content: "Her ürünün standart sunum şekli, garnitür kullanımı ve servis sıcaklığı kuralları." },
      { stepNumber: 4, title: "Stok Yönetimi", content: "FIFO prensibi, son kullanma tarihi kontrolü, günlük stok sayımı ve israf önleme." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "FIFO ne anlama gelir?", options: ["First In First Out", "Fast In Fast Out", "Food In Food Out", "Final Inspection Final Output"], correctOptionIndex: 0 },
      { questionId: "q2", questionType: "true_false", questionText: "Çapraz kontaminasyonu önlemek için çiğ ve pişmiş gıdalar aynı kesme tahtasında hazırlanabilir.", options: ["Doğru", "Yanlış"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "kriz-yonetimi",
    icon: AlertTriangle,
    title: "Kriz Yönetimi",
    description: "Acil durum prosedürleri, müşteri krizleri, iletişim protokolleri",
    category: "yonetim",
    level: "advanced",
    estimatedDuration: 30,
    requiredForRole: ["supervisor_buddy", "supervisor"],
    moduleType: "skill",
    learningObjectives: [
      "Kriz anında soğukkanlı karar verme becerisini geliştirmek",
      "Acil durum prosedürlerini bilmek ve uygulamak",
      "Müşteri şikayetlerini etkili yönetmek",
      "Ekip koordinasyonunu sağlamak"
    ],
    steps: [
      { stepNumber: 1, title: "Kriz Nedir?", content: "Mağaza arızaları, müşteri kazaları, gıda güvenliği ihlalleri, ekipman arızaları ve doğal afetler kriz durumları olarak tanımlanır." },
      { stepNumber: 2, title: "İlk Müdahale", content: "Sakin kal, durumu değerlendir, güvenliği sağla, yetkilileri bilgilendir. Bu dört adım her kriz için geçerlidir." },
      { stepNumber: 3, title: "Müşteri Krizleri", content: "Mutsuz müşteri durumunda: dinle, empati kur, çözüm sun, takip et. Asla savunmaya geçme." },
      { stepNumber: 4, title: "İletişim Protokolleri", content: "Kimin ne zaman aranacağı, sosyal medya krizleri, basın ile iletişim kuralları." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "Bir kriz anında ilk yapılması gereken nedir?", options: ["Sosyal medyada paylaşım yapmak", "Sakin kalıp durumu değerlendirmek", "Mağazayı kapatmak", "Tüm personeli toplamak"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "davranis-kodeksleri",
    icon: Users,
    title: "Davran\u0131\u015f Kodeksleri",
    description: "Stat\u00fc bazl\u0131 davran\u0131\u015f kurallar\u0131, profesyonel tutum",
    category: "davranis",
    level: "beginner",
    estimatedDuration: 20,
    requiredForRole: ["stajyer", "bar_buddy", "barista"],
    moduleType: "skill",
    learningObjectives: [
      "DOSPRESSO davran\u0131\u015f kodekslerini \u00f6\u011frenmek",
      "Stat\u00fc bazl\u0131 sorumluluklar\u0131 bilmek",
      "Profesyonel i\u015f eti\u011fini benimsemek",
      "Ekip i\u00e7i ileti\u015fim kurallar\u0131n\u0131 kavramak"
    ],
    steps: [
      { stepNumber: 1, title: "Genel Davran\u0131\u015f Kurallar\u0131", content: "Dakiklik, k\u0131yafet d\u00fczeni, telefon kullan\u0131m\u0131, ki\u015fisel bak\u0131m ve ma\u011faza i\u00e7i davran\u0131\u015f standartlar\u0131." },
      { stepNumber: 2, title: "Stajyer Davran\u0131\u015f Kodeksi", content: "\u00d6\u011frenmeye a\u00e7\u0131k olma, soru sorma, g\u00f6zlem yapma, notlar alma ve mentorunu dinleme." },
      { stepNumber: 3, title: "Barista Davran\u0131\u015f Kodeksi", content: "Kalite standartlar\u0131na uyum, h\u0131z-kalite dengesi, ekip \u00e7al\u0131\u015fmas\u0131 ve misafir ileti\u015fimi." },
      { stepNumber: 4, title: "Supervisor Davran\u0131\u015f Kodeksi", content: "Liderlik, problem \u00e7\u00f6zme, ekip motivasyonu, raporlama ve \u00fcst y\u00f6netimle ileti\u015fim." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "Vardiyaya ge\u00e7 kalmak durumunda ne yapmal\u0131s\u0131n\u0131z?", options: ["Hi\u00e7bir \u015fey, sessizce yerinize ge\u00e7in", "\u00d6nceden haber verip \u00f6z\u00fcr dilemek", "Ertesi g\u00fcn erken gelmek", "Ba\u015fkas\u0131n\u0131 g\u00f6ndermek"], correctOptionIndex: 1 },
      { questionId: "q2", questionType: "true_false", questionText: "Ma\u011fazada ki\u015fisel telefon kullan\u0131m\u0131 serbesttir.", options: ["Do\u011fru", "Yanl\u0131\u015f"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "misafir-agirlama",
    icon: Heart,
    title: "Misafir A\u011f\u0131rlama & Beden Dili",
    description: "Kar\u015f\u0131lama, beden dili, misafir deneyimi",
    category: "misafir",
    level: "beginner",
    estimatedDuration: 25,
    requiredForRole: ["stajyer", "bar_buddy", "barista"],
    moduleType: "skill",
    learningObjectives: [
      "Misafir kar\u015f\u0131lama protokol\u00fcn\u00fc uygulamak",
      "Olumlu beden dili tekniklerini kullanmak",
      "Sipari\u015f alma ve \u00f6neride bulunma becerisi geli\u015ftirmek",
      "Misafir \u015fikayet y\u00f6netimini \u00f6\u011frenmek"
    ],
    steps: [
      { stepNumber: 1, title: "Kar\u015f\u0131lama An\u0131", content: "G\u00f6z temas\u0131, samimi g\u00fcl\u00fcmseme, 'Ho\u015f geldiniz' ifadesi. \u0130lk 7 saniye izlenimi belirler." },
      { stepNumber: 2, title: "Beden Dili", content: "A\u00e7\u0131k duru\u015f, ba\u015f e\u011fme, el hareketleri ve y\u00fcz ifadesi. Kollar\u0131n\u0131z\u0131 kavu\u015fturmay\u0131n, g\u00f6z temas\u0131n\u0131 koruyun." },
      { stepNumber: 3, title: "Sipari\u015f Alma Sanat\u0131", content: "Aktif dinleme, \u00f6nerilerde bulunma, \u00f6zel istekleri not alma ve do\u011frulama." },
      { stepNumber: 4, title: "\u015eikayet Y\u00f6netimi", content: "Dinle \u2192 Empati kur \u2192 \u00d6z\u00fcr dile \u2192 \u00c7\u00f6z\u00fcm sun \u2192 Takip et." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "\u0130lk izlenimi olu\u015fturmak i\u00e7in ka\u00e7 saniyeniz var?", options: ["3 saniye", "7 saniye", "15 saniye", "30 saniye"], correctOptionIndex: 1 },
      { questionId: "q2", questionType: "mcq", questionText: "\u015eikayet y\u00f6netiminde ilk ad\u0131m nedir?", options: ["Savunma yapmak", "Dinlemek", "M\u00fcd\u00fcr\u00fc \u00e7a\u011f\u0131rmak", "Hediye vermek"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "magaza-duzeni",
    icon: Layout,
    title: "Ma\u011faza D\u00fczeni",
    description: "Ma\u011faza yerle\u015fimi, alan y\u00f6netimi, g\u00f6rsel standartlar",
    category: "magaza",
    level: "beginner",
    estimatedDuration: 20,
    requiredForRole: ["stajyer", "bar_buddy"],
    moduleType: "skill",
    learningObjectives: [
      "Ma\u011faza b\u00f6lgelerini ve i\u015flevlerini bilmek",
      "G\u00f6rsel standartlar\u0131 uygulamak",
      "A\u00e7\u0131l\u0131\u015f ve kapan\u0131\u015f d\u00fczeni kontrol listesini bilmek"
    ],
    steps: [
      { stepNumber: 1, title: "Ma\u011faza B\u00f6lgeleri", content: "Bar alan\u0131, oturma alan\u0131, kasa, depo, personel alan\u0131. Her b\u00f6lgenin sorumluluklar\u0131 ve standartlar\u0131." },
      { stepNumber: 2, title: "Masa & Sandalye D\u00fczeni", content: "Masa hizalamas\u0131, sandalye yerle\u015fimi, temizlik kontrol\u00fc ve misafir konforu." },
      { stepNumber: 3, title: "Vitrin & G\u00f6rsel", content: "Vitrin d\u00fczeni, \u00fcr\u00fcn sergileme, men\u00fc board g\u00fcncellemesi ve mevsimsel dekorasyon." }
    ],
    quiz: [
      { questionId: "q1", questionType: "true_false", questionText: "Masalar her misafirden sonra temizlenmelidir.", options: ["Do\u011fru", "Yanl\u0131\u015f"], correctOptionIndex: 0 },
    ]
  },
  {
    id: "apron-dis-alan",
    icon: Sun,
    title: "Apron & D\u0131\u015f Alan",
    description: "D\u0131\u015f alan temizli\u011fi, apron b\u00f6lgesi bak\u0131m\u0131",
    category: "hijyen",
    level: "beginner",
    estimatedDuration: 15,
    requiredForRole: ["stajyer", "bar_buddy"],
    moduleType: "skill",
    learningObjectives: [
      "D\u0131\u015f alan temizlik protokollerini uygulamak",
      "Apron b\u00f6lgesini d\u00fczenli tutmak",
      "Mevsimsel d\u0131\u015f alan haz\u0131rl\u0131klar\u0131n\u0131 bilmek"
    ],
    steps: [
      { stepNumber: 1, title: "D\u0131\u015f Alan Temizli\u011fi", content: "Zemin temizli\u011fi, masa silme, \u00e7\u00f6p kontrol\u00fc, k\u00fcllük temizli\u011fi ve bitki bak\u0131m\u0131." },
      { stepNumber: 2, title: "Apron B\u00f6lgesi", content: "Apron d\u00fczeni, temizli\u011fi, mevsimsel ayarlamalar. Ya\u011fmurda ve r\u00fczgarda al\u0131nacak \u00f6nlemler." },
      { stepNumber: 3, title: "Tabela & G\u00f6rsel", content: "D\u0131\u015f tabela kontrol\u00fc, A-board yerle\u015fimi ve d\u0131\u015f g\u00f6r\u00fcn\u00fcm standartlar\u0131." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "D\u0131\u015f alan ne s\u0131kl\u0131kla kontrol edilmelidir?", options: ["G\u00fcnde bir kez", "Her saat ba\u015f\u0131", "Haftalık", "Sadece m\u00fc\u015fteri \u015fikayetinde"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "hammadde-egitimi",
    icon: Package,
    title: "Hammadde E\u011fitimi",
    description: "Hammaddeler, depolama, kalite kontrol",
    category: "hammadde",
    level: "intermediate",
    estimatedDuration: 30,
    requiredForRole: ["bar_buddy", "barista"],
    moduleType: "skill",
    learningObjectives: [
      "Temel hammaddeleri tan\u0131mak ve \u00f6zelliklerini bilmek",
      "Do\u011fru depolama ko\u015fullar\u0131n\u0131 uygulamak",
      "Kalite kontrol noktalar\u0131n\u0131 bilmek",
      "Son kullanma tarihi takibini yapmak"
    ],
    steps: [
      { stepNumber: 1, title: "Kahve \u00c7e\u015fitleri", content: "Arabica vs Robusta, kavurma dereceleri, DOSPRESSO blend \u00f6zellikleri ve saklama ko\u015fullar\u0131." },
      { stepNumber: 2, title: "S\u00fct & S\u00fct \u00dcr\u00fcnleri", content: "S\u00fct t\u00fcrleri, so\u011fuk zincir, a\u00e7\u0131ld\u0131ktan sonra kullan\u0131m s\u00fcresi, bitkisel s\u00fct alternatifleri." },
      { stepNumber: 3, title: "\u015eurup & Soslar", content: "DOSPRESSO standart \u015furuplar\u0131, saklama ko\u015fullar\u0131, kullan\u0131m \u00f6l\u00e7\u00fcleri ve son kullanma takibi." },
      { stepNumber: 4, title: "Depolama Kurallar\u0131", content: "S\u0131cakl\u0131k kontrol\u00fc, nem y\u00f6netimi, FIFO uygulamas\u0131, etiketleme ve d\u00fczen." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "Arabica ve Robusta aras\u0131ndaki temel fark nedir?", options: ["Renk fark\u0131", "Kafein ve tat profili", "Boyut fark\u0131", "Fark yoktur"], correctOptionIndex: 1 },
      { questionId: "q2", questionType: "true_false", questionText: "A\u00e7\u0131lm\u0131\u015f s\u00fct oda s\u0131cakl\u0131\u011f\u0131nda b\u0131rak\u0131labilir.", options: ["Do\u011fru", "Yanl\u0131\u015f"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "urun-egitimi",
    icon: Coffee,
    title: "DOSPRESSO \u00dcr\u00fcn E\u011fitimi",
    description: "Men\u00fc bilgisi, \u00fcr\u00fcn \u00f6zellikleri, \u00f6neriler",
    category: "urun",
    level: "intermediate",
    estimatedDuration: 35,
    requiredForRole: ["bar_buddy", "barista"],
    moduleType: "recipe",
    learningObjectives: [
      "T\u00fcm men\u00fc \u00fcr\u00fcnlerini tan\u0131mak",
      "\u00dcr\u00fcn i\u00e7eriklerini ve alerjenleri bilmek",
      "Misafirlere do\u011fru \u00f6nerilerde bulunmak",
      "Mevsimsel \u00fcr\u00fcnleri takip etmek"
    ],
    steps: [
      { stepNumber: 1, title: "Classic Coffee", content: "Americano, Latte, Cappuccino, Mocha - Massivo ve Long Diva boyutlar\u0131, HOT ve ICED varyantlar." },
      { stepNumber: 2, title: "Special Latte", content: "Karamel, Vanilya, F\u0131nd\u0131k, Beyaz \u00c7ikolata Latte - \u00f6zel \u015furup \u00f6l\u00e7\u00fcleri ve sunum farkl\u0131l\u0131klar\u0131." },
      { stepNumber: 3, title: "Freshess & Frappe", content: "Taze meyve i\u00e7ecekleri ve frappe \u00e7e\u015fitleri - haz\u0131rlama teknikleri." },
      { stepNumber: 4, title: "Yiyecekler", content: "Donutlar, tatl\u0131lar, tuzlular - sunum standartlar\u0131 ve saklama ko\u015fullar\u0131." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "Massivo boyutu ka\u00e7 ml'dir?", options: ["200-250ml", "300-400ml", "550-650ml", "700ml+"], correctOptionIndex: 1 },
      { questionId: "q2", questionType: "mcq", questionText: "Long Diva boyutu ka\u00e7 ml'dir?", options: ["200-250ml", "300-400ml", "550-650ml", "700ml+"], correctOptionIndex: 2 },
    ]
  },
  {
    id: "depo-fifo",
    icon: Package,
    title: "Depo D\u00fczen & FIFO",
    description: "Depo y\u00f6netimi, FIFO uygulamas\u0131, stok kontrol",
    category: "depo",
    level: "beginner",
    estimatedDuration: 20,
    requiredForRole: ["stajyer", "bar_buddy", "barista"],
    moduleType: "skill",
    learningObjectives: [
      "FIFO prensibini do\u011fru uygulamak",
      "Depo d\u00fczeni standartlar\u0131n\u0131 bilmek",
      "Stok say\u0131m\u0131 yapmak",
      "Son kullanma tarihi takibini ger\u00e7ekle\u015ftirmek"
    ],
    steps: [
      { stepNumber: 1, title: "FIFO Nedir?", content: "First In First Out: \u0130lk giren ilk \u00e7\u0131kar. Eski \u00fcr\u00fcnler \u00f6ne, yeni \u00fcr\u00fcnler arkaya yerle\u015ftirilir." },
      { stepNumber: 2, title: "Depo D\u00fczeni", content: "Raf etiketleme, b\u00f6lge ayr\u0131m\u0131 (so\u011fuk/s\u0131cak/kuru), temizlik ve d\u00fczen kontrol\u00fc." },
      { stepNumber: 3, title: "Stok Say\u0131m\u0131", content: "G\u00fcnl\u00fck h\u0131zl\u0131 say\u0131m, haftal\u0131k detayl\u0131 say\u0131m ve ayl\u0131k envanter kontrol\u00fc." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "FIFO'da yeni gelen \u00fcr\u00fcnler nereye yerle\u015ftirilir?", options: ["\u00d6ne", "Arkaya", "Yukar\u0131ya", "Fark etmez"], correctOptionIndex: 1 },
      { questionId: "q2", questionType: "true_false", questionText: "FIFO sadece g\u0131da \u00fcr\u00fcnleri i\u00e7in ge\u00e7erlidir.", options: ["Do\u011fru", "Yanl\u0131\u015f"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "tea-istasyonu",
    icon: Coffee,
    title: "Tea \u0130stasyonu",
    description: "\u00c7ay haz\u0131rlama, bitki \u00e7aylar\u0131, demleme teknikleri",
    category: "istasyon",
    level: "intermediate",
    estimatedDuration: 25,
    requiredForRole: ["bar_buddy", "barista"],
    moduleType: "recipe",
    learningObjectives: [
      "\u00c7ay \u00e7e\u015fitlerini ve demleme s\u00fcrelerini bilmek",
      "Bitki \u00e7aylar\u0131n\u0131n \u00f6zelliklerini \u00f6\u011frenmek",
      "Tea istasyonunu verimli y\u00f6netmek"
    ],
    steps: [
      { stepNumber: 1, title: "\u00c7ay Temelleri", content: "Siyah \u00e7ay, ye\u015fil \u00e7ay, beyaz \u00e7ay - demleme s\u0131cakl\u0131klar\u0131 ve s\u00fcreleri. Her birinin ideal sunum \u015fekli." },
      { stepNumber: 2, title: "Bitki \u00c7aylar\u0131", content: "DOSPRESSO bitki \u00e7ay\u0131 koleksiyonu: papatya, nane, \u0131hlamur, ku\u015fburnu - \u00f6zellikleri ve \u00f6nerileri." },
      { stepNumber: 3, title: "\u0130stasyon Y\u00f6netimi", content: "\u00c7ay istasyonu d\u00fczeni, ekipman temizli\u011fi, stok kontrol\u00fc ve sunum standartlar\u0131." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "Ye\u015fil \u00e7ay ka\u00e7 derecede demlenir?", options: ["60-70\u00b0C", "70-80\u00b0C", "80-85\u00b0C", "100\u00b0C"], correctOptionIndex: 2 },
    ]
  },
  {
    id: "creamice-frappe",
    icon: Snowflake,
    title: "Creamice Frapp\u00e9 \u0130stasyonu",
    description: "Frapp\u00e9 haz\u0131rlama, dondurma, blender teknikleri",
    category: "istasyon",
    level: "intermediate",
    estimatedDuration: 25,
    requiredForRole: ["bar_buddy", "barista"],
    moduleType: "recipe",
    learningObjectives: [
      "Frapp\u00e9 \u00e7e\u015fitlerini ve re\u00e7etelerini bilmek",
      "Blender kullan\u0131m tekniklerini uygulamak",
      "Dondurma ve topping standartlar\u0131n\u0131 \u00f6\u011frenmek"
    ],
    steps: [
      { stepNumber: 1, title: "Frapp\u00e9 Temelleri", content: "Buz-s\u00fct-\u015furup oran\u0131, blender s\u00fcresi, k\u0131vam ayar\u0131 ve standart re\u00e7eteler." },
      { stepNumber: 2, title: "Creamice \u00d6zel", content: "Dondurmal\u0131 i\u00e7ecekler, frozen yogurt bazl\u0131 \u00fcr\u00fcnler, \u00f6zel topping ve soslar." },
      { stepNumber: 3, title: "Sunum & Dekorasyon", content: "Krem \u015fanti uygulama, topping s\u0131ras\u0131, bardak se\u00e7imi ve foto\u011fraf\u00e7\u0131 sunum." }
    ],
    quiz: [
      { questionId: "q1", questionType: "mcq", questionText: "Frapp\u00e9 haz\u0131rlarken buz oran\u0131 yakla\u015f\u0131k ne olmal\u0131d\u0131r?", options: ["%20", "%30-40", "%50-60", "%70+"], correctOptionIndex: 1 },
    ]
  },
  {
    id: "bos-sablon",
    icon: FileText,
    title: "Bo\u015f \u015eablon",
    description: "S\u0131f\u0131rdan kendi mod\u00fcl\u00fcn\u00fcz\u00fc olu\u015fturun",
    category: "genel",
    level: "beginner",
    estimatedDuration: 15,
    requiredForRole: [],
    moduleType: "general",
    learningObjectives: [],
    steps: [],
    quiz: []
  }
];

const CATEGORIES = [
  { value: "kultur", label: "Kültür & Hikaye" },
  { value: "soft-skills", label: "Soft Skills" },
  { value: "hijyen", label: "Temizlik & Hijyen" },
  { value: "istasyon", label: "İstasyon Eğitimi" },
  { value: "yonetim", label: "Yönetim" },
  { value: "hammadde", label: "Hammadde" },
  { value: "urun", label: "Ürün Eğitimi" },
  { value: "depo", label: "Depo & FIFO" },
  { value: "misafir", label: "Misafir Ağırlama" },
  { value: "magaza", label: "Mağaza Düzeni" },
  { value: "davranis", label: "Davranış Kodeksleri" },
  { value: "machine", label: "Makine Kullanımı" },
  { value: "genel", label: "Genel" },
];

const ROLE_OPTIONS = [
  { value: "stajyer", label: "Stajyer" },
  { value: "bar_buddy", label: "Bar Buddy" },
  { value: "barista", label: "Barista" },
  { value: "supervisor_buddy", label: "Supervisor Buddy" },
  { value: "supervisor", label: "Supervisor" },
];

const TARGET_ROLE_OPTIONS = [
  { value: "stajyer", label: "Stajyer" },
  { value: "bar_buddy", label: "Bar Buddy" },
  { value: "barista", label: "Barista" },
  { value: "supervisor_buddy", label: "Supervisor Buddy" },
  { value: "supervisor", label: "Supervisor" },
  { value: "mudur", label: "Müdür" },
  { value: "coach", label: "Coach" },
  { value: "admin", label: "Admin" },
  { value: "ceo", label: "CEO" },
  { value: "cgo", label: "CGO" },
  { value: "muhasebe_ik", label: "Muhasebe/İK" },
  { value: "satinalma", label: "Satınalma" },
  { value: "marketing", label: "Marketing" },
  { value: "trainer", label: "Trainer" },
  { value: "fabrika_mudur", label: "Fabrika Müdür" },
  { value: "fabrika_operator", label: "Fabrika Operatör" },
  { value: "inspector", label: "Denetçi" },
  { value: "kalite_kontrol", label: "Kalite Kontrol" },
  { value: "gida_muhendisi", label: "Gıda Mühendisi" },
];

interface StepItem {
  stepNumber: number;
  title: string;
  content: string;
  videoUrl?: string;
  imageUrl?: string;
}

interface QuizItem {
  questionId: string;
  questionType: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  points?: number;
}

interface ScenarioItem {
  scenarioId: string;
  title: string;
  description: string;
  expectedActions: string[];
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function YouTubePreview({ url }: { url: string }) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="relative w-full aspect-video rounded-md overflow-hidden mt-2">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube Video"
      />
    </div>
  );
}

export default function AcademyModuleEditor() {
  const [, params] = useRoute("/akademi-modul-editor/:id");
  const [, setLocation] = useLocation();
  const moduleId = params?.id ? parseInt(params.id) : null;
  const isNewModule = !moduleId;
  const { toast } = useToast();
  const { user } = useAuth();

  const canEdit = user ? hasPermission(user.role as UserRoleType, 'training', 'edit') : false;

  const [showTemplates, setShowTemplates] = useState(isNewModule);
  const [activeTab, setActiveTab] = useState("objectives");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<string>("beginner");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState("branch");
  const [estimatedDuration, setEstimatedDuration] = useState(30);
  const [moduleType, setModuleType] = useState("skill");
  const [requiredForRole, setRequiredForRole] = useState<string[]>([]);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isRequired, setIsRequired] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("");

  const [moduleStatus, setModuleStatus] = useState<string>("draft");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(5);
  const [mainVideoUrl, setMainVideoUrl] = useState("");
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; alt?: string; uploadedAt: number }>>([]);
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [supervisorChecklist, setSupervisorChecklist] = useState<string[]>([]);

  const { data: existingModule, isLoading, isError, refetch } = useQuery<TrainingModule>({
    queryKey: ['/api/training/modules', moduleId],
    queryFn: async () => {
      if (!moduleId) return null;
      const res = await fetch(`/api/training/modules/${moduleId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Module not found");
      return res.json();
    },
    enabled: !!moduleId,
  });

  useEffect(() => {
    if (existingModule) {
      setTitle(existingModule.title || "");
      setDescription(existingModule.description || "");
      setLevel(existingModule.level || "beginner");
      setCategory(existingModule.category || "");
      setScope(existingModule.scope || "branch");
      setEstimatedDuration(existingModule.estimatedDuration || 30);
      setModuleType(existingModule.moduleType || "skill");
      setRequiredForRole(existingModule.requiredForRole || []);
      setTargetRoles((existingModule as any).targetRoles || []);
      setIsPublished(existingModule.isPublished || false);
      setIsRequired(existingModule.isRequired || false);
      setHeroImageUrl(existingModule.heroImageUrl || "");
      setLearningObjectives(existingModule.learningObjectives || []);
      setSteps((existingModule.steps || []).map((s: any, i: number) => ({
        stepNumber: s.stepNumber || s.step_number || i + 1,
        title: s.title || "",
        content: s.content || "",
        videoUrl: s.videoUrl || "",
        imageUrl: s.imageUrl || "",
      })));
      setQuiz((existingModule.quiz || []).map((q: any) => ({
        questionId: q.questionId || q.question_id || `q${Date.now()}`,
        questionType: q.questionType || q.question_type || "mcq",
        questionText: q.questionText || q.question_text || "",
        options: q.options || [],
        correctOptionIndex: q.correctOptionIndex ?? q.correct_option_index ?? 0,
        explanation: q.explanation || "",
        points: q.points || 10,
      })));
      setMainVideoUrl(existingModule.mainVideoUrl || "");
      setGalleryImages(existingModule.galleryImages || []);
      setScenarios((existingModule.scenarioTasks || []).map((s: any) => ({
        scenarioId: s.scenarioId || s.scenario_id || `sc${Date.now()}`,
        title: s.title || "",
        description: s.description || "",
        expectedActions: s.expectedActions || s.tasks || [],
      })));
      setSupervisorChecklist(
        Array.isArray(existingModule.supervisorChecklist)
          ? existingModule.supervisorChecklist.map((item: any) => typeof item === 'string' ? item : item.title || item.description || "")
          : []
      );
      setModuleStatus((existingModule as any).status || "draft");
      setRejectionReason((existingModule as any).rejectionReason || "");
      setShowTemplates(false);
    }
  }, [existingModule]);

  const applyTemplate = (template: ModuleTemplate) => {
    setTitle(template.title);
    setDescription(template.description);
    setLevel(template.level);
    setCategory(template.category);
    setEstimatedDuration(template.estimatedDuration);
    setModuleType(template.moduleType);
    setRequiredForRole(template.requiredForRole);
    setLearningObjectives(template.learningObjectives);
    setSteps(template.steps.map(s => ({ ...s, videoUrl: "", imageUrl: "" })));
    setQuiz(template.quiz.map(q => ({ ...q, explanation: "", points: 10 })));
    setShowTemplates(false);
    toast({ title: "Şablon uygulandı", description: `"${template.title}" şablonu yüklendi.` });
  };

  const buildModulePayload = (publish?: boolean) => ({
    title,
    description,
    heroImageUrl,
    level,
    category,
    scope,
    estimatedDuration,
    moduleType,
    requiredForRole,
    targetRoles,
    isPublished: publish !== undefined ? publish : isPublished,
    isRequired,
    learningObjectives,
    steps: steps.map((s, i) => ({ stepNumber: i + 1, title: s.title, content: s.content, videoUrl: s.videoUrl, imageUrl: s.imageUrl })),
    quiz,
    mainVideoUrl,
    galleryImages,
    scenarioTasks: scenarios,
    supervisorChecklist,
    timeLimitMinutes,
    createdBy: user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (moduleId) {
        return apiRequest("PUT", `/api/training/modules/${moduleId}`, payload);
      } else {
        return apiRequest("POST", "/api/training/modules", payload);
      }
    },
    onSuccess: async (response) => {
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      if (moduleId) {
        queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
      }
      toast({ title: "Kaydedildi" });
      if (!moduleId && response) {
        try {
          const data = await response.json();
          if (data?.id) {
            setLocation(`/akademi-modul-editor/${data.id}`);
          }
        } catch {}
      }
    },
    onError: (error: any) => {
      toast({ title: "Kaydetme hatası", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = (publish?: boolean) => {
    if (!title.trim()) {
      toast({ title: "Başlık gerekli", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    saveMutation.mutate(buildModulePayload(publish), {
      onSettled: () => setIsSaving(false),
    });
  };

  const generateAIMutation = useMutation({
    mutationFn: async (inputText: string) => {
      const response = await apiRequest("POST", "/api/training/generate", {
        inputText,
        roleLevel: requiredForRole[0] || "stajyer",
        estimatedMinutes: estimatedDuration,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data?.module) {
        const m = data.module;
        if (m.learningObjectives?.length) setLearningObjectives(m.learningObjectives);
        if (m.steps?.length) setSteps(m.steps.map((s: any, i: number) => ({
          stepNumber: i + 1, title: s.title || "", content: s.content || "", videoUrl: "", imageUrl: ""
        })));
        if (m.quiz?.length) setQuiz(m.quiz.map((q: any) => ({
          questionId: q.questionId || `q${Date.now()}-${Math.random()}`,
          questionType: q.questionType || "mcq",
          questionText: q.questionText || "",
          options: q.options || [],
          correctOptionIndex: q.correctOptionIndex ?? 0,
          explanation: "", points: 10,
        })));
        if (m.title && !title) setTitle(m.title);
        if (m.description && !description) setDescription(m.description);
        toast({ title: "AI içerik oluşturuldu" });
      }
    },
    onError: (error: any) => {
      toast({ title: "AI hatası", description: error.message, variant: "destructive" });
    },
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      if (!moduleId) throw new Error("Modül önce kaydedilmelidir");
      return apiRequest("PATCH", `/api/academy/modules/${moduleId}/status`, { status: "pending_review" });
    },
    onSuccess: () => {
      setModuleStatus("pending_review");
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/modules/management"] });
      toast({ title: "Onaya gönderildi", description: "Modül inceleme için gönderildi." });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const aiEnrichMutation = useMutation({
    mutationFn: async () => {
      if (!moduleId) throw new Error("Modül önce kaydedilmelidir");
      const response = await apiRequest("POST", `/api/academy/modules/${moduleId}/ai-enrich`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
      toast({ title: "AI ile zenginleştirildi", description: "Modül içeriği AI tarafından geliştirildi." });
    },
    onError: (error: any) => {
      toast({ title: "AI zenginleştirme hatası", description: error.message, variant: "destructive" });
    },
  });

  const aiGenerateQuizMutation = useMutation({
    mutationFn: async () => {
      if (!moduleId) throw new Error("Modül önce kaydedilmelidir");
      const response = await apiRequest("POST", `/api/academy/ai-generate-quiz/${moduleId}`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data?.questions?.length) {
        const newQuiz = data.questions.map((q: any) => ({
          questionId: q.questionId || `q${Date.now()}-${Math.random()}`,
          questionType: q.questionType || "mcq",
          questionText: q.questionText || q.question || "",
          options: q.options || [],
          correctOptionIndex: q.correctOptionIndex ?? q.correctAnswerIndex ?? 0,
          explanation: q.explanation || "",
          points: q.points || 10,
        }));
        setQuiz(prev => [...prev, ...newQuiz]);
        toast({ title: "Quiz soruları oluşturuldu", description: `${newQuiz.length} yeni soru eklendi.` });
      } else {
        toast({ title: "AI quiz oluşturulamadı", description: "Lütfen önce modül içeriğini kaydedin.", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "AI quiz hatası", description: error.message, variant: "destructive" });
    },
  });

  const canApproveContent = user?.role && ["coach", "admin", "cgo", "academy_coach"].includes(user.role);

  const [aiInputText, setAiInputText] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);

  if (!user || !canEdit) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Yetkisiz Erişim</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
            <Button onClick={() => setLocation("/")} className="mt-4 w-full" data-testid="button-go-home">
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && moduleId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showTemplates && isNewModule) {
    return (
      <div className="min-h-screen p-3 sm:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={() => setLocation("/akademi-hq")} variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Yeni Modül Oluştur</h1>
            <p className="text-sm text-muted-foreground">Bir şablon seçin veya sıfırdan başlayın</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULE_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className="hover-elevate cursor-pointer"
                onClick={() => applyTemplate(template)}
                data-testid={`template-card-${template.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{template.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">{template.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {template.level === "beginner" ? "Başlangıç" : template.level === "intermediate" ? "Orta" : "İleri"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{template.estimatedDuration} dk</Badge>
                    <Badge variant="outline" className="text-xs">{template.steps.length} adım</Badge>
                    {template.quiz.length > 0 && (
                      <Badge variant="outline" className="text-xs">{template.quiz.length} soru</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => setShowTemplates(false)} data-testid="button-skip-template">
            Şablon Olmadan Devam Et
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button onClick={() => setLocation("/akademi-hq")} variant="outline" size="icon" data-testid="button-back-editor">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium truncate max-w-[200px]">{title || "Yeni Modül"}</span>
          {moduleStatus === "approved" && <Badge variant="default" data-testid="badge-module-status"><CheckCircle className="w-3 h-3 mr-1" />Onaylı</Badge>}
          {moduleStatus === "pending_review" && <Badge variant="outline" data-testid="badge-module-status"><Clock className="w-3 h-3 mr-1" />Onay Bekliyor</Badge>}
          {moduleStatus === "rejected" && <Badge variant="destructive" data-testid="badge-module-status"><XCircle className="w-3 h-3 mr-1" />Reddedildi</Badge>}
          {moduleStatus === "draft" && <Badge variant="secondary" data-testid="badge-module-status">Taslak</Badge>}
          {isPublished && <Badge variant="default">Yayında</Badge>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastSaved && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Son kayıt: {lastSaved.toLocaleTimeString("tr-TR")}
            </span>
          )}
          {moduleId && (
            <Button
              variant="outline"
              onClick={() => aiEnrichMutation.mutate()}
              disabled={aiEnrichMutation.isPending}
              data-testid="button-ai-enrich"
            >
              {aiEnrichMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              AI Zenginleştir
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            data-testid="button-save-draft"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Taslak Kaydet
          </Button>
          {moduleId && moduleStatus === "draft" && (
            <Button
              variant="outline"
              onClick={() => submitForReviewMutation.mutate()}
              disabled={submitForReviewMutation.isPending}
              data-testid="button-submit-review"
            >
              {submitForReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Onaya Gönder
            </Button>
          )}
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            data-testid="button-publish"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            Yayınla
          </Button>
        </div>
      </div>

      {moduleStatus === "rejected" && rejectionReason && (
        <div className="bg-destructive/10 border border-destructive/20 px-4 py-2 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Modül reddedildi</p>
            <p className="text-sm text-destructive/80" data-testid="text-rejection-reason">{rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r bg-muted/30 p-3 flex-shrink-0">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Modül Yapısı</h3>
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {[
              { id: "info", label: "Modül Bilgileri", icon: GraduationCap },
              { id: "objectives", label: "Hedefler", icon: ListChecks, count: learningObjectives.length },
              { id: "steps", label: "İçerik Adımları", icon: BookOpen, count: steps.length },
              { id: "quiz", label: "Quiz Soruları", icon: HelpCircle, count: quiz.length },
              { id: "media", label: "Video & Medya", icon: Video },
              { id: "scenarios", label: "Senaryolar", icon: Theater, count: scenarios.length },
              { id: "checklist", label: "Denetçi Listesi", icon: ClipboardList, count: supervisorChecklist.length },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                    activeTab === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">{item.count}</Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-3 sm:p-6 max-w-4xl overflow-y-auto">
          {activeTab === "info" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Modül Bilgileri</h2>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="title">Başlık</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Modül başlığı" data-testid="input-title" />
                </div>

                <div>
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Modül açıklaması" rows={3} data-testid="input-description" />
                </div>

                <ImageUploader
                  value={heroImageUrl}
                  onChange={setHeroImageUrl}
                  purpose="cover"
                  label="Kapak Fotoğrafı"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Seviye</Label>
                    <Select value={level} onValueChange={setLevel} data-testid="select-level">
                      <SelectTrigger data-testid="select-level-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Başlangıç</SelectItem>
                        <SelectItem value="intermediate">Orta</SelectItem>
                        <SelectItem value="advanced">İleri</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Kategori</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger data-testid="select-category-trigger">
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Kapsam</Label>
                    <Select value={scope} onValueChange={setScope}>
                      <SelectTrigger data-testid="select-editor-scope">
                        <SelectValue placeholder="Kapsam seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="branch">Şube Eğitimi</SelectItem>
                        <SelectItem value="factory">Fabrika Eğitimi</SelectItem>
                        <SelectItem value="both">Her İkisi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="duration">Tahmini Süre (dk)</Label>
                    <Input id="duration" type="number" min={1} value={estimatedDuration} onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 1)} data-testid="input-duration" />
                  </div>

                  <div>
                    <Label>Modül Tipi</Label>
                    <Select value={moduleType} onValueChange={setModuleType}>
                      <SelectTrigger data-testid="select-module-type-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skill">Beceri (Skill)</SelectItem>
                        <SelectItem value="recipe">Reçete (Recipe)</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="general">Genel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Zorunlu Roller</Label>
                  <div className="flex flex-wrap gap-3">
                    {ROLE_OPTIONS.map((role) => (
                      <label key={role.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={requiredForRole.includes(role.value)}
                          onCheckedChange={(checked) => {
                            setRequiredForRole(prev =>
                              checked ? [...prev, role.value] : prev.filter(r => r !== role.value)
                            );
                          }}
                          data-testid={`checkbox-role-${role.value}`}
                        />
                        {role.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Hedef Roller (Gorebilecek Roller)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Bos birakilirsa tum roller gorebilir</p>
                  <div className="flex flex-wrap gap-3">
                    {TARGET_ROLE_OPTIONS.map((role) => (
                      <label key={role.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={targetRoles.includes(role.value)}
                          onCheckedChange={(checked) => {
                            setTargetRoles(prev =>
                              checked ? [...prev, role.value] : prev.filter(r => r !== role.value)
                            );
                          }}
                          data-testid={`checkbox-target-role-${role.value}`}
                        />
                        {role.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={isPublished} onCheckedChange={setIsPublished} data-testid="switch-published" />
                    Yayinda
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={isRequired} onCheckedChange={setIsRequired} data-testid="switch-required" />
                    Zorunlu Modul
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "objectives" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">Öğrenme Hedefleri</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAiPanel(!showAiPanel)} data-testid="button-ai-objectives">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI ile Oluştur
                  </Button>
                  <Button size="sm" onClick={() => setLearningObjectives([...learningObjectives, ""])} data-testid="button-add-objective">
                    <Plus className="w-4 h-4 mr-2" />
                    Hedef Ekle
                  </Button>
                </div>
              </div>

              {showAiPanel && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <Textarea
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      placeholder="Modül konusuyla ilgili metin yapıştırın veya konu açıklaması yazın..."
                      rows={4}
                      data-testid="input-ai-text"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => generateAIMutation.mutate(aiInputText || `${title}: ${description}`)}
                        disabled={generateAIMutation.isPending}
                        data-testid="button-generate-ai"
                      >
                        {generateAIMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        AI ile İçerik Oluştur
                      </Button>
                      <Button variant="outline" onClick={() => setShowAiPanel(false)}>
                        Kapat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {learningObjectives.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Henüz hedef eklenmedi. Yukarıdaki butona tıklayın.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {learningObjectives.map((obj, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="text-sm text-muted-foreground mt-2 w-6 text-right flex-shrink-0">{idx + 1}.</span>
                      <Input
                        value={obj}
                        onChange={(e) => {
                          const updated = [...learningObjectives];
                          updated[idx] = e.target.value;
                          setLearningObjectives(updated);
                        }}
                        placeholder="Öğrenme hedefi..."
                        data-testid={`input-objective-${idx}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setLearningObjectives(learningObjectives.filter((_, i) => i !== idx))}
                        data-testid={`button-delete-objective-${idx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "steps" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">İçerik Adımları</h2>
                <Button
                  size="sm"
                  onClick={() => setSteps([...steps, { stepNumber: steps.length + 1, title: "", content: "", videoUrl: "", imageUrl: "" }])}
                  data-testid="button-add-step"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adım Ekle
                </Button>
              </div>

              {steps.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Henüz adım eklenmedi.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Adım {idx + 1}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={idx === 0}
                              onClick={() => {
                                const updated = [...steps];
                                [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                                setSteps(updated);
                              }}
                              data-testid={`button-step-up-${idx}`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={idx === steps.length - 1}
                              onClick={() => {
                                const updated = [...steps];
                                [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
                                setSteps(updated);
                              }}
                              data-testid={`button-step-down-${idx}`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                              data-testid={`button-delete-step-${idx}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input
                          value={step.title}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setSteps(updated);
                          }}
                          placeholder="Adım başlığı"
                          data-testid={`input-step-title-${idx}`}
                        />
                        <Textarea
                          value={step.content}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[idx] = { ...updated[idx], content: e.target.value };
                            setSteps(updated);
                          }}
                          placeholder="Adım içeriği..."
                          rows={4}
                          data-testid={`input-step-content-${idx}`}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">YouTube Video URL (opsiyonel)</Label>
                            <Input
                              value={step.videoUrl || ""}
                              onChange={(e) => {
                                const updated = [...steps];
                                updated[idx] = { ...updated[idx], videoUrl: e.target.value };
                                setSteps(updated);
                              }}
                              placeholder="https://youtube.com/watch?v=..."
                              data-testid={`input-step-video-${idx}`}
                            />
                            {step.videoUrl && <YouTubePreview url={step.videoUrl} />}
                          </div>
                          <div>
                            <ImageUploader
                              value={step.imageUrl || ""}
                              onChange={(url) => {
                                const newSteps = [...steps];
                                newSteps[idx].imageUrl = url;
                                setSteps(newSteps);
                              }}
                              purpose="step"
                              label="Adım Görseli"
                              compact
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "quiz" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">Quiz Soruları</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {moduleId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => aiGenerateQuizMutation.mutate()}
                      disabled={aiGenerateQuizMutation.isPending}
                      data-testid="button-ai-generate-quiz"
                    >
                      {aiGenerateQuizMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      AI ile Soru Oluştur
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setQuiz([...quiz, {
                      questionId: `q${Date.now()}`,
                      questionType: "mcq",
                      questionText: "",
                      options: ["", "", "", ""],
                      correctOptionIndex: 0,
                      explanation: "",
                      points: 10,
                    }])}
                    data-testid="button-add-quiz"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Soru Ekle
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="timer" className="text-sm whitespace-nowrap">Quiz Süresi (dk)</Label>
                    <Input
                      id="timer"
                      type="number"
                      min={1}
                      max={120}
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value) || 5)}
                      className="w-20"
                      data-testid="input-quiz-timer"
                    />
                    <span className="text-xs text-muted-foreground">{quiz.length} soru, {timeLimitMinutes} dakika</span>
                  </div>
                </CardContent>
              </Card>

              {quiz.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Henüz soru eklenmedi.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {quiz.map((q, idx) => (
                    <Card key={q.questionId}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">Soru {idx + 1}</Badge>
                          <div className="flex items-center gap-2">
                            <Select
                              value={q.questionType}
                              onValueChange={(val) => {
                                const updated = [...quiz];
                                updated[idx] = {
                                  ...updated[idx],
                                  questionType: val,
                                  options: val === "true_false" ? ["Doğru", "Yanlış"] : updated[idx].options.length < 2 ? ["", ""] : updated[idx].options,
                                };
                                setQuiz(updated);
                              }}
                            >
                              <SelectTrigger className="w-[140px]" data-testid={`select-question-type-${idx}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mcq">Çoktan Seçmeli</SelectItem>
                                <SelectItem value="true_false">Doğru/Yanlış</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setQuiz(quiz.filter((_, i) => i !== idx))}
                              data-testid={`button-delete-quiz-${idx}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea
                          value={q.questionText}
                          onChange={(e) => {
                            const updated = [...quiz];
                            updated[idx] = { ...updated[idx], questionText: e.target.value };
                            setQuiz(updated);
                          }}
                          placeholder="Soru metni..."
                          rows={2}
                          data-testid={`input-question-text-${idx}`}
                        />

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Seçenekler (doğru cevabı seçin)</Label>
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...quiz];
                                  updated[idx] = { ...updated[idx], correctOptionIndex: optIdx };
                                  setQuiz(updated);
                                }}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  q.correctOptionIndex === optIdx
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/30"
                                }`}
                                data-testid={`button-correct-option-${idx}-${optIdx}`}
                              >
                                {q.correctOptionIndex === optIdx && <span className="text-xs font-bold">&#10003;</span>}
                              </button>
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...quiz];
                                  const newOptions = [...updated[idx].options];
                                  newOptions[optIdx] = e.target.value;
                                  updated[idx] = { ...updated[idx], options: newOptions };
                                  setQuiz(updated);
                                }}
                                placeholder={`Seçenek ${optIdx + 1}`}
                                disabled={q.questionType === "true_false"}
                                data-testid={`input-option-${idx}-${optIdx}`}
                              />
                              {q.questionType === "mcq" && q.options.length > 2 && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const updated = [...quiz];
                                    const newOptions = updated[idx].options.filter((_, i) => i !== optIdx);
                                    const newCorrect = updated[idx].correctOptionIndex >= optIdx && updated[idx].correctOptionIndex > 0
                                      ? updated[idx].correctOptionIndex - 1
                                      : updated[idx].correctOptionIndex;
                                    updated[idx] = { ...updated[idx], options: newOptions, correctOptionIndex: Math.min(newCorrect, newOptions.length - 1) };
                                    setQuiz(updated);
                                  }}
                                  data-testid={`button-remove-option-${idx}-${optIdx}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {q.questionType === "mcq" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = [...quiz];
                                updated[idx] = { ...updated[idx], options: [...updated[idx].options, ""] };
                                setQuiz(updated);
                              }}
                              data-testid={`button-add-option-${idx}`}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Seçenek Ekle
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Açıklama (opsiyonel)</Label>
                            <Input
                              value={q.explanation || ""}
                              onChange={(e) => {
                                const updated = [...quiz];
                                updated[idx] = { ...updated[idx], explanation: e.target.value };
                                setQuiz(updated);
                              }}
                              placeholder="Doğru cevap açıklaması..."
                              data-testid={`input-explanation-${idx}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Puan</Label>
                            <Input
                              type="number"
                              min={1}
                              value={q.points || 10}
                              onChange={(e) => {
                                const updated = [...quiz];
                                updated[idx] = { ...updated[idx], points: parseInt(e.target.value) || 10 };
                                setQuiz(updated);
                              }}
                              data-testid={`input-points-${idx}`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "media" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Video & Medya</h2>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ana Video</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={mainVideoUrl}
                    onChange={(e) => setMainVideoUrl(e.target.value)}
                    placeholder="YouTube video URL yapıştırın..."
                    data-testid="input-main-video"
                  />
                  {mainVideoUrl && <YouTubePreview url={mainVideoUrl} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">Galeri Görselleri</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGalleryImages([...galleryImages, { url: "", alt: "", uploadedAt: Date.now() }])}
                      data-testid="button-add-gallery-image"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Görsel Ekle
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {galleryImages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">Henüz görsel eklenmedi.</p>
                  ) : (
                    <div className="space-y-3">
                      {galleryImages.map((img, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-2">
                            <ImageUploader
                              value={img.url}
                              onChange={(url) => {
                                const updated = [...galleryImages];
                                updated[idx] = { ...updated[idx], url };
                                setGalleryImages(updated);
                              }}
                              purpose="gallery"
                              label={`Galeri Görseli ${idx + 1}`}
                              compact
                            />
                            <Input
                              value={img.alt || ""}
                              onChange={(e) => {
                                const updated = [...galleryImages];
                                updated[idx] = { ...updated[idx], alt: e.target.value };
                                setGalleryImages(updated);
                              }}
                              placeholder="Alt metin..."
                              data-testid={`input-gallery-alt-${idx}`}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))}
                            data-testid={`button-delete-gallery-${idx}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "scenarios" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">Senaryolar</h2>
                <Button
                  size="sm"
                  onClick={() => setScenarios([...scenarios, { scenarioId: `sc${Date.now()}`, title: "", description: "", expectedActions: [] }])}
                  data-testid="button-add-scenario"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Senaryo Ekle
                </Button>
              </div>

              {scenarios.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Henüz senaryo eklenmedi.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {scenarios.map((sc, idx) => (
                    <Card key={sc.scenarioId}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">Senaryo {idx + 1}</Badge>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setScenarios(scenarios.filter((_, i) => i !== idx))}
                            data-testid={`button-delete-scenario-${idx}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input
                          value={sc.title}
                          onChange={(e) => {
                            const updated = [...scenarios];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setScenarios(updated);
                          }}
                          placeholder="Senaryo başlığı"
                          data-testid={`input-scenario-title-${idx}`}
                        />
                        <Textarea
                          value={sc.description}
                          onChange={(e) => {
                            const updated = [...scenarios];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setScenarios(updated);
                          }}
                          placeholder="Senaryo açıklaması..."
                          rows={3}
                          data-testid={`input-scenario-desc-${idx}`}
                        />
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Beklenen Aksiyonlar</Label>
                          {sc.expectedActions.map((action, actionIdx) => (
                            <div key={actionIdx} className="flex gap-2 mb-1">
                              <Input
                                value={action}
                                onChange={(e) => {
                                  const updated = [...scenarios];
                                  const newActions = [...updated[idx].expectedActions];
                                  newActions[actionIdx] = e.target.value;
                                  updated[idx] = { ...updated[idx], expectedActions: newActions };
                                  setScenarios(updated);
                                }}
                                placeholder="Beklenen aksiyon..."
                                data-testid={`input-scenario-action-${idx}-${actionIdx}`}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  const updated = [...scenarios];
                                  updated[idx] = { ...updated[idx], expectedActions: updated[idx].expectedActions.filter((_, i) => i !== actionIdx) };
                                  setScenarios(updated);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated = [...scenarios];
                              updated[idx] = { ...updated[idx], expectedActions: [...updated[idx].expectedActions, ""] };
                              setScenarios(updated);
                            }}
                            data-testid={`button-add-action-${idx}`}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Aksiyon Ekle
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "checklist" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">Denetçi Kontrol Listesi</h2>
                <Button
                  size="sm"
                  onClick={() => setSupervisorChecklist([...supervisorChecklist, ""])}
                  data-testid="button-add-checklist"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Madde Ekle
                </Button>
              </div>

              {supervisorChecklist.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Henüz kontrol maddesi eklenmedi.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {supervisorChecklist.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-sm text-muted-foreground w-6 text-right flex-shrink-0">{idx + 1}.</span>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = [...supervisorChecklist];
                          updated[idx] = e.target.value;
                          setSupervisorChecklist(updated);
                        }}
                        placeholder="Kontrol maddesi..."
                        data-testid={`input-checklist-${idx}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSupervisorChecklist(supervisorChecklist.filter((_, i) => i !== idx))}
                        data-testid={`button-delete-checklist-${idx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}