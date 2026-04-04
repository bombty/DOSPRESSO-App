import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModuleLayout, type KPIMetric } from "@/components/module-layout/ModuleLayout";
import type { SidebarSection } from "@/components/module-layout/ModuleSidebar";
import { Wrench, AlertTriangle, BarChart3, BookOpen, LayoutDashboard, Settings2, CheckCircle2, Clock, Calendar, Brain, Settings } from "lucide-react";

const EkipmanKatalog = lazy(() => import("./ekipman-katalog"));
const Equipment = lazy(() => import("./equipment"));
const FaultHub = lazy(() => import("./ariza"));
const EquipmentAnalytics = lazy(() => import("./ekipman-analitics"));
const ServisTakip = lazy(() => import("./yonetim/servis-talepleri"));
const EkipmanAyarlar = lazy(() => import("./yonetim/ekipman-yonetimi"));

// ═══ HQ DASHBOARD ═══
function HQEquipmentDashboard() {
  const { data: equipment = [] } = useQuery<any[]>({ queryKey: ["/api/equipment"] });
  const { data: faults = [] } = useQuery<any[]>({
    queryKey: ["/api/faults", "all"],
    queryFn: async () => { const r = await fetch("/api/faults?limit=500", { credentials: "include" }); const d = await r.json(); return d.data ?? d.faults ?? []; },
  });
  const openFaults = faults.filter((f: any) => f.status === "acik" || f.status === "devam_ediyor");
  const types = [...new Set(equipment.map((e: any) => e.equipmentType))].filter(Boolean);
  const overdue = equipment.filter((e: any) => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) <= new Date());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card><CardContent className="pt-3 pb-3 text-center"><div className="text-2xl font-bold">{equipment.length}</div><div className="text-xs text-muted-foreground">Toplam Ekipman</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center"><div className="text-2xl font-bold text-red-500">{openFaults.length}</div><div className="text-xs text-muted-foreground">Açık Arıza</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center"><div className="text-2xl font-bold text-yellow-500">{overdue.length}</div><div className="text-xs text-muted-foreground">Bakım Gecikmiş</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center"><div className="text-2xl font-bold">{[...new Set(equipment.map((e:any)=>e.branchId))].length}</div><div className="text-xs text-muted-foreground">Şube</div></CardContent></Card>
      </div>
      {openFaults.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-red-500">Açık Arızalar ({openFaults.length})</CardTitle></CardHeader><CardContent className="space-y-1.5 max-h-60 overflow-y-auto">
        {openFaults.slice(0,10).map((f:any)=>(<div key={f.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"><div className="flex-1 min-w-0"><span className="font-medium">{f.equipmentName||f.equipmentType}</span><span className="text-muted-foreground ml-2">{f.branchName}</span></div><Badge variant={f.priority==="kritik"?"destructive":"secondary"} className="text-[10px]">{f.priority}</Badge></div>))}
      </CardContent></Card>}
      {overdue.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-500">Bakım Gecikmiş ({overdue.length})</CardTitle></CardHeader><CardContent className="space-y-1.5 max-h-60 overflow-y-auto">
        {overdue.slice(0,10).map((e:any)=>(<div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"><div className="flex-1 min-w-0"><span className="font-medium">{e.modelNo||e.equipmentType}</span><span className="text-muted-foreground ml-2">{e.branchName}</span></div><span className="text-[10px] text-red-500">{new Date(e.nextMaintenanceDate).toLocaleDateString("tr-TR")}</span></div>))}
      </CardContent></Card>}
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Ekipman Tipi Dağılımı</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-1.5">
        {types.map(t=>{const c=equipment.filter((e:any)=>e.equipmentType===t).length;const fc=openFaults.filter((f:any)=>f.equipmentType===t).length;return(<Badge key={t} variant="outline" className={`text-xs ${fc>0?"border-red-500/50 text-red-500":""}`}>{t} ({c}) {fc>0&&`⚠${fc}`}</Badge>);})}
      </div></CardContent></Card>
    </div>
  );
}

// ═══ BAKIM TAKVİMİ ═══
function MaintenanceCalendar() {
  const { data: equipment = [] } = useQuery<any[]>({ queryKey: ["/api/equipment"] });
  const [filter, setFilter] = useState<"all"|"overdue"|"upcoming">("all");
  const now = new Date();
  const enriched = equipment.filter((e:any)=>e.nextMaintenanceDate).map((e:any)=>({...e,daysUntil:Math.ceil((new Date(e.nextMaintenanceDate).getTime()-now.getTime())/86400000)})).sort((a:any,b:any)=>a.daysUntil-b.daysUntil);
  const od = enriched.filter((e:any)=>e.daysUntil<=0);
  const up = enriched.filter((e:any)=>e.daysUntil>0&&e.daysUntil<=30);
  const filtered = filter==="overdue"?od:filter==="upcoming"?up:enriched;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Badge variant={filter==="all"?"default":"outline"} className="cursor-pointer text-xs" onClick={()=>setFilter("all")}>Tümü ({enriched.length})</Badge>
        <Badge variant={filter==="overdue"?"default":"outline"} className="cursor-pointer text-xs text-red-500" onClick={()=>setFilter("overdue")}>Gecikmiş ({od.length})</Badge>
        <Badge variant={filter==="upcoming"?"default":"outline"} className="cursor-pointer text-xs text-yellow-500" onClick={()=>setFilter("upcoming")}>30 Gün ({up.length})</Badge>
      </div>
      {filtered.length===0?<p className="text-sm text-muted-foreground text-center py-8">Bakım kaydı yok.</p>:(
        <div className="space-y-1.5">{filtered.map((e:any)=>(<Card key={e.id} className={e.daysUntil<=0?"border-red-500/30":e.daysUntil<=7?"border-yellow-500/30":""}><CardContent className="py-2 px-3"><div className="flex items-center justify-between"><div className="flex-1 min-w-0"><div className="text-sm font-medium">{e.modelNo||e.equipmentType}</div><div className="text-xs text-muted-foreground">{e.branchName} · {e.equipmentType} · {e.maintenanceResponsible==="hq"?"HQ":"Şube"}</div></div><div className="text-right shrink-0 ml-2"><div className={`text-xs font-medium ${e.daysUntil<=0?"text-red-500":e.daysUntil<=7?"text-yellow-500":"text-green-500"}`}>{e.daysUntil<=0?`${Math.abs(e.daysUntil)} gün gecikmiş`:`${e.daysUntil} gün`}</div><div className="text-[10px] text-muted-foreground">{new Date(e.nextMaintenanceDate).toLocaleDateString("tr-TR")}</div></div></div></CardContent></Card>))}</div>
      )}
    </div>
  );
}

// ═══ BİLGİ BANKASI ═══
function KnowledgeBase() {
  const { data: articles = [] } = useQuery<any[]>({ queryKey: ["/api/equipment-knowledge"], queryFn: async()=>{const r=await fetch("/api/equipment-knowledge",{credentials:"include"});return r.ok?r.json():[];} });
  const [selectedType, setSelectedType] = useState<string>("all");
  const [expanded, setExpanded] = useState<number|null>(null);
  const types = [...new Set(articles.map((a:any)=>a.equipmentType))].filter(Boolean).sort();
  const filtered = selectedType==="all"?articles:articles.filter((a:any)=>a.equipmentType===selectedType);
  const cats: Record<string,string> = {maintenance:"🔧 Bakım",troubleshooting:"⚠️ Sorun Giderme",usage:"📖 Kullanım",safety:"🛡️ Güvenlik",cleaning:"🧹 Temizlik"};

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant={selectedType==="all"?"default":"outline"} className="cursor-pointer text-xs" onClick={()=>setSelectedType("all")}>Tümü ({articles.length})</Badge>
        {types.map(t=>(<Badge key={t} variant={selectedType===t?"default":"outline"} className="cursor-pointer text-xs" onClick={()=>setSelectedType(t)}>{t} ({articles.filter((a:any)=>a.equipmentType===t).length})</Badge>))}
      </div>
      {filtered.length===0?(<div className="text-center py-8"><Brain className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Bilgi bankası makalesi yok.</p><p className="text-xs text-muted-foreground mt-1">Katalog'dan kılavuz ve troubleshooting adımları ekleyebilirsiniz.</p></div>):(
        <div className="space-y-1.5">{filtered.map((a:any)=>(<Card key={a.id} className="cursor-pointer" onClick={()=>setExpanded(expanded===a.id?null:a.id)}><CardContent className="py-2 px-3"><div className="flex items-center gap-2"><span className="text-sm">{cats[a.category]||"📄"}</span><span className="font-medium text-sm flex-1">{a.title}</span><Badge variant="outline" className="text-[10px]">{a.equipmentType}</Badge></div>{expanded===a.id&&<div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap border-t pt-2">{a.content}</div>}</CardContent></Card>))}</div>
      )}
    </div>
  );
}

// ═══ VIEW CONFIG ═══
interface ViewConfig { id: string; labelTr: string; icon: React.ReactNode; permissionModule?: string; section: string; component: any; }

const VIEWS: ViewConfig[] = [
  { id: "dashboard", labelTr: "Dashboard", icon: <LayoutDashboard />, permissionModule: "equipment", section: "yonetim", component: HQEquipmentDashboard },
  { id: "ekipman", labelTr: "Ekipman Listesi", icon: <Wrench />, permissionModule: "equipment", section: "yonetim", component: Equipment },
  { id: "katalog", labelTr: "Katalog & Kılavuzlar", icon: <BookOpen />, permissionModule: "equipment", section: "yonetim", component: EkipmanKatalog },
  { id: "ariza", labelTr: "Arıza Yönetimi", icon: <AlertTriangle />, permissionModule: "faults", section: "yonetim", component: FaultHub },
  { id: "servis", labelTr: "Servis Takip", icon: <Settings2 />, permissionModule: "equipment", section: "servis", component: ServisTakip },
  { id: "bakim", labelTr: "Bakım Takvimi", icon: <Calendar />, permissionModule: "equipment", section: "servis", component: MaintenanceCalendar },
  { id: "bilgi", labelTr: "Bilgi Bankası", icon: <Brain />, permissionModule: "equipment", section: "bilgi", component: KnowledgeBase },
  { id: "ayarlar", labelTr: "Ayarlar", icon: <Settings />, permissionModule: "equipment", section: "bilgi", component: EkipmanAyarlar },
  { id: "analitik", labelTr: "Analitik", icon: <BarChart3 />, permissionModule: "equipment_analytics", section: "bilgi", component: EquipmentAnalytics },
];

const VIEW_URL_MAP: Record<string,string> = { dashboard:"/ekipman/dashboard",katalog:"/ekipman/katalog",ekipman:"/ekipman",ariza:"/ekipman/ariza",servis:"/ekipman/servis",bakim:"/ekipman/bakim",bilgi:"/ekipman/bilgi",ayarlar:"/ekipman/ayarlar",analitik:"/ekipman/analitik" };

function getViewFromUrl(p: string): string|null {
  if(p.startsWith("/ekipman/dashboard"))return"dashboard";if(p.startsWith("/ekipman/katalog"))return"katalog";if(p.startsWith("/ekipman/ariza"))return"ariza";if(p.startsWith("/ekipman/servis"))return"servis";if(p.startsWith("/ekipman/bakim"))return"bakim";if(p.startsWith("/ekipman/bilgi"))return"bilgi";if(p.startsWith("/ekipman/ayarlar"))return"ayarlar";if(p.startsWith("/ekipman/analitik"))return"analitik";if(p==="/ekipman"||p==="/ekipman/")return"dashboard";return null;
}

function ContentSkeleton(){return(<div className="space-y-4"><div className="flex gap-4"><Skeleton className="h-24 w-48"/><Skeleton className="h-24 w-48"/><Skeleton className="h-24 w-48"/></div><Skeleton className="h-64 w-full"/></div>);}

export default function EkipmanMegaModule() {
  const { user } = useAuth();
  const { canAccess } = useDynamicPermissions();
  const [location, setLocation] = useLocation();
  const visibleViews = VIEWS.filter((v)=>{if(!v.permissionModule)return true;if(!user?.role)return false;if(user.role==="admin")return true;return canAccess(v.permissionModule!,"view");});
  const firstVisible = visibleViews[0]?.id||"dashboard";
  const initialView = getViewFromUrl(location);
  const [activeView, setActiveView] = useState(initialView&&visibleViews.find((v)=>v.id===initialView)?initialView:firstVisible);

  useEffect(()=>{const v=getViewFromUrl(location);if(v&&v!==activeView&&visibleViews.find((x)=>x.id===v))setActiveView(v);},[location,visibleViews]);
  useEffect(()=>{if(!visibleViews.find((v)=>v.id===activeView))setActiveView(firstVisible);},[visibleViews,activeView,firstVisible]);

  const handleViewChange=(viewId:string)=>{setActiveView(viewId);const url=VIEW_URL_MAP[viewId];if(url&&location!==url)setLocation(url);};

  const { data: equipmentStats } = useQuery<{total?:number;activeFaults?:number;maintenanceDue?:number;avgResolutionHours?:number;}>({ queryKey:["/api/equipment/stats"],enabled:!!user });

  const kpiMetrics: KPIMetric[] = [
    {label:"Toplam Ekipman",value:equipmentStats?.total??"—",icon:<Wrench className="h-4 w-4"/>},
    {label:"Aktif Arıza",value:equipmentStats?.activeFaults??"—",color:(equipmentStats?.activeFaults??0)>0?"text-red-500":undefined,icon:<AlertTriangle className="h-4 w-4"/>},
    {label:"Bakım Gereken",value:equipmentStats?.maintenanceDue??"—",icon:<CheckCircle2 className="h-4 w-4"/>},
    {label:"Ort. Çözüm",value:equipmentStats?.avgResolutionHours!=null?`${equipmentStats.avgResolutionHours}s`:"—",icon:<Clock className="h-4 w-4"/>},
  ];

  const sidebarSections: SidebarSection[] = [
    {title:"YÖNETİM",items:visibleViews.filter((v)=>v.section==="yonetim").map((v)=>({id:v.id,label:v.labelTr,icon:v.icon}))},
    {title:"SERVİS & BAKIM",items:visibleViews.filter((v)=>v.section==="servis").map((v)=>({id:v.id,label:v.labelTr,icon:v.icon}))},
    {title:"BİLGİ & AYARLAR",items:visibleViews.filter((v)=>v.section==="bilgi").map((v)=>({id:v.id,label:v.labelTr,icon:v.icon}))},
  ].filter(s=>s.items.length>0);

  if(visibleViews.length===0)return(<div className="p-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5"/>Ekipman & Bakım</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Bu modüle erişim yetkiniz yok.</p></CardContent></Card></div>);

  const activeConfig = visibleViews.find((v)=>v.id===activeView);
  const ActiveComponent = activeConfig?.component;

  return (
    <ModuleLayout title="Ekipman & Bakım" description="Ekipman yönetimi, arıza takibi, servis ve bakım" icon={<Settings2 className="h-6 w-6"/>} kpiMetrics={kpiMetrics} sidebarSections={sidebarSections} activeView={activeView} onViewChange={handleViewChange}>
      {ActiveComponent&&<Suspense fallback={<ContentSkeleton/>}><ActiveComponent/></Suspense>}
    </ModuleLayout>
  );
}
