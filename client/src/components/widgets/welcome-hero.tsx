import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Sun, Moon, Cloud, Coffee } from "lucide-react";

function getGreeting(): { text: string; icon: any } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Günaydın", icon: Sun };
  if (hour >= 12 && hour < 17) return { text: "İyi Günler", icon: Cloud };
  if (hour >= 17 && hour < 21) return { text: "İyi Akşamlar", icon: Coffee };
  return { text: "İyi Geceler", icon: Moon };
}

function formatDate(): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  return new Date().toLocaleDateString('tr-TR', options);
}

export function WelcomeHero() {
  const { user } = useAuth();
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  
  const firstName = user?.firstName || user?.username?.split(' ')[0] || 'Kullanıcı';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(var(--dospresso-navy))] via-[hsl(var(--dospresso-blue))] to-[hsl(var(--dospresso-blue)/0.8)] p-6 text-white"
      data-testid="welcome-hero"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      {/* Illustration */}
      <div className="absolute right-4 bottom-0 opacity-20">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="50" fill="white" fillOpacity="0.1"/>
          <path d="M40 80c0-22 18-40 40-40" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="60" cy="40" r="8" fill="white" fillOpacity="0.3"/>
          <circle cx="85" cy="55" r="6" fill="white" fillOpacity="0.2"/>
        </svg>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <GreetingIcon className="w-8 h-8 text-yellow-300" />
          </motion.div>
          <span className="text-lg font-medium text-white/80">{greeting.text}</span>
        </div>
        
        <h1 className="text-2xl font-bold mb-1">{firstName}</h1>
        <p className="text-sm text-white/70">{formatDate()}</p>
        
        <div className="mt-4 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium">
            <Coffee className="w-3 h-3 inline mr-1" />
            DOSPRESSO
          </div>
        </div>
      </div>
    </motion.div>
  );
}
