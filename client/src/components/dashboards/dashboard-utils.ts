// Shared dashboard utility functions

export const getGaugeColor = (score: number): string => {
  if (score >= 85) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
};

export const getGaugeTextColor = (score: number): string => {
  if (score >= 85) return 'text-green-700';
  if (score >= 70) return 'text-yellow-700';
  return 'text-red-700';
};

export const getHeatColor = (score: number): string => {
  if (score >= 85) return 'bg-green-500 hover:bg-green-600';
  if (score >= 75) return 'bg-lime-500 hover:bg-lime-600';
  if (score >= 65) return 'bg-yellow-500 hover:bg-yellow-600';
  if (score >= 50) return 'bg-orange-500 hover:bg-orange-600';
  return 'bg-red-600 hover:bg-red-700';
};

export const getColorClass = (score: number, type: 'bg' | 'text' = 'bg'): string => {
  if (score >= 85) return type === 'bg' ? 'bg-green-600' : 'text-green-600';
  if (score >= 70) return type === 'bg' ? 'bg-yellow-600' : 'text-yellow-600';
  return type === 'bg' ? 'bg-red-600' : 'text-red-600';
};

export const calculateAverageScore = (scores: number[]): number => {
  if (!scores.length) return 0;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
};

export const getStatusBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  return 'destructive';
};
