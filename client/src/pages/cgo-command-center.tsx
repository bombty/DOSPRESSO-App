import { useEffect } from "react";
import { useLocation } from "wouter";

export default function CgoCommandCenter() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/cgo-teknik-komuta"); }, []);
  return null;
}
