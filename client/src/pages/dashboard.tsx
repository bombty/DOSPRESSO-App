import { CardGridHub } from "@/components/card-grid-hub";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

const FACTORY_ROLES = ['fabrika', 'fabrika_mudur', 'fabrika_operator'];

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && FACTORY_ROLES.includes(user.role)) {
      setLocation('/fabrika/dashboard');
    }
  }, [user, setLocation]);

  if (user && FACTORY_ROLES.includes(user.role)) {
    return null;
  }

  return <CardGridHub />;
}
