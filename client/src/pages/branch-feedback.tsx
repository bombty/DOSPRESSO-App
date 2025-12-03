import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Send, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Feedback {
  id: number;
  type: string;
  subject: string;
  message: string;
  status: string;
  response?: string;
  createdAt: string;
}

export default function BranchFeedback() {
  const [, setLocation] = useLocation();
  const [type, setType] = useState("order");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Get user's branch
  const { data: user } = useQuery({ queryKey: ["/api/user"] });
  const branchId = user?.branchId;

  // Fetch feedbacks
  const { data: feedbacks = [] } = useQuery<Feedback[]>({
    queryKey: ["/api/feedback", branchId],
    enabled: !!branchId,
  });

  // Send feedback mutation
  const { mutate: sendFeedback, isPending } = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/feedback", { branchId, type, subject, message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      setType("order");
      setSubject("");
      setMessage("");
    },
  });

  const typeLabels: Record<string, string> = {
    order: "Sipariş",
    invoice: "Fatura",
    logistics: "Lojistik",
    other: "Diğer",
  };

  const statusLabels: Record<string, string> = {
    yeni: "Yeni",
    okundu: "Okundu",
    yanıtlandı: "Yanıtlandı",
  };

  const statusColors: Record<string, string> = {
    yeni: "bg-yellow-100 text-yellow-800",
    okundu: "bg-blue-100 text-blue-800",
    yanıtlandı: "bg-green-100 text-green-800",
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 p-3">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900" data-testid="text-page-title">Muhasebe Geribildirimi</h1>
          <p className="text-sm text-muted-foreground">Sipariş, fatura ve lojistik ile ilgili geribildirimleri gönderin</p>
        </div>
      </div>

      <div className="grid gap-2 sm:gap-3 md:grid-cols-3">
        {/* Send Feedback Form */}
        <Card className="md:col-span-1" data-testid="card-feedback-form">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-4 w-4" />
              Yeni Geribildirim
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Tür</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                data-testid="select-feedback-type"
              >
                {Object.entries(typeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Konu</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Konuyu kısaca yazın"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                data-testid="input-feedback-subject"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Mesaj</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Detaylı bilgi yazın"
                rows={4}
                className="w-full mt-1 px-3 py-2 border rounded-md resize-none"
                data-testid="textarea-feedback-message"
              />
            </div>

            <Button
              onClick={() => sendFeedback()}
              disabled={isPending || !subject || !message}
              className="w-full"
              data-testid="button-send-feedback"
            >
              {isPending ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <Card className="md:col-span-2" data-testid="card-feedback-list">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Geçmiş Geribildirimleri ({feedbacks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedbacks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Henüz geribildirim göderilmedi</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:gap-3 max-h-96 overflow-y-auto">
                {feedbacks.map((fb) => (
                  <Card key={fb.id} className="bg-muted/50" data-testid={`card-feedback-${fb.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold" data-testid={`text-feedback-subject-${fb.id}`}>{fb.subject}</h4>
                          <p className="text-sm text-muted-foreground">{typeLabels[fb.type]}</p>
                        </div>
                        <Badge className={statusColors[fb.status]}>{statusLabels[fb.status]}</Badge>
                      </div>
                      <p className="text-sm text-foreground mb-2" data-testid={`text-feedback-message-${fb.id}`}>{fb.message}</p>
                      {fb.response && (
                        <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                          <p className="font-semibold text-green-900">Yanıt:</p>
                          <p className="text-green-800">{fb.response}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(fb.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
