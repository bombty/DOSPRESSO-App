import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Destek() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/hq-destek"); }, []);
  return null;
}
