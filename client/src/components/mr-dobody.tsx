import { useState } from "react";

const TOTAL_CHARACTERS = 49;

interface MrDobodyProps {
  size?: number;
  className?: string;
  message?: string;
}

export function MrDobody({ size = 80, className = "", message }: MrDobodyProps) {
  const [characterIndex] = useState(() => Math.floor(Math.random() * TOTAL_CHARACTERS));
  
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`} data-testid="mascot-dobody">
      {message && (
        <div className="bg-card border rounded-lg px-3 py-1.5 text-xs text-center max-w-[200px] relative mb-1">
          <span>{message}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-card border-r border-b rotate-45" />
        </div>
      )}
      <div 
        className="rounded-full overflow-hidden bg-background border-2 border-border flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <img 
          src={`/mascot/dobody_${characterIndex}.png`}
          alt="Mr. Dobody"
          className="object-cover scale-150"
          style={{ 
            width: size, 
            height: size,
            objectPosition: 'center 30%',
          }}
          data-testid="img-dobody"
        />
      </div>
    </div>
  );
}

const GREETINGS = [
  "Merhaba! Bug\u00fcn g\u00fczel bir g\u00fcn!",
  "Harika i\u015f \u00e7\u0131kar\u0131yorsun!",
  "Kahve molas\u0131 zaman\u0131!",
  "DOSPRESSO ailesine ho\u015f geldin!",
  "Ba\u015far\u0131lar dilerim!",
  "Bug\u00fcn enerjik misin?",
  "G\u00f6revlerini tamamlamay\u0131 unutma!",
  "Her g\u00fcn bir ad\u0131m ileri!",
  "Tak\u0131m \u00e7al\u0131\u015fmas\u0131 her \u015feydir!",
  "Kaliteye odaklan!",
];

export function MrDobodyGreeting({ size = 64, className = "" }: { size?: number; className?: string }) {
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  return <MrDobody size={size} className={className} message={greeting} />;
}
