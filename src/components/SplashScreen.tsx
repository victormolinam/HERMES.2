import React, { useEffect, useState } from 'react';
import { AppIcon } from './Logo';
import { translations, Language } from '../lib/i18n';

const QUOTES = [
  { text: "The Earth is the cradle of humanity, but mankind cannot stay in the cradle forever.", author: "Konstantin Tsiolkovsky" },
  { text: "To confine our attention to terrestrial matters would be to limit the human spirit.", author: "Stephen Hawking" },
  { text: "Once you have tasted flight, you will forever walk the earth with your eyes turned skyward.", author: "Leonardo da Vinci" },
  { text: "That's one small step for man, one giant leap for mankind.", author: "Neil Armstrong" },
  { text: "Spaceflight will never tolerate carelessness, incapacity, and neglect.", author: "Gene Kranz" },
  { text: "There is no sound in space, but the roar of a rocket makes up for it.", author: "Unknown" },
  { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke" },
  { text: "If we can conquer space, we can conquer childhood hunger.", author: "Buzz Aldrin" },
];

export function SplashScreen({ lang, onComplete }: { lang: Language, onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const t = translations[lang];

  useEffect(() => {
    const duration = 2000;
    const interval = 20;
    const steps = duration / interval;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      setProgress(Math.min(100, Math.floor((step / steps) * 100)));
      if (step >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 200);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image Effect */}
      <div 
        className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-luminosity"
        style={{ backgroundImage: 'url(https://picsum.photos/seed/rocketengine/1920/1080?blur=4)' }}
      />
      
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6 text-center">
        <div className="mb-8 relative hover:scale-105 transition-transform duration-300">
           <div className="absolute inset-x-0 bottom-0 top-6 rounded-[28px] bg-sky-500/25 blur-2xl animate-pulse" />
           <AppIcon size={128} className="relative z-10" />
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black tracking-widest text-slate-100 mb-2 drop-shadow-lg">
           HERMES
        </h1>
        <p className="text-primary font-mono tracking-widest text-xs md:text-sm uppercase mb-16">
           {t.loading}
        </p>

        {/* Quote Section */}
        <div className="h-16 flex flex-col items-center justify-center mb-12">
           <p className="text-slate-300 italic text-sm md:text-base font-serif mb-2">"{quote.text}"</p>
           <p className="text-slate-500 font-mono text-[10px] md:text-xs tracking-widest uppercase">— {quote.author}</p>
        </div>
        
        <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden mb-4 border border-slate-700/50 backdrop-blur-sm">
           <div 
             className="h-full bg-primary shadow-[0_0_15px_rgba(56,189,248,0.8)] transition-all duration-75 ease-linear"
             style={{ width: `${progress}%` }}
           />
        </div>
        
        <div className="flex justify-between w-full text-[10px] sm:text-xs text-slate-400 font-mono">
          <span>{t.loading_sub}</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}
