import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, Users, Clock, Building2, Wifi } from "lucide-react";

interface Branch { id: number; name: string; }
interface TeamMember {
  userId: string; firstName: string; lastName: string;
  status: string; checkInTime?: string; breakMinutes?: number;
  shiftStartTime?: string; shiftEndTime?: string;
  lateMinutes?: number; isBreakAnomaly?: boolean;
}

const MULTI_BRANCH_ROLES = ['admin', 'ceo', 'coach', 'trainer', 'cgo', 'supervisor_buddy'];

const statusLabel = (m: TeamMember) => {
  if (m.status === 'active') return 'Çalışıyor';
  if (m.status === 'on_break') return `Molada${m.breakMinutes ? ` · ${m.breakMinutes}dk` : ''}`;
  if (m.status === 'late') return `${m.lateMinutes}dk geç`;
  if (m.status === 'missing') return 'Gelmedi';
  if (m.status === 'scheduled') return `Bekliyor · ${m.shiftStartTime?.slice(0,5)||''}`;
  if (m.status === 'off') return 'İzinli';
  return 'Plansız';
};

const statusBg = (s: string) => {
  if (s === 'active') return { bg: '#16a34a', border: 'rgba(74,222,128,0.4)' };
  if (s === 'on_break') return { bg: '#d97706', border: 'rgba(251,191,36,0.4)' };
  if (s === 'late' || s === 'missing') return { bg: '#dc2626', border: 'rgba(248,113,113,0.4)' };
  if (s === 'scheduled') return { bg: '#1d4ed8', border: 'rgba(147,197,253,0.35)' };
  return { bg: '#142030', border: 'rgba(255,255,255,0.12)' };
};

const elapsed = (checkIn?: string) => {
  if (!checkIn) return '';
  const diff = Math.floor((Date.now() - new Date(checkIn).getTime()) / 60000);
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? `${h}sa ${m}dk` : `${m}dk`;
};

export default function CanliTakip() {
  const { user } = useAuth();
  const isMultiBranch = MULTI_BRANCH_ROLES.includes(user?.role || '');
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: isMultiBranch,
  });

  // Single branch user
  useEffect(() => {
    if (!isMultiBranch && user?.branchId) {
      setSelectedBranchIds([user.branchId]);
    }
  }, [user, isMultiBranch]);

  // Default: all branches for multi-branch roles
  useEffect(() => {
    if (isMultiBranch && branches.length > 0 && selectedBranchIds.length === 0) {
      setSelectedBranchIds(branches.map(b => b.id));
    }
  }, [branches, isMultiBranch]);

  const toggleBranch = (id: number) => {
    setSelectedBranchIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Fetch team status for each selected branch
  const branchQueries = selectedBranchIds.map(branchId => ({
    branchId,
    queryKey: [`/api/branches/${branchId}/kiosk/team-status`],
  }));

  const [branchData, setBranchData] = useState<Record<number, TeamMember[]>>({});

  const fetchBranchStatus = useCallback(async (branchId: number) => {
    try {
      const res = await fetch(`/api/branches/${branchId}/kiosk/team-status`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setBranchData(prev => ({ ...prev, [branchId]: Array.isArray(data.team) ? data.team : [] }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    selectedBranchIds.forEach(id => fetchBranchStatus(id));
    const interval = setInterval(() => {
      selectedBranchIds.forEach(id => fetchBranchStatus(id));
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedBranchIds, fetchBranchStatus]);

  // Aggregate stats
  const allMembers = Object.entries(branchData).flatMap(([branchId, members]) =>
    members.map(m => ({ ...m, branchId: parseInt(branchId) }))
  );
  const activeCount = allMembers.filter(m => m.status === 'active').length;
  const breakCount = allMembers.filter(m => m.status === 'on_break').length;
  const lateCount = allMembers.filter(m => m.status === 'late' || m.status === 'missing').length;
  const anomalyCount = allMembers.filter(m => m.isBreakAnomaly).length;

  const getBranchName = (id: number) => branches.find(b => b.id === id)?.name || `Şube #${id}`;

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>Canlı Personel Takibi</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#22c55e' }}>
            <Wifi size={13} /> <span>30sn yenileniyor</span>
          </div>
          <button
            onClick={() => { selectedBranchIds.forEach(id => fetchBranchStatus(id)); setLastUpdate(new Date()); }}
            style={{ background: 'none', border: '1px solid var(--color-border-secondary)', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw size={13} /> Yenile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Aktif Çalışıyor', count: activeCount, color: '#16a34a', bg: 'rgba(22,163,74,0.1)', icon: '✅' },
          { label: 'Molada', count: breakCount, color: '#d97706', bg: 'rgba(217,119,6,0.1)', icon: '☕' },
          { label: 'Gecikmeli / Gelmedi', count: lateCount, color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: '⚠️' },
          { label: 'Mola Anomalisi', count: anomalyCount, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '🚨' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.color}40`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: stat.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.icon} {stat.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Branch selector (multi-branch roles) */}
      {isMultiBranch && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 500 }}>Şube Seçimi</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              onClick={() => setSelectedBranchIds(
                selectedBranchIds.length === branches.length ? [] : branches.map(b => b.id)
              )}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: selectedBranchIds.length === branches.length ? '#c0392b' : 'var(--color-background-secondary)',
                color: selectedBranchIds.length === branches.length ? '#fff' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-secondary)'
              }}
            >
              {selectedBranchIds.length === branches.length ? '✓ Tümü' : 'Tümünü Seç'}
            </button>
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => toggleBranch(b.id)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  background: selectedBranchIds.includes(b.id) ? 'rgba(192,57,43,0.15)' : 'var(--color-background-secondary)',
                  color: selectedBranchIds.includes(b.id) ? '#c0392b' : 'var(--color-text-secondary)',
                  border: `1px solid ${selectedBranchIds.includes(b.id) ? 'rgba(192,57,43,0.4)' : 'var(--color-border-secondary)'}`
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Branch cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 14 }}>
        {selectedBranchIds.map(branchId => {
          const members = branchData[branchId] || [];
          const active = members.filter(m => m.status === 'active' || m.status === 'on_break');
          const late = members.filter(m => m.status === 'late' || m.status === 'missing');
          const upcoming = members.filter(m => m.status === 'scheduled');
          const anomalies = members.filter(m => m.isBreakAnomaly);

          return (
            <div key={branchId} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Branch header */}
              <div style={{ background: '#0f1d32', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={15} color="#c0392b" />
                  <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>{getBranchName(branchId)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {active.length > 0 && <span style={{ fontSize: 11, background: 'rgba(22,163,74,0.2)', color: '#4ade80', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>{active.length} aktif</span>}
                  {late.length > 0 && <span style={{ fontSize: 11, background: 'rgba(220,38,38,0.2)', color: '#f87171', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>{late.length} geç</span>}
                  {upcoming.length > 0 && <span style={{ fontSize: 11, background: 'rgba(29,78,216,0.2)', color: '#93c5fd', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>{upcoming.length} bekliyor</span>}
                </div>
              </div>

              {/* Anomaly alert */}
              {anomalies.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.2)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={13} color="#ef4444" />
                  <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 500 }}>
                    {anomalies.map(m => `${m.firstName} ${m.lastName} — ${m.breakMinutes}dk mola`).join(' · ')}
                  </span>
                </div>
              )}

              {/* Staff list */}
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {members.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '16px 0' }}>Veri yükleniyor...</p>
                ) : (
                  members.map(member => {
                    const { bg, border } = statusBg(member.status);
                    const isHighlight = ['active', 'on_break', 'late', 'missing'].includes(member.status);
                    return (
                      <div key={member.userId} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 9,
                        background: isHighlight ? `${bg}18` : 'var(--color-background-secondary)',
                        border: `1px solid ${isHighlight ? border : 'var(--color-border-tertiary)'}`,
                        opacity: ['off', 'not_scheduled'].includes(member.status) ? 0.5 : 1,
                      }}>
                        {/* Status dot */}
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: bg, flexShrink: 0, boxShadow: isHighlight ? `0 0 6px ${bg}` : 'none' }} />
                        {/* Avatar */}
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </div>
                        {/* Name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.firstName} {member.lastName}
                          </p>
                          <p style={{ fontSize: 11, color: isHighlight ? bg : 'var(--color-text-secondary)', margin: 0, marginTop: 1 }}>
                            {statusLabel(member)}
                          </p>
                        </div>
                        {/* Elapsed time */}
                        {member.checkInTime && member.status === 'active' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                            <Clock size={11} />
                            {elapsed(member.checkInTime)}
                          </div>
                        )}
                        {/* Break anomaly badge */}
                        {member.isBreakAnomaly && (
                          <span style={{ fontSize: 10, background: '#dc2626', color: '#fff', borderRadius: 5, padding: '2px 6px', fontWeight: 600, flexShrink: 0 }}>MOLA!</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
