# Agent Visibility Spec (AI & Agent Leader)

## Problem
Agent Leader çalışıyor ama UI'da görünmediği için "yok" gibi hissediliyor.

## Çözüm: Coach Console'da görünür 3 katman

1) Agent Center (zorunlu)
- Aktif agent listesi (Onboarding Agent, KPI Agent, Content Agent)
- Status: ON/OFF
- Last run time
- Produced insights count
- Manual run button (opsiyon)

2) Action Log (zorunlu)
- Agent şu insight'ı üretti
- Agent şu kişiyi "risk" işaretledi
- Agent şu modülü önerdi
- Agent şu case'i açtı

3) Inline Suggestions (zorunlu)
- Template Editor içinde: "Bu gün uzun → böl"
- Analytics içinde: "Bu şubede modül X başarısız → prerequisite yap"
- Her öneri: (Neden + Önerilen aksiyon + Uygula)
