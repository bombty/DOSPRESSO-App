import { AgentActionCenter } from "@/components/agent-action-center";
import { AgentAdminPanel } from "@/components/agent-admin-panel";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Settings } from "lucide-react";

export default function AgentMerkeziPage() {
  const userQuery = useQuery<any>({
    queryKey: ["/api/me"],
  });

  const user = userQuery.data;
  const isAdmin = user && ["admin", "ceo", "cgo"].includes(user.role);

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4" data-testid="page-agent-merkezi">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <h1 className="text-xl font-bold">Agent Merkezi</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Mr. Dobody'nin operasyonel analizleri ve önerileri. Önerileri inceleyip onaylayabilir veya reddedebilirsiniz.
      </p>

      {isAdmin ? (
        <Tabs defaultValue="oneriler">
          <TabsList>
            <TabsTrigger value="oneriler" data-testid="tab-oneriler">
              <Shield className="h-4 w-4 mr-1" />
              Öneriler
            </TabsTrigger>
            <TabsTrigger value="yonetim" data-testid="tab-yonetim">
              <Settings className="h-4 w-4 mr-1" />
              Yönetim
            </TabsTrigger>
          </TabsList>
          <TabsContent value="oneriler">
            <AgentActionCenter />
          </TabsContent>
          <TabsContent value="yonetim">
            <AgentAdminPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <AgentActionCenter />
      )}
    </div>
  );
}
