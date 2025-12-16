import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Vardiyalar() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to vardiya-planlama page
    setLocation("/vardiya-planlama");
  }, [setLocation]);

  // Show minimal loading UI while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-2">
        <div className="text-lg font-semibold">Vardiya Planlama</div>
        <div className="text-muted-foreground">Yönlendiriliyorsunuz...</div>
      </div>
    </div>
  );
}
