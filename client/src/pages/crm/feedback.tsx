import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Users
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from "recharts";

interface FeedbackItem {
  id: number;
  rating: number;
  comment: string;
  branchName: string;
  createdAt: string;
  source: string;
}

interface FeedbackOverview {
  averageRating: number;
  totalFeedback: number;
  positiveRate: number;
  ratingDistribution: { rating: number; count: number }[];
  recentFeedback: FeedbackItem[];
  branchRankings: { branchName: string; avgRating: number; count: number }[];
}

const RATING_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

function StarRating({ rating, size = "default" }: { rating: number; size?: "default" | "small" }) {
  const sizeClass = size === "small" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

export default function CRMFeedback() {
  const { data: feedback, isLoading } = useQuery<FeedbackOverview>({
    queryKey: ["/api/crm/feedback"],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Geri bildirim verileri yüklenemedi
      </div>
    );
  }

  const pieData = feedback.ratingDistribution.map(item => ({
    name: `${item.rating} Yıldız`,
    value: item.count,
    rating: item.rating
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card data-testid="stat-avg-rating">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{feedback.averageRating.toFixed(1)}</p>
                  <StarRating rating={Math.round(feedback.averageRating)} size="small" />
                  <p className="text-xs text-muted-foreground mt-1">Ortalama Puan</p>
                </div>
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Star className="h-6 w-6 text-yellow-600 fill-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-total-feedback">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{feedback.totalFeedback}</p>
                  <p className="text-xs text-muted-foreground">Toplam Geri Bildirim</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-positive-rate">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{feedback.positiveRate}%</p>
                  <p className="text-xs text-muted-foreground">Olumlu Oran</p>
                </div>
                <div className={`p-3 rounded-full ${feedback.positiveRate >= 70 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                  {feedback.positiveRate >= 70 ? (
                    <ThumbsUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="chart-distribution">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Puan Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RATING_COLORS[entry.rating - 1]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {feedback.ratingDistribution.map((item) => (
                    <div key={item.rating} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <StarRating rating={item.rating} size="small" />
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="branch-rankings">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Şube Sıralaması
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {feedback.branchRankings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Veri yok</p>
                ) : (
                  feedback.branchRankings.slice(0, 5).map((branch, index) => (
                    <div 
                      key={branch.branchName}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{branch.branchName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating rating={Math.round(branch.avgRating)} size="small" />
                        <span className="text-sm font-medium">{branch.avgRating.toFixed(1)}</span>
                        <Badge variant="secondary" className="text-xs">{branch.count}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="recent-feedback">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Son Geri Bildirimler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {feedback.recentFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz geri bildirim yok</p>
              ) : (
                feedback.recentFeedback.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-lg bg-muted/30 space-y-2"
                    data-testid={`feedback-item-${item.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StarRating rating={item.rating} size="small" />
                        <Badge variant="outline" className="text-xs">{item.branchName}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: tr })}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="text-sm text-muted-foreground">{item.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
