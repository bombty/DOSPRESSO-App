import { useEffect } from "react";
import { useLocation } from "wouter";

export default function CoachUyumPaneli() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/coach-kontrol-merkezi"); }, []);
  return null;
}
