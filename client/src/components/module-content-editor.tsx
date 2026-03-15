import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ChevronDown, ChevronUp, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Topic { id: number; label: string; sortOrder: number; }
interface Department { id: number; name: string; icon: string; topics: Topic[]; }

interface Props {
  moduleKey: string;
  moduleName: string;
}

export function ModuleContentEditor({ moduleKey, moduleName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newTopics, setNewTopics] = useState<Record<number, string>>({});
  const qc = useQueryClient();

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ['/api/module-content', moduleKey],
    enabled: isOpen,
  });

  const addDept = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", `/api/module-content/${moduleKey}/departments`, { name });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/module-content', moduleKey] });
      setNewDeptName('');
    },
  });

  const deleteDept = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/module-content/departments/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/module-content', moduleKey] }),
  });

  const addTopic = useMutation({
    mutationFn: async ({ deptId, label }: { deptId: number; label: string }) => {
      const res = await apiRequest("POST", `/api/module-content/departments/${deptId}/topics`, { label });
      return res.json();
    },
    onSuccess: (_, { deptId }) => {
      qc.invalidateQueries({ queryKey: ['/api/module-content', moduleKey] });
      setNewTopics(prev => ({ ...prev, [deptId]: '' }));
    },
  });

  const deleteTopic = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/module-content/topics/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/module-content', moduleKey] }),
  });

  return (
    <div className="border border-border rounded-xl overflow-visible mb-3" data-testid={`content-editor-${moduleKey}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover-elevate transition-colors text-left rounded-xl"
        data-testid={`button-toggle-${moduleKey}`}
      >
        <div className="flex-1">
          <div className="text-[12px] font-bold text-foreground">{moduleName}</div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            {isOpen ? `${departments.length} departman` : 'İçerik haritasını düzenle'}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 py-3 bg-muted/20 border-t border-border">
          {isLoading ? (
            <div className="text-[11px] text-muted-foreground py-2">Yükleniyor...</div>
          ) : (
            <>
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="mb-3 bg-card rounded-lg border border-border p-3"
                  data-testid={`dept-${dept.id}`}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                    <span className="text-[13px]">{dept.icon}</span>
                    <span className="text-[11px] font-bold text-foreground flex-1">{dept.name}</span>
                    <button
                      onClick={() => {
                        if (confirm(`"${dept.name}" departmanı ve tüm konuları silinecek. Emin misiniz?`)) {
                          deleteDept.mutate(dept.id);
                        }
                      }}
                      className="text-[8px] font-semibold px-2 py-1 rounded bg-red-50 border border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400 transition-colors"
                      data-testid={`button-delete-dept-${dept.id}`}
                    >
                      Sil
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {dept.topics.map((topic) => (
                      <span
                        key={topic.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8.5px] font-medium bg-muted border border-border text-muted-foreground"
                        data-testid={`topic-${topic.id}`}
                      >
                        <GripVertical className="w-2.5 h-2.5 opacity-40" />
                        {topic.label}
                        <button
                          onClick={() => deleteTopic.mutate(topic.id)}
                          className="text-muted-foreground/60 hover:text-red-500 transition-colors ml-0.5 font-bold"
                          data-testid={`button-delete-topic-${topic.id}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    <div className="inline-flex items-center gap-1">
                      <input
                        value={newTopics[dept.id] ?? ''}
                        onChange={(e) => setNewTopics(prev => ({ ...prev, [dept.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTopics[dept.id]?.trim()) {
                            addTopic.mutate({ deptId: dept.id, label: newTopics[dept.id].trim() });
                          }
                        }}
                        placeholder="Konu ekle..."
                        className="text-[8.5px] px-2 py-1 rounded-full border border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground outline-none w-24 focus:border-[#122549] focus:w-32 transition-all"
                        data-testid={`input-topic-${dept.id}`}
                      />
                      <button
                        onClick={() => {
                          const label = newTopics[dept.id]?.trim();
                          if (label) addTopic.mutate({ deptId: dept.id, label });
                        }}
                        disabled={!newTopics[dept.id]?.trim()}
                        className="w-5 h-5 rounded-full bg-[#122549] text-white flex items-center justify-center disabled:opacity-30 transition-colors"
                        data-testid={`button-add-topic-${dept.id}`}
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 mt-2">
                <input
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDeptName.trim()) {
                      addDept.mutate(newDeptName.trim());
                    }
                  }}
                  placeholder="Yeni departman adı..."
                  className="flex-1 text-[10px] px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/30 bg-transparent text-foreground outline-none focus:border-[#122549]"
                  data-testid={`input-new-dept-${moduleKey}`}
                />
                <button
                  onClick={() => { if (newDeptName.trim()) addDept.mutate(newDeptName.trim()); }}
                  disabled={!newDeptName.trim() || addDept.isPending}
                  className="flex items-center gap-1.5 text-[9px] font-semibold px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-[#122549] hover:text-[#122549] transition-colors disabled:opacity-30"
                  data-testid={`button-add-dept-${moduleKey}`}
                >
                  <Plus className="w-3 h-3" />
                  Departman Ekle
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
