import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Rocket } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label as UiLabel } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PROPELLANTS, DEFAULT_PROPELLANTS, CustomPropellant, SimulationInputs, SimulationResults, getPropellantData } from './lib/types';
import { runSimulation } from './lib/simulator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Label as ChartLabel } from 'recharts';
import { Download, Monitor, Sun, Moon, User, HelpCircle, BookOpen, FolderOpen, Trash2, Folder, Wrench, Search, Sparkles, Brain, Bot, AlertTriangle, Construction, Cpu, ShieldCheck, DownloadCloud, Target, Info, Beaker, Plus, Scale, Box } from 'lucide-react';

import { GrainViewer } from './components/GrainViewer';
import { EngineViewer } from './components/EngineViewer';
import { GrainPreview } from './components/GrainPreview';
import { Grain3DPreview } from './components/Grain3DPreview';
import { MotorPreview } from './components/MotorPreview';
import { PlaybackWrapper } from './components/PlaybackWrapper';
import { MissionControl } from './components/MissionControl';
import { DetailedAnalysisView } from './components/DetailedAnalysisView';
import { SmartSearchEngine } from './components/SmartSearchEngine';
import { SplashScreen } from './components/SplashScreen';
import { VersionHistoryBook } from './components/VersionHistoryBook';
import { CustomPropellantModal, loadCustomPropellantsFromStorage, saveCustomPropellantsToStorage } from './components/CustomPropellantModal';
import { Language, translations } from './lib/i18n';
import { Logo } from './components/Logo';
import { validateFinocylGeometry } from './lib/fmmFinocyl';

function NumberInput({ 
  value, 
  onChange, 
  label, 
  step = "1",
  tooltip,
  decimals,
  inputWidth
}: { 
  value: number, 
  onChange: (v: number) => void, 
  label: string, 
  step?: string,
  tooltip?: string,
  decimals?: number,
  inputWidth?: string
}) {
  const [internal, setInternal] = useState(decimals !== undefined ? value.toFixed(decimals) : value.toString());
  const lastPushedValue = React.useRef(value);

  React.useEffect(() => {
    if (value !== lastPushedValue.current) {
      setInternal(decimals !== undefined ? value.toFixed(decimals) : value.toString());
      lastPushedValue.current = value;
    }
  }, [value, decimals]);

  return (
    <div 
      className="group relative flex items-center justify-between gap-1.5 w-full min-w-0 border-b border-border/80 pb-1 mb-1 hover:bg-muted/40 px-1 py-0.5 rounded transition-all focus-within:bg-purple-500/10 focus-within:border-purple-500/50" 
      title={tooltip || label}
    >
      <div className="absolute bottom-[-1px] left-0 right-0 h-[1.5px] bg-gradient-to-r from-purple-500 via-purple-300 to-blue-500 opacity-0 group-focus-within:opacity-100 transition-all duration-300"></div>
      <UiLabel className="text-[10px] sm:text-[11px] text-muted-foreground font-medium flex-1 min-w-0 group-focus-within:text-foreground transition-colors z-10 cursor-help select-none leading-tight py-0.5 whitespace-normal break-words">
        {label}
      </UiLabel>
      <Input
        type="number"
        step={step}
        value={internal}
        className={`${inputWidth ? inputWidth : 'w-[52px] sm:w-[62px]'} min-w-[48px] h-6 min-h-0 text-[11px] sm:text-xs py-0 px-1 text-right bg-background/90 border border-border/40 text-foreground font-mono font-semibold shadow-2xs rounded outline-none ring-0 focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:border-purple-500 focus-within:text-purple-600 dark:focus-within:text-purple-300 transition-all shrink-0 z-10`}
        onChange={(e) => {
          setInternal(e.target.value);
          if (e.target.value !== '' && e.target.value !== '-' && e.target.value !== '.') {
             const parsed = parseFloat(e.target.value);
             if (!isNaN(parsed)) {
               lastPushedValue.current = parsed;
               onChange(parsed);
             }
          }
        }}
        onBlur={() => {
          if (decimals !== undefined && !isNaN(value)) {
            const formatted = value.toFixed(decimals);
            setInternal(formatted);
            lastPushedValue.current = value;
          }
        }}
        onFocus={e => e.target.select()}
      />
    </div>
  );
}

interface GrainShapeIconProps {
  shape: number;
  grainId: string;
}

const GrainShapeIcon: React.FC<GrainShapeIconProps> = ({ shape, grainId }) => {
  const patternId = `stripe-${shape}-${grainId}`;
  return (
    <svg className="w-8 h-8 shrink-0 select-none" viewBox="0 0 32 32">
      <defs>
        <pattern id={patternId} width="4.5" height="4.5" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="4.5" stroke="currentColor" strokeWidth="1.2" className="text-purple-500/70 dark:text-purple-400/70" />
        </pattern>
      </defs>
      {/* Outer propellant body */}
      <circle cx="16" cy="16" r="13" fill={`url(#${patternId})`} stroke="currentColor" className="text-slate-550 dark:text-slate-650" strokeWidth="1.5" />
      
      {shape === 1 && (
        // Tubular (Cylindrical)
        <circle cx="16" cy="16" r="4.5" fill="var(--card)" stroke="currentColor" className="text-slate-450 dark:text-slate-550" strokeDasharray="1.5 1.2" strokeWidth="1.2" />
      )}
      
      {shape === 2 && (
        // Star (Estrella)
        <path 
          d="M 16,10 L 17.5,13.5 L 21,14 L 18.2,16.5 L 19,20 L 16,18.2 L 13,20 L 13.8,16.5 L 11,14 L 14.5,13.5 Z" 
          fill="var(--card)" 
          stroke="currentColor" 
          className="text-slate-450 dark:text-slate-550" 
          strokeWidth="1.2" 
        />
      )}

      {shape === 4 && (
        // Finocyl (Core with rectangular fin slots)
        <g fill="var(--card)" stroke="currentColor" className="text-slate-450 dark:text-slate-550" strokeWidth="1">
          <circle cx="16" cy="16" r="3.8" />
          <rect x="14.8" y="5.5" width="2.4" height="6.5" rx="0.5" />
          <rect x="14.8" y="20" width="2.4" height="6.5" rx="0.5" />
          <rect x="5.5" y="14.8" width="6.5" height="2.4" rx="0.5" />
          <rect x="20" y="14.8" width="6.5" height="2.4" rx="0.5" />
        </g>
      )}
    </svg>
  );
};

function InteractiveGrain3D({ grain }: { grain: any }) {
  const [rotX, setRotX] = useState(60);
  const [rotZ, setRotZ] = useState(45);
  const [isDown, setIsDown] = useState(false);
  const lastPos = React.useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDown(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDown) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setRotZ(z => z + dx * 0.5);
    setRotX(x => Math.max(0, Math.min(180, x - dy * 0.5)));
  };

  const layers = 10;
  return (
    <div 
       className="w-full h-full relative cursor-move overflow-hidden" 
       onPointerDown={handlePointerDown} 
       onPointerMove={handlePointerMove} 
       onPointerUp={(e) => { setIsDown(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
       style={{ perspective: '400px' }}
       title="Drag to rotate 3D view"
    >
       <div className="absolute top-0 right-0 text-[8px] font-bold text-slate-300 pointer-events-none p-1">3D DRAG</div>
        <div className="w-full h-full absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transformStyle: 'preserve-3d', transform: `rotateX(${rotX}deg) rotateZ(${rotZ}deg)` }}>
          {Array.from({ length: layers }).map((_, i) => (
             <div key={i} className="absolute inset-2 flex items-center justify-center" style={{ transform: `translateZ(${(i - layers/2) * 4}px)` }}>
                 <div className="w-full h-full max-w-[65px] max-h-[65px]">
                   <GrainPreview grain={grain} disableLabel />
                 </div>
             </div>
          ))}
       </div>
    </div>
  );
}

import { ApogeeResult } from './lib/apogee';
import { FlightViewer } from './components/FlightViewer';

const TUTORIAL_STEPS: Record<string, { title: string, content: string[] }[]> = {
  en: [
    { title: "1. Inputs & Chemistry", content: [
      "In this tab, you configure the physical properties of your rocket motor step by step.",
      "Motor & Nozzle: Specify the internal chamber diameter, nozzle throat and exit diameters, and slag/erosion behavior.",
      "Custom Chemistry & Propellants: Click 'Propellant Chemistry' to choose from built-in propellants (KNDX, KNSU, RNX, APCP) or synthesize your own custom fuel defining density, adiabatic flame temperature, and Saint-Robert regression coefficients (a & n) either globally or piecewise across pressure intervals.",
      "Grain Geometry: Add and configure the solid fuel grains. You can use Cylindrical (BATES), Star core, Finocyl (Fast Marching Method - OpenMotor), or Solid shapes, and define their dimensions and inhibited faces."
    ]},
    { title: "2. Results", content: [
      "Once everything is configured, press the 'SIMULATE' button to run the internal ballistics calculations.",
      "Here you will see the main performance graphs: Chamber Pressure vs Time and Thrust vs Time.",
      "The top card gives you an instant summary of the motor: its classification class (e.g., G, H, I), Total Impulse, Maximum Thrust, and Burn Time.",
      "Advanced Use: You can save the simulation to your local library, or export all numerical data to Excel or CSV using the 'Export' button."
    ]},
    { title: "3. Detailed Analysis", content: [
      "This section allows you to dive deep into the technical details of the simulation through four sub-tabs.",
      "Burn Surface: Watch how the fire-exposed area of each grain (internal, external, and ends) evolves as it is consumed.",
      "Kn Regime: Visualize the ratio between the burn area and the nozzle throat area. This helps predict potential pressure instabilities.",
      "Burn Rate: Examine how the propellant consumption rate (r) varies with time and pressure, according to Saint-Robert's Law (r = a · Pⁿ).",
      "Mass Flow: Analyze the rate at which gases are generated and expelled, and monitor the propellant consumption percentage."
    ]},
    { title: "4. Mission Control", content: [
      "Here you can simulate a 1D vertical launch using the thrust curve you just generated or by importing real test data (CSV/Excel).",
      "Enter your rocket's data: Dry mass (without motor), outer diameter, and aerodynamic drag coefficient (Cd).",
      "The simulation will instantly calculate the Apogee (maximum altitude), maximum velocity, and maximum acceleration.",
      "You can view full flight profile graphs (Altitude and Thrust) up to the apogee moment."
    ]},
    { title: "5. CFD Animation", content: [
      "Watch an interactive 2D animation of your engine's combustion process over time.",
      "This tool visualizes how the fire consumes the solid propellant from the core outward.",
      "You can play the animation automatically, pause it, or use the slider to inspect the engine at a precise second of the simulation."
    ]}
  ],
  es: [
    { title: "1. Entradas & Síntesis Química", content: [
      "En esta pestaña configuras las propiedades físicas de tu motor cohete paso a paso.",
      "Motor y Tobera: Especifica el diámetro interno de la cámara, diámetros de garganta y salida de la tobera, y comportamiento de escoria/erosión.",
      "Química y Propulsantes Personalizados: Pulsa en 'Química & Propulsantes' para elegir entre combustibles estándar (KNDX, KNSU, RNX, APCP) o sintetizar tu propio propulsante personalizado definiendo su densidad, temperatura de llama y coeficientes de Saint-Robert (a y n) de forma global o por tramos de presión.",
      "Geometría de Granos: Añade y configura los bloques de combustible (granos). Puedes usar formas cilíndricas (BATES), de estrella, Finocyl (con Fast Marching Method de OpenMotor) o macizas, definiendo sus dimensiones y qué caras están inhibidas (protegidas del fuego)."
    ]},
    { title: "2. Results (Resultados)", content: [
      "Una vez configurado todo, pulsa el botón 'SIMULAR' para ejecutar los cálculos de balística interior.",
      "En esta pestaña verás las gráficas principales: Presión de Cámara vs Tiempo y Empuje vs Tiempo.",
      "La tarjeta superior te da un resumen instantáneo del motor: su clasificación (ej. Clase G, H, I), Impulso Total, Empuje Máximo y Tiempo de Quemado.",
      "Uso Avanzado: Puedes guardar la simulación en tu biblioteca local, o exportar todos los datos numéricos a Excel o CSV usando el botón 'Exportar'."
    ]},
    { title: "3. Detailed Analysis (Análisis Detallado)", content: [
      "Esta sección te permite profundizar en los detalles técnicos de la simulación mediante cuatro sub-pestañas.",
      "Superficie de Quemado: Observa cómo evoluciona el área expuesta al fuego de cada grano (interno, externo y extremos) a medida que se consume.",
      "Régimen Kn: Visualiza la relación entre el área de quemado y el área de la garganta de la tobera. Te ayuda a predecir si habrá inestabilidades.",
      "Velocidad de Quemado: Examina cómo la velocidad a la que se consume el propelente (r) varía con el tiempo y con la presión, según la Ley de Saint-Robert (r = a · Pⁿ).",
      "Flujo Másico: Analiza la velocidad a la que se generan y expulsan los gases, y monitoriza el consumo porcentual del propelente."
    ]},
    { title: "4. Mission Control", content: [
      "Aquí puedes simular un lanzamiento vertical (1D) usando la curva de empuje que has generado o importando un archivo de banco de pruebas (CSV/Excel).",
      "Introduce los datos de tu cohete: Masa en vacío (sin motor), diámetro exterior y coeficiente aerodinámico (Cd).",
      "La simulación calculará instantáneamente el Apogeo (altitud máxima), la velocidad máxima y la aceleración máxima.",
      "Podrás ver gráficas del perfil de vuelo (Altitud y Empuje) hasta el momento del apogeo."
    ]},
    { title: "5. CFD Animation (Animación CFD)", content: [
      "Observa una animación interactiva 2D del proceso de combustión de tu motor a lo largo del tiempo.",
      "Esta herramienta visualiza cómo el fuego consume el propelente desde el núcleo hacia el exterior.",
      "Puedes reproducir la animación automáticamente, pausarla, o mover la barra deslizante para inspeccionar el motor en un segundo exacto de la simulación."
    ]}
  ],
  fr: [
    { title: "1. Inputs & Chimie", content: [
      "Dans cet onglet, vous configurez les propriétés physiques de votre moteur-fusée étape par étape.",
      "Moteur et Tuyère : Spécifiez le diamètre interne de la chambre, ainsi que les diamètres au col et à la sortie de la tuyère.",
      "Chimie & Propergols Personnalisés : Cliquez sur 'Chimie & Propergols' pour choisir un carburant ou créer une formule personnalisée avec ses coefficients de Saint-Robert (a & n) et ses plages de pression.",
      "Géométrie des Blocs : Ajoutez et configurez les blocs de propergol. Vous pouvez utiliser des formes Cylindriques (BATES), en Étoile ou Pleines, en définissant leurs dimensions et les faces inhibées."
    ]},
    { title: "2. Results (Résultats)", content: [
      "Une fois configuré, appuyez sur le bouton 'SIMULER' pour lancer les calculs de balistique interne.",
      "Ici, vous verrez les graphiques principaux : Pression de la Chambre et Poussée au fil du temps.",
      "Le résumé affiche la classification du moteur (ex: G, H, I), l'Impulsion Totale, la Poussée Maximale et le Temps de Combustion.",
      "Utilisation Avancée : Sauvegardez la simulation ou exportez toutes les données numériques vers Excel ou CSV via le bouton 'Exporter'."
    ]},
    { title: "3. Detailed Analysis (Analyse Détaillée)", content: [
      "Cette section permet d'approfondir les détails techniques de la simulation via quatre sous-onglets.",
      "Surface de Combustion : Observez l'évolution de la zone exposée au feu de chaque bloc (interne, externe et extrémités).",
      "Régime Kn : Visualisez le rapport entre la surface de combustion et la surface du col de la tuyère pour prévoir les instabilités.",
      "Vitesse de Combustion : Examinez comment la vitesse de consommation (r) varie selon la loi de Saint-Robert.",
      "Débit Massique : Analysez la vitesse de génération et d'expulsion des gaz, et suivez la consommation du propergol."
    ]},
    { title: "4. Mission Control", content: [
      "Simulez un lancement vertical (1D) en utilisant la courbe de poussée générée ou en important des données de test réelles (CSV/Excel).",
      "Entrez les données de votre fusée : Masse à vide, diamètre extérieur et coefficient de traînée (Cd).",
      "La simulation calcule instantanément l'Apogée (altitude maximale), la vitesse max et l'accélération max.",
      "Consultez les graphiques du profil de vol complet (Altitude et Poussée) jusqu'à l'apogée."
    ]},
    { title: "5. CFD Animation (Animation CFD)", content: [
      "Regardez une animation 2D interactive du processus de combustion de votre moteur.",
      "Cet outil montre comment le feu consomme le propergol solide depuis le centre vers l'extérieur.",
      "Lisez l'animation automatiquement, mettez-la en pause ou utilisez le curseur pour inspecter le moteur à une seconde précise."
    ]}
  ],
  it: [
    { title: "1. Ingressi & Chimica", content: [
      "In questa scheda configuri le proprietà fisiche del tuo motore a razzo passo dopo passo.",
      "Motore e Ugello: Specifica il diametro interno della camera, e i diametri di gola e di uscita dell'ugello.",
      "Chimica & Propellenti Personalizzati: Clicca su 'Chimica & Propellenti' per selezionare propellenti standard o creare formulazioni personalizzate definendo a, n e intervalli di pressione.",
      "Geometria dei Grani: Aggiungi e configura i blocchi di propellente solido. Puoi usare forme Cilindriche (BATES), a Stella o Piene, definendone le dimensioni e le facce inibite."
    ]},
    { title: "2. Results (Risultati)", content: [
      "Una volta configurato, premi il pulsante 'SIMULA' per avviare i calcoli di balistica interna.",
      "Qui vedrai i grafici principali: Pressione in Camera e Spinta nel tempo.",
      "Il riepilogo mostra la classe del motore (es. G, H, I), l'Impulso Totale, la Spinta Massima e il Tempo di Combustione.",
      "Uso Avanzato: Salva la simulazione nella tua libreria o esporta i dati numerici in Excel o CSV usando il pulsante 'Esporta'."
    ]},
    { title: "3. Detailed Analysis (Analisi Dettagliata)", content: [
      "Questa sezione permette di approfondire i dettagli tecnici attraverso quattro sotto-schede.",
      "Superficie di Combustione: Osserva come evolve l'area esposta al fuoco di ogni grano (interna, esterna e alle estremità).",
      "Regime Kn: Visualizza il rapporto tra l'area di combustione e l'area della gola dell'ugello per prevedere eventuali instabilità.",
      "Velocità di Combustione: Esamina come varia la velocidad de consumo (r) secondo la Legge di Saint-Robert.",
      "Flusso di Massa: Analizza la velocità di generazione ed espulsione dei gas e monitora il consumo percentuale del propellente."
    ]},
    { title: "4. Mission Control", content: [
      "Simula un lancio verticale (1D) usando la curva di spinta generata o importando dati di test reali (CSV/Excel).",
      "Inserisci i dati del tuo razzo: Massa a vuoto, diametro esterno e coefficiente di resistenza aerodinamica (Cd).",
      "La simulazione calcola istantaneamente l'Apogeo (altitudine massima), la velocità massima e l'accelerazione massima.",
      "Visualizza i grafici del profilo di volo (Altitudine e Spinta) fino all'apogeo."
    ]},
    { title: "5. CFD Animation (Animazione CFD)", content: [
      "Guarda un'animazione 2D interattiva del processo di combustione del tuo motore.",
      "Questo strumento mostra come il fuoco consuma il propellente solido dal nucleo verso l'esterno.",
      "Riproduci l'animazione, mettila in pausa o usa la barra per ispezionare il motore in un secondo preciso della simulazione."
    ]}
  ]
};

const TUTORIAL_BTN_TEXTS: Record<string, Record<string, string>> = {
  en: { skip: "Skip", next: "Next", prev: "Back", done: "Ready" },
  es: { skip: "Saltar", next: "Siguiente", prev: "Atrás", done: "¡Hecho!" },
  fr: { skip: "Passer", next: "Suivant", prev: "Retour", done: "Terminé" },
  it: { skip: "Salta", next: "Avanti", prev: "Indietro", done: "Fatto" }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('inputs');
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('hermes_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });
  const [cursor, setCursor] = useState(() => localStorage.getItem('hermes_cursor') || 'default');
  const [grainViewModes, setGrainViewModes] = useState<Record<string, '2d' | '3d'>>({});
  
  React.useEffect(() => {
    localStorage.setItem('hermes_cursor', cursor);
  }, [cursor]);

  const cursorClass = React.useMemo(() => {
    if (cursor === 'rocket') return "cursor-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2224%22%20height=%2224%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23a855f7%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22><path%20d=%22M4.5%2016.5c-1.5%201.26-2%205-2%205s3.74-.5%205-2c.71-.84.7-2.13-.09-2.91a2.18%202.18%200%200%200-2.91-.09z%22/><path%20d=%22m12%2015-3-3a22%2022%200%200%201%202-3.95A12.88%2012.88%200%200%201%2022%202c0%202.72-.78%207.5-6%2011a22.35%2022.35%200%200%201-4%202z%22/><path%20d=%22M9%2012H4s.55-3.03%202-4c1.62-1.08%205%200%205%200%20%22/><path%20d=%22M12%2015v5s3.03-.55%204-2c1.08-1.62%200-5%200-5%20%22/></svg>'),_auto]";
    if (cursor === 'crosshair') return "cursor-crosshair";
    if (cursor === 'pointer') return "cursor-pointer";
    return "cursor-default";
  }, [cursor]);

  const [showSplash, setShowSplash] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showCfdInfo, setShowCfdInfo] = useState(false);
  const [simApogee, setSimApogee] = useState<ApogeeResult | null>(null);
  const [expApogee, setExpApogee] = useState<ApogeeResult | null>(null);
  const [showCredits, setShowCredits] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportData, setExportData] = useState<any[] | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  
  const [savedSimulations, setSavedSimulations] = useState<any[]>(() => {
    const saved = localStorage.getItem('hermes_saved_sims');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.map(s => ({ ...s, id: String(s.id) })) : [];
      } catch (e) {}
    }
    return [];
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveFolder, setSaveFolder] = useState('General');
  const [loadedSimId, setLoadedSimId] = useState<string>('');
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [simToDelete, setSimToDelete] = useState<string | null>(null);

  React.useEffect(() => {
    localStorage.setItem('hermes_saved_sims', JSON.stringify(savedSimulations));
  }, [savedSimulations]);
  
  const [showTutorial, setShowTutorial] = useState(() => {
    const hasSeenTutorial = localStorage.getItem('hermes_tutorial_seen');
    return !hasSeenTutorial;
  });
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const closeTutorial = () => {
    localStorage.setItem('hermes_tutorial_seen', 'true');
    setShowTutorial(false);
    setTutorialStep(0);
  };

  React.useEffect(() => {
    localStorage.setItem('hermes_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };
  
  const [motor, setMotor] = useState(() => {
    const saved = localStorage.getItem('hermes_motor');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { Dc: 60.5, Lc: 483, Gstar: 2, kv: 0, etac: 0.85, paso_de_tiempo: 0.0005, Pamb: 0.101325 };
  });

  const [nozzle, setNozzle] = useState(() => {
    const saved = localStorage.getItem('hermes_nozzle');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { Dt0: 18.8, Ds: 41.1, e: 0, alpha: 12, etanoz: 0.75 };
  });

  React.useEffect(() => {
    localStorage.setItem('hermes_motor', JSON.stringify(motor));
  }, [motor]);

  React.useEffect(() => {
    localStorage.setItem('hermes_nozzle', JSON.stringify(nozzle));
  }, [nozzle]);

  const [customPropellants, setCustomPropellants] = useState<CustomPropellant[]>(() => {
    return loadCustomPropellantsFromStorage();
  });
  const [showPropellantModal, setShowPropellantModal] = useState<boolean>(false);
  const [targetGrainForModal, setTargetGrainForModal] = useState<string | null>(null);

  const handleSavePropellants = (list: CustomPropellant[]) => {
    setCustomPropellants(list);
    saveCustomPropellantsToStorage(list);
    // If any grain was using a custom propellant that got deleted, reset it to default propellant 1 (KNDX)
    const validIds = new Set([...DEFAULT_PROPELLANTS.map(p => p.id), ...list.map(p => p.id)]);
    setGrains(prev => prev.map(g => validIds.has(Number(g.propellantType)) ? g : { ...g, propellantType: 1 as any }));
  };

  const handleSelectPropellantForGrain = (propellantId: number) => {
    if (targetGrainForModal) {
      setGrains(grains.map(g => g.id === targetGrainForModal ? { ...g, propellantType: propellantId as any } : g));
      setTargetGrainForModal(null);
    }
  };

  const allPropellants = React.useMemo(() => {
    return [...DEFAULT_PROPELLANTS, ...customPropellants];
  }, [customPropellants]);

  const defaultGrains = [
    { id: '1', shape: 1 as 1 | 2 | 3, propellantType: 1 as any, D0: 56, d0: 25, d0mayor: 0, L0: 60, N: 5, Np: 0, osi: 1, ci: 1, ei: 1, rhorat: 0.94 }
  ];

  const [grains, setGrains] = useState(() => {
    const saved = localStorage.getItem('hermes_grains');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultGrains;
      }
    }
    return defaultGrains;
  });

  React.useEffect(() => {
    localStorage.setItem('hermes_grains', JSON.stringify(grains));
  }, [grains]);
  const [results, setResults] = useState<SimulationResults | null>(null);

  const addGrain = () => {
    setGrains([...grains, { 
      id: Math.random().toString(), 
      shape: 1, 
      propellantType: 1, 
      D0: 56, 
      d0: 25, 
      d0mayor: 0, 
      L0: 60, 
      N: 1, 
      Np: 0, 
      osi: 1, 
      ci: 1, 
      ei: 1, 
      rhorat: 1,
      numFins: 4,
      finWidth: 10,
      finLength: 15,
      invertedFins: false,
      mapDim: 251
    }]);
  };

  const removeGrain = (id: string) => {
    setGrains(grains.filter(g => g.id !== id));
  };

  const totalPropellantMass = React.useMemo(() => {
    let mass = 0;
    grains.forEach(g => {
      let Vg = 0;
      if (g.shape === 1) { // Cylindrical
        Vg = (Math.PI / 4) * (Math.pow(g.D0, 2) - Math.pow(g.d0, 2)) * g.L0;
      } else if (g.shape === 2) { // Star
        const Np = g.Np || 5;
        const Mx = g.d0mayor / 2;
        const term_pablo_atan = Math.atan( (Mx - (g.d0/2) * Math.cos(Math.PI / Np)) / ((g.d0/2) * Math.sin(Math.PI / Np)) );
        const pablo = Math.cos(-Math.PI / Np + term_pablo_atan);
        const star_hole_area = Np * ( (Math.pow(Mx, 2) * pablo) / 2 + Math.pow(g.d0/2, 2) * Math.sin(Math.PI / Np) );
        Vg = ( (Math.PI / 4) * Math.pow(g.D0, 2) - star_hole_area ) * g.L0;
      } else if (g.shape === 3) { // Solid
        Vg = (Math.PI / 4) * Math.pow(g.D0, 2) * g.L0;
      } else if (g.shape === 4) { // Finocyl
        const numFins = g.numFins !== undefined ? g.numFins : (g.Np > 0 ? g.Np : 4);
        const finL = g.finLength !== undefined ? g.finLength : (g.d0mayor > 0 ? g.d0mayor : 15);
        const finW = g.finWidth !== undefined ? g.finWidth : 10;
        const sign = g.invertedFins ? 1 : -1;
        const Aface = Math.max(0, (Math.PI / 4) * (Math.pow(g.D0, 2) - Math.pow(g.d0, 2)) + sign * numFins * (finW * finL));
        Vg = Aface * g.L0;
      }
      const propData = getPropellantData(g.propellantType, customPropellants);
      const rhoreal = propData.rho * (g.rhorat || 1);
      const Vg0 = Vg * g.N;
      mass += rhoreal * Vg0 / 1e6; // kg
    });
    return mass.toFixed(3);
  }, [grains, customPropellants]);

  const simulate = () => {
    try {
      const res = runSimulation({ motor, nozzle, grains: grains as any, customPropellants });
      setResults(res);
      setActiveTab('results');
    } catch (err) {
      console.error(err);
      alert("Error during simulation. Check the console for details.");
    }
  };

  const handleApplySmartSearchConfiguration = (newMotor: any, newNozzle: any, newGrains: any[]) => {
    setMotor(newMotor);
    setNozzle(newNozzle);
    setGrains(newGrains);
    try {
      const res = runSimulation({ motor: newMotor, nozzle: newNozzle, grains: newGrains, customPropellants });
      setResults(res);
    } catch (err) {
      console.error(err);
    }
    setActiveTab('inputs');
  };

  const prepareExport = (res: SimulationResults) => {
    const data: any[] = [];
    
    const summaryRows = [
      ["Motor Class", res.summary.motorClass, ""],
      ["Total Impulse (IT)", (res.summary.It_total_N_s || 0).toFixed(2), "N·s"],
      ["Specific Impulse (ISP)", (res.summary.Isp_total_s || 0).toFixed(2), "s"],
      ["Burn Time", (res.summary.t_quemado || 0).toFixed(3), "s"],
      ["Action Time", (res.summary.t_fin || 0).toFixed(3), "s"],
      ["Max Pressure", (res.summary.Pmax_MPa || 0).toFixed(4), "MPa"],
      ["Avg Pressure", (res.summary.Pmed_MPa || 0).toFixed(4), "MPa"],
      ["Max Thrust", (res.summary.Fmax_N || 0).toFixed(2), "N"],
      ["Avg Thrust", (res.summary.Fmed_N || 0).toFixed(2), "N"]
    ];

    const maxRows = Math.max(res.t.length, summaryRows.length);

    for (let i = 0; i < maxRows; i++) {
      const row: any = {};
      
      if (i < res.t.length) {
        row["Time (s)"] = Number((res.t[i] || 0).toFixed(4));
        const p_mpa = Math.max(0, res.P0_gage[i] || 0);
        row["Pressure (MPa)"] = Number(p_mpa.toFixed(4));
        row["Pressure (bar)"] = Number((p_mpa * 10).toFixed(4));
        row["Pressure (atm)"] = Number((p_mpa * 9.86923).toFixed(4));
        const f_rn = Math.max(0, res.F_N[i] || 0);
        row["Thrust RN (N)"] = Number(f_rn.toFixed(2));
        row["Thrust RN (kg)"] = Number((f_rn / 9.81).toFixed(2));
        const f_tti = Math.max(0, res.E_N[i] || 0);
        row["Thrust TTI (N)"] = Number(f_tti.toFixed(2));
        row["Thrust TTI (kg)"] = Number((f_tti / 9.81).toFixed(2));
        row["Mass Flow (kg/s)"] = Number((res.mgra_total[i] || 0).toFixed(4));
      } else {
        row["Time (s)"] = "";
        row["Pressure (MPa)"] = "";
        row["Pressure (bar)"] = "";
        row["Pressure (atm)"] = "";
        row["Thrust RN (N)"] = "";
        row["Thrust RN (kg)"] = "";
        row["Thrust TTI (N)"] = "";
        row["Thrust TTI (kg)"] = "";
        row["Mass Flow (kg/s)"] = "";
      }
      
      row[""] = "";
      
      if (i < summaryRows.length) {
        row["Summary Metric"] = summaryRows[i][0];
        row["Value"] = summaryRows[i][1];
        row["Unit"] = summaryRows[i][2];
      } else {
        row["Summary Metric"] = "";
        row["Value"] = "";
        row["Unit"] = "";
      }
      
      data.push(row);
    }
    
    setExportData(data);
    setExportFilename(`HERMES_Results_${motor.Dc}mm`);
    setShowExportModal(true);
  };

  const chartData = results ? results.t.map((time, i) => {
    let pointData: any = {
      time: Number((time || 0).toFixed(4)),
      P0_MPa: Number(Math.max(0, results.P0_MPa[i] || 0).toFixed(3)),
      P0_gage: Number(Math.max(0, results.P0_gage[i] || 0).toFixed(3)),
      F_N: Number(Math.max(0, results.F_N[i] || 0).toFixed(2)),
      E_N: Number(Math.max(0, results.E_N[i] || 0).toFixed(2)),
      mgra_total: Number((results.mgra_total[i] || 0).toFixed(3)),
    };
    
    // Add burn areas for each grain
    results.grains.forEach((g, gIndex) => {
      pointData[`g${gIndex}_Abc`] = Number((results.grains_Abc?.[gIndex]?.[i] || 0).toFixed(1));
      pointData[`g${gIndex}_Abe`] = Number((results.grains_Abe?.[gIndex]?.[i] || 0).toFixed(1));
      pointData[`g${gIndex}_Abs`] = Number((results.grains_Abs?.[gIndex]?.[i] || 0).toFixed(1));
      pointData[`g${gIndex}_Ab`] = Number((results.grains_Ab?.[gIndex]?.[i] || 0).toFixed(1));
    });

    return pointData;
  }) : [];

  const t = translations[lang];

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden ${cursorClass}`}>
      {showSplash && <SplashScreen lang={lang} onComplete={() => setShowSplash(false)} />}

      <header className="bg-card border-border shadow-md text-slate-800 dark:text-slate-200 py-3 px-4 md:px-6 flex justify-between items-center border-b-4 border-b-purple-500 shrink-0 relative z-10 transition-all">
        <div className="flex items-center gap-4">
          <div className="bg-[#040814] p-1 rounded-2xl border border-slate-800 shadow-[0_0_15px_rgba(56,189,248,0.2)] self-center flex items-center justify-center">
             <Logo size={46} className="text-slate-100" theme="dark" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-widest flex items-center gap-2">
              <span className={theme === 'light' ? 'text-slate-900' : 'text-slate-100'}>
                {t.title.split(' ')[0]}
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-semibold hidden sm:inline drop-shadow-[0_0_4px_rgba(168,85,247,0.25)]">
                {t.title.substring(t.title.indexOf(' ') + 1)}
              </span>
            </h1>
            <p className="text-[10px] md:text-xs text-[#2563eb] dark:text-blue-400/80 font-mono tracking-widest uppercase mt-0.5 font-extrabold">
              {t.subtitle}
            </p>
          </div>
        </div>
        <div className="text-right flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end">
            <div className={`text-[10px] md:text-xs font-mono px-2 py-1 rounded flex items-center gap-2 ${
              theme === 'light' 
                ? 'bg-purple-100 text-purple-700 border border-purple-300 shadow-sm' 
                : 'bg-indigo-900/40 text-purple-400 border border-purple-900/50 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                theme === 'light'
                  ? 'bg-purple-600 shadow-[0_0_5px_rgba(147,51,234,0.8)]'
                  : 'bg-purple-400 shadow-[0_0_5px_rgba(168,85,247,0.8)]'
              }`}></div>
              {t.system_op}
            </div>
          </div>

          {/* Version History Book & Quick Guide Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVersionHistory(true)}
              title={
                lang === 'es' ? 'Historial interactivo de versiones' :
                lang === 'fr' ? 'Historique interactif des versions' :
                lang === 'it' ? 'Cronologia interattiva delle versioni' : 'Interactive version history book'
              }
              className={`h-8 px-2.5 text-xs font-semibold gap-1.5 border transition-all shadow-sm ${
                theme === 'light'
                  ? 'bg-white hover:bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400'
                  : 'bg-slate-900/90 hover:bg-purple-950/40 text-purple-300 border-purple-800/60 hover:border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span className="hidden sm:inline">
                {lang === 'es' ? 'Versiones' : lang === 'fr' ? 'Versions' : lang === 'it' ? 'Versioni' : 'Versions'}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTutorialStep(0);
                setShowTutorial(true);
              }}
              title={
                lang === 'es' ? 'Guía rápida de uso' :
                lang === 'fr' ? 'Guide d\'utilisation' :
                lang === 'it' ? 'Guida rapida' : 'Quick user guide'
              }
              className={`h-8 px-2.5 text-xs font-semibold gap-1.5 border transition-all shadow-sm ${
                theme === 'light'
                  ? 'bg-white hover:bg-stone-50 text-stone-700 border-slate-300 hover:border-slate-400'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/50 hover:border-slate-500'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">
                {lang === 'es' ? 'Guía' : lang === 'fr' ? 'Guide' : lang === 'it' ? 'Guida' : 'Guide'}
              </span>
            </Button>
          </div>

          {showInstallBtn && (
            <Button 
              onClick={handleInstallClick}
              className="bg-emerald-600/80 hover:bg-emerald-500 text-slate-200 border border-emerald-400/50 h-8 text-[10px] font-bold px-3 gap-2 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse hover:animate-none"
            >
              <Download className="w-3.5 h-3.5" />
              {lang === 'es' ? 'INSTALAR APP' : (lang === 'fr' ? 'INSTALLER' : 'INSTALL APP')}
            </Button>
          )}

          {/* Saved Simulations */}
          <div className="hidden md:flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowSaveModal(true)}
              className={`h-8 text-[10px] uppercase font-bold px-3 transition-colors ${
                theme === 'light'
                  ? 'bg-white border-[#e4dfd5] text-stone-700 hover:text-stone-900 hover:bg-stone-50'
                  : 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:text-slate-100'
              }`}
            >
              {lang === 'es' ? 'Guardar' : 'Save'}
            </Button>
            
            {savedSimulations.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => setShowLibraryModal(true)}
                className={`h-8 text-[10px] uppercase font-bold px-3 transition-colors ${
                  theme === 'light'
                    ? 'bg-white border-[#e4dfd5] text-stone-700 hover:text-stone-900 hover:bg-stone-50'
                    : 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:text-slate-100'
                }`}
              >
                <FolderOpen size={14} className="mr-1.5" />
                {lang === 'es' ? 'Biblioteca' : 'Library'}
              </Button>
            )}
          </div>

          {/* Cursor Dropdown */}
          <Select value={cursor} onValueChange={(v) => setCursor(v)}>
            <SelectTrigger className={`w-28 h-8 text-xs font-semibold px-2 flex items-center justify-between gap-1 backdrop-blur-sm shadow-sm transition-colors cursor-pointer rounded border focus:outline-none focus:ring-0 ${
              theme === 'light' 
                ? 'bg-white border-slate-300 text-slate-700' 
                : 'bg-slate-900/80 border-slate-700/50 text-slate-200'
            }`}>
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate">{cursor === 'rocket' ? '🚀 Rocket' : cursor === 'crosshair' ? '⌖ Cross' : cursor === 'pointer' ? '👆 Point' : 'Mouse'}</span>
              </div>
            </SelectTrigger>
            <SelectContent className={`border ${
              theme === 'light' 
                ? 'bg-white text-slate-800 border-slate-200' 
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}>
              <SelectItem value="default" className="text-xs cursor-pointer">Mouse</SelectItem>
              <SelectItem value="rocket" className="text-xs cursor-pointer">🚀 Rocket</SelectItem>
              <SelectItem value="crosshair" className="text-xs cursor-pointer">⌖ Cross</SelectItem>
              <SelectItem value="pointer" className="text-xs cursor-pointer">👆 Point</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Theme Dropdown */}
          <Select value={theme} onValueChange={(v) => setTheme(v as 'dark' | 'light')}>
            <SelectTrigger className={`w-24 h-8 text-xs font-semibold px-2 flex items-center justify-between gap-1 backdrop-blur-sm shadow-sm transition-colors cursor-pointer rounded border focus:outline-none focus:ring-0 ${
              theme === 'light' 
                ? 'bg-white border-slate-300 text-slate-700' 
                : 'bg-slate-900/80 border-slate-700/50 text-slate-200'
            }`}>
              <div className="flex items-center gap-1.5">
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-purple-400 shrink-0" /> : <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                <span className="truncate">{theme === 'dark' ? (lang === 'es' ? 'Oscuro' : 'Dark') : (lang === 'es' ? 'Claro' : 'Light')}</span>
              </div>
            </SelectTrigger>
            <SelectContent className={`border ${
              theme === 'light' 
                ? 'bg-white text-slate-800 border-slate-200' 
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}>
              <SelectItem value="dark" className="text-xs cursor-pointer">
                <span className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  {lang === 'es' ? 'Oscuro' : (lang === 'fr' ? 'Sombre' : (lang === 'it' ? 'Scuro' : 'Dark'))}
                </span>
              </SelectItem>
              <SelectItem value="light" className="text-xs cursor-pointer">
                <span className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {lang === 'es' ? 'Claro' : (lang === 'fr' ? 'Clair' : (lang === 'it' ? 'Chiaro' : 'Light'))}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Language Dropdown */}
          <Select value={lang} onValueChange={(v) => setLang(v as Language)}>
            <SelectTrigger className={`w-20 h-8 text-xs font-semibold backdrop-blur-sm shadow-sm transition-colors cursor-pointer rounded border ${
              theme === 'light' 
                ? 'bg-white border-slate-300 text-slate-700' 
                : 'bg-slate-900/80 border-slate-700/50 text-slate-200'
            }`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={`border ${
              theme === 'light' 
                ? 'bg-white text-slate-800 border-slate-200' 
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}>
              <SelectItem value="en" className="text-xs cursor-pointer">ENG</SelectItem>
              <SelectItem value="es" className="text-xs cursor-pointer">ESP</SelectItem>
              <SelectItem value="fr" className="text-xs cursor-pointer">FRA</SelectItem>
              <SelectItem value="it" className="text-xs cursor-pointer">ITA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex-1 p-2 md:p-4 max-w-[1600px] mx-auto w-full flex flex-col relative z-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full min-h-0">
          <div className="flex justify-between items-center mb-1 shrink-0 overflow-x-auto">
            <TabsList className={`flex h-8 w-max shrink-0 ${theme === 'light' ? 'bg-[#f1ede3] border-[#dfd8ca]' : 'bg-slate-900/60 border-slate-800/80'} border backdrop-blur-md rounded-lg p-0.5 gap-1.5 shadow-sm`}>
              <TabsTrigger value="inputs" className={`font-bold text-xs ${theme === 'light' ? 'data-[state=active]:bg-[#faf9f6]/95 data-[state=active]:text-indigo-600' : 'data-[state=active]:bg-slate-950 data-[state=active]:text-purple-400'}`}>{t.inputs}</TabsTrigger>
              <TabsTrigger value="results" disabled={!results} className={`font-bold text-xs ${theme === 'light' ? 'data-[state=active]:bg-[#faf9f6]/95 data-[state=active]:text-indigo-600' : 'data-[state=active]:bg-slate-950 data-[state=active]:text-purple-400'}`}>{t.results}</TabsTrigger>
              <TabsTrigger value="analysis" disabled={!results} className={`font-bold text-xs ${theme === 'light' ? 'data-[state=active]:bg-[#faf9f6]/95 data-[state=active]:text-indigo-600' : 'data-[state=active]:bg-slate-950 data-[state=active]:text-purple-400'}`}>{t.analysis || "Análisis"}</TabsTrigger>
              <TabsTrigger value="mission_control" className={`font-bold text-xs ${theme === 'light' ? 'data-[state=active]:bg-[#faf9f6]/95 data-[state=active]:text-indigo-600' : 'data-[state=active]:bg-slate-950 data-[state=active]:text-purple-400'}`}>{t.mission_control || "Mission Control"}</TabsTrigger>
              <TabsTrigger 
                value="smart_search" 
                className={`font-bold text-xs transition-all flex items-center gap-1.5 px-3 py-1 rounded-md ${
                  activeTab === 'smart_search'
                    ? theme === 'light'
                      ? '!bg-emerald-100 !text-emerald-950 !border-2 !border-emerald-500 shadow-sm'
                      : '!bg-emerald-950/80 !text-white !border-2 !border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.45)]'
                    : theme === 'light'
                      ? 'text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-400/40'
                      : 'text-stone-300 hover:text-emerald-300 hover:bg-emerald-950/30 border border-emerald-500/30'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Smart Search
              </TabsTrigger>
              <TabsTrigger 
                value="agente_jesus" 
                className={`font-bold text-xs transition-all flex items-center gap-1.5 px-3 py-1 rounded-md ${
                  activeTab === 'agente_jesus'
                    ? theme === 'light'
                      ? '!bg-amber-100 !text-amber-950 !border-2 !border-amber-500 shadow-sm'
                      : '!bg-amber-950/80 !text-white !border-2 !border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.45)]'
                    : theme === 'light'
                      ? 'text-stone-700 hover:text-amber-800 hover:bg-amber-50 border border-amber-400/40'
                      : 'text-stone-300 hover:text-amber-300 hover:bg-amber-950/30 border border-amber-500/30'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Agente Jesús
              </TabsTrigger>
              <TabsTrigger value="cfd" disabled={!results} className={`font-bold text-xs ${theme === 'light' ? 'data-[state=active]:bg-[#faf9f6]/95 data-[state=active]:text-indigo-600' : 'data-[state=active]:bg-slate-950 data-[state=active]:text-purple-400'}`}>{t.cfd || "CFD Animation"}</TabsTrigger>
            </TabsList>
            <Button onClick={simulate} className="bg-destructive hover:bg-destructive/80 text-slate-200 font-bold shadow-[0_0_15px_rgba(249,115,22,0.5)] whitespace-nowrap min-w-[150px] h-9 ml-4 shrink-0 transition-all">
               {t.run}
            </Button>
          </div>

          <TabsContent value="inputs" className="flex-1 flex flex-col min-h-0 gap-2 px-1 overflow-y-auto no-scrollbar pt-2">
              
            {/* TOP ROW: Motor & Nozzle Settings + Visualizations */}
            <div className="flex-none grid grid-cols-1 xl:grid-cols-3 gap-3 min-h-[170px] mb-1">
                <Card className="bg-card border-border shadow-sm flex flex-col rounded-md overflow-hidden border-t-2 border-t-purple-500">
                  <CardHeader className="py-2 px-3 bg-purple-500/10 dark:bg-indigo-950/30 border-b border-border flex-none"><CardTitle className="text-[11px] uppercase tracking-widest text-purple-700 dark:text-purple-400 font-bold">{t.motor}</CardTitle></CardHeader>
                  <CardContent className="flex-1 p-2 grid grid-cols-2 gap-x-2.5 sm:gap-x-3 gap-y-1">
                    <NumberInput label={t.chamber_d + " [mm]"} value={motor.Dc} onChange={(v:any) => setMotor({...motor, Dc: v})} tooltip={t.dc_desc} />
                    <NumberInput label={t.chamber_l + " [mm]"} value={motor.Lc} onChange={(v:any) => setMotor({...motor, Lc: v})} tooltip={t.lc_desc} />
                    <NumberInput label={t.gstar} step="0.1" value={motor.Gstar} onChange={(v:any) => setMotor({...motor, Gstar: v})} tooltip={t.gstar_desc} />
                    <NumberInput label={t.kv} step="0.1" value={motor.kv} onChange={(v:any) => setMotor({...motor, kv: v})} tooltip={t.kv_desc} />
                    <NumberInput label={t.eff_c} step="0.01" value={motor.etac} onChange={(v:any) => setMotor({...motor, etac: v})} tooltip={t.etac_desc} />
                    <NumberInput label={t.time_step } step="0.001" decimals={3} value={motor.paso_de_tiempo} onChange={(v:any) => setMotor({...motor, paso_de_tiempo: v})} tooltip={t.dt_desc} inputWidth="w-[58px] sm:w-[68px]" />
                    <NumberInput label={t.p_amb } step="0.001" decimals={3} value={motor.Pamb} onChange={(v:any) => setMotor({...motor, Pamb: v})} tooltip={t.pamb_desc} inputWidth="w-[58px] sm:w-[68px]" />
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm flex flex-col rounded-md overflow-hidden border-t-2 border-t-blue-500">
                  <CardHeader className="py-1.5 px-3 bg-blue-500/10 dark:bg-indigo-950/30 border-b border-border flex-none flex flex-row items-center justify-between">
                    <CardTitle className="text-[11px] uppercase tracking-widest text-blue-700 dark:text-blue-400 font-bold">{t.nozzle}</CardTitle>
                    <div className="flex items-center gap-1 text-blue-600/80 dark:text-blue-400/80 hover:text-blue-600 cursor-help" title={t.slag_tooltip}>
                      <Info className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-mono font-bold hidden sm:inline">{lang === 'es' ? 'Escoria / Erosión' : 'Slag / Erosion'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-2 gap-x-2.5 sm:gap-x-3 gap-y-1">
                      <NumberInput label={t.throat_d + " [mm]"} value={nozzle.Dt0} onChange={(v:any) => setNozzle({...nozzle, Dt0: v})} tooltip={t.dt0_desc} />
                      <NumberInput label={t.exit_d + " [mm]"} value={nozzle.Ds} onChange={(v:any) => setNozzle({...nozzle, Ds: v})} tooltip={t.ds_desc} />
                      <NumberInput label={t.div_angle + " [º]"} step="1" value={nozzle.alpha} onChange={(v:any) => setNozzle({...nozzle, alpha: v})} tooltip={t.alpha_desc} />
                      <NumberInput label={t.eff_n} step="0.01" value={nozzle.etanoz} onChange={(v:any) => setNozzle({...nozzle, etanoz: v})} tooltip={t.etanoz_desc} />
                    </div>

                    {/* Escoria / Slag & Erosion Panel */}
                    <div className={`p-1.5 rounded border ${theme === 'light' ? 'bg-blue-50/40 border-blue-200/80' : 'bg-slate-900/60 border-blue-900/40'} flex flex-col gap-1 mt-0.5`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tight">{t.slag_erosion_title}</span>
                          <span title={t.slag_tooltip} className="cursor-help text-blue-500/80 hover:text-blue-500 inline-flex items-center">
                            <Info className="w-3 h-3" />
                          </span>
                        </div>
                        {nozzle.e !== 0 && (
                          <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${nozzle.e < 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'}`}>
                            {nozzle.e < 0 ? `Slag: Dt → ${(Math.max(0.5, nozzle.Dt0 + nozzle.e)).toFixed(2)} mm` : `Ero: Dt → ${(nozzle.Dt0 + nozzle.e).toFixed(2)} mm`}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 items-center">
                        <div className="col-span-1">
                          <Select 
                            value={nozzle.e < 0 ? 'slag' : nozzle.e > 0 ? 'erosion' : 'none'} 
                            onValueChange={(v) => {
                              if (v === 'none') {
                                setNozzle({ ...nozzle, e: 0 });
                              } else if (v === 'slag') {
                                const mag = Math.abs(nozzle.e) || 0.8;
                                const maxSafe = Math.max(0.1, nozzle.Dt0 - 0.5);
                                setNozzle({ ...nozzle, e: -Math.min(mag, maxSafe), ero_model: nozzle.ero_model || 1 });
                              } else if (v === 'erosion') {
                                const mag = Math.abs(nozzle.e) || 0.8;
                                setNozzle({ ...nozzle, e: mag, ero_model: nozzle.ero_model || 1 });
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-[10px] px-1.5 py-0 bg-background border-input font-medium cursor-pointer">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-foreground">
                              <SelectItem value="none" className="text-[10px] cursor-pointer font-medium">{t.slag_none}</SelectItem>
                              <SelectItem value="slag" className="text-[10px] cursor-pointer font-medium text-amber-600 dark:text-amber-400">{t.slag_deposit}</SelectItem>
                              <SelectItem value="erosion" className="text-[10px] cursor-pointer font-medium text-blue-600 dark:text-blue-400">{t.slag_erosion}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-1">
                          {nozzle.e !== 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">|ΔDt| [mm]:</span>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.01"
                                max={nozzle.e < 0 ? String(Math.max(0.1, nozzle.Dt0 - 0.5)) : "15"}
                                value={Math.abs(nozzle.e) || 0}
                                onChange={(e) => {
                                  const rawVal = parseFloat(e.target.value) || 0;
                                  const sign = nozzle.e < 0 ? -1 : 1;
                                  const maxSafe = nozzle.e < 0 ? Math.max(0.1, nozzle.Dt0 - 0.5) : 50;
                                  const clamped = Math.min(rawVal, maxSafe);
                                  setNozzle({ ...nozzle, e: sign * clamped });
                                }}
                                className="h-6 w-full text-[10px] font-mono px-1 py-0 bg-background border-input text-right font-bold"
                              />
                            </div>
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic pl-1 font-mono">{lang === 'es' ? 'Tobera ideal / no ablativa' : 'Ideal nozzle / no ablation'}</span>
                          )}
                        </div>
                      </div>

                      {nozzle.e !== 0 && (
                        <div className="mt-0.5">
                          <UiLabel className="text-[9px] text-muted-foreground font-mono mb-0.5 block">{t.slag_model_label}</UiLabel>
                          <Select 
                            value={String(nozzle.ero_model || 1)} 
                            onValueChange={(v) => setNozzle({ ...nozzle, ero_model: (+v as any) })}
                          >
                            <SelectTrigger className="h-6 text-[10px] px-1.5 py-0 bg-background border-input font-medium cursor-pointer">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-foreground">
                              <SelectItem value="1" className="text-[10px] cursor-pointer">{t.model_linear}</SelectItem>
                              <SelectItem value="2" className="text-[10px] cursor-pointer">{t.model_exp}</SelectItem>
                              <SelectItem value="3" className="text-[10px] cursor-pointer">{t.model_quad}</SelectItem>
                              <SelectItem value="4" className="text-[10px] cursor-pointer">{t.model_sqrt}</SelectItem>
                              <SelectItem value="5" className="text-[10px] cursor-pointer">{t.model_parabola}</SelectItem>
                              <SelectItem value="6" className="text-[10px] cursor-pointer">{t.model_sine}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-card border-border shadow-[inset_0_2px_15px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)] rounded-md relative overflow-hidden flex flex-col min-h-[160px] justify-center items-center border-t-2 border-t-slate-500/50">
                   <span className="absolute top-1.5 left-2 text-[9px] font-bold text-slate-700 dark:text-slate-300 uppercase bg-card dark:bg-slate-900/80 backdrop-blur-sm px-1.5 py-0.5 rounded border border-border dark:border-slate-700 z-10 shadow-sm">{t.motor_chamber} SCHEMATIC</span>
                   <MotorPreview motor={motor} grains={grains} />
                </div>
            </div>

            {/* BOTTOM AREA: Vertical list of horizontal grain rows */}
            <Card className="flex-1 flex flex-col min-h-0 shadow-sm overflow-hidden bg-card border-border rounded-md">
               <CardHeader className={`py-2 px-3 ${theme === 'light' ? 'bg-purple-50/80 text-purple-800' : 'bg-muted/30 text-purple-400'} border-b border-border flex flex-row justify-between items-center shrink-0`}>
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <CardTitle className={`text-[12px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-purple-800' : 'text-purple-400'}`}>{t.grains}</CardTitle>
                    <div 
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono shadow-xs transition-all ${
                        theme === 'light' 
                          ? 'bg-purple-100 text-purple-900 border-purple-300' 
                          : 'bg-purple-950/70 text-purple-200 border-purple-700/60'
                      }`} 
                      title={lang === 'es' ? 'Masa Total de todos los bloques de propulsante' : 'Total mass of all propellant grains'}
                    >
                      <Scale className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                        {lang === 'es' ? 'Masa de Propulsante:' : 'Propellant Mass:'}
                      </span>
                      <span className="text-xs font-bold text-foreground bg-background/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded border border-purple-500/30">
                        {totalPropellantMass} kg
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => { setTargetGrainForModal(null); setShowPropellantModal(true); }} 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-[10px] px-2.5 sm:px-3 gap-1.5 border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15 font-semibold rounded"
                    >
                      <Beaker className="w-3.5 h-3.5 text-purple-500" />
                      <span className="hidden sm:inline">{lang === 'es' ? 'Química & Propulsantes' : 'Propellant Chemistry'}</span>
                      <span className="sm:hidden">{lang === 'es' ? 'Química' : 'Chemistry'}</span>
                    </Button>
                    <Button onClick={addGrain} size="sm" className="h-7 text-[10px] px-3 sm:px-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-700 dark:text-purple-300 rounded font-bold shadow-[0_0_10px_rgba(168,85,247,0.15)] dark:shadow-[0_0_10px_rgba(168,85,247,0.2)] transition-all">
                      {t.new_grain}
                    </Button>
                  </div>
               </CardHeader>
               
               <CardContent className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 no-scrollbar">
                  {grains.map((g, index) => (
                    <div key={g.id} className={`w-full flex shrink-0 border border-border/80 dark:border-slate-700/50 ${theme === 'light' ? 'bg-white hover:border-purple-200' : 'bg-muted/10 hover:border-slate-600/80'} rounded-md shadow-sm min-h-[140px] overflow-hidden backdrop-blur-xs relative group/grain transition-colors`}>
                        {/* 1. Index & Remove */}
                        <div className={`w-8 shrink-0 ${theme === 'light' ? 'bg-purple-50/50 text-purple-700' : 'bg-slate-900/60 text-purple-400'} flex flex-col items-center justify-center border-r border-border relative`}>
                           <span className="text-xs font-bold transform -rotate-90 whitespace-nowrap uppercase tracking-widest drop-shadow-[0_0_4px_rgba(168,85,247,0.2)]">{t.grains} {index + 1}</span>
                           <Button variant="ghost" size="icon" onClick={() => removeGrain(g.id)} disabled={grains.length === 1} className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 p-0 text-[12px] absolute top-1 opacity-50 group-hover/grain:opacity-100 transition-opacity">
                             ✕
                           </Button>
                        </div>

                        {/* 2. Inputs (Propellant/Shape & Main dimensions) */}
                        <div className="flex-1 p-2.5 grid grid-cols-2 gap-x-3.5 sm:gap-x-5 gap-y-1 min-w-[280px]">
                            <div className="space-y-1.5">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <UiLabel className="text-[10px] block px-0.5 uppercase tracking-wider text-slate-550 dark:text-slate-400 font-bold">{t.propellant}</UiLabel>
                                    <button 
                                      type="button" 
                                      onClick={() => { setTargetGrainForModal(g.id); setShowPropellantModal(true); }}
                                      className="text-[9px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                                    >
                                      <Beaker className="w-2.5 h-2.5" />
                                      {lang === 'es' ? 'Fórmula' : 'Formula'}
                                    </button>
                                  </div>
                                  <Select 
                                    value={String(g.propellantType)} 
                                    onValueChange={v => {
                                      if (v === '__manage_propellants__') {
                                        setTargetGrainForModal(g.id);
                                        setShowPropellantModal(true);
                                      } else {
                                        setGrains(grains.map(x => x.id === g.id ? {...x, propellantType: +v as any} : x));
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="bg-background border-input h-8 text-[11px] px-2 py-0 min-h-0 text-foreground cursor-pointer flex items-center justify-between">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card text-foreground border-border max-h-64">
                                      <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {lang === 'es' ? 'Estándar' : 'Standard'}
                                      </div>
                                      {DEFAULT_PROPELLANTS.map(p => (
                                        <SelectItem key={p.id} value={String(p.id)} className="text-[11px] font-medium cursor-pointer">
                                          {p.name}
                                        </SelectItem>
                                      ))}
                                      {customPropellants.length > 0 && (
                                        <>
                                          <div className="px-2 py-1 mt-1.5 text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 border-t border-border/50">
                                            {lang === 'es' ? 'Personalizados' : 'Custom'}
                                          </div>
                                          {customPropellants.map(p => (
                                            <SelectItem key={p.id} value={String(p.id)} className="text-[11px] font-medium cursor-pointer">
                                              🧪 {p.name}
                                            </SelectItem>
                                          ))}
                                        </>
                                      )}
                                      <SelectItem value="__manage_propellants__" className="text-[10px] font-bold text-purple-600 dark:text-purple-400 cursor-pointer border-t border-border mt-1">
                                        + {lang === 'es' ? 'Gestionar Química...' : 'Manage Chemistry...'}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <NumberInput label={t.outer_d0 + " [mm]"} value={g.D0} onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, D0: v} : x))} tooltip={t.outer_d0_desc} />
                                <NumberInput label={t.length_l0 + " [mm]"} value={g.L0} onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, L0: v} : x))} tooltip={t.length_l0_desc} />
                                <NumberInput label={t.n_blocks} value={g.N} onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, N: v} : x))} tooltip={t.n_blocks_desc} />
                                <NumberInput label={t.rho_rat} step="0.01" value={g.rhorat} onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, rhorat: v} : x))} tooltip={t.rho_rat_desc} />
                            </div>

                            <div className="space-y-1.5">
                                <div>
                                  <UiLabel className="text-[10px] mb-1 block px-0.5 uppercase tracking-wider text-slate-550 dark:text-slate-400 font-bold">{t.shape}</UiLabel>
                                  <Select value={String(g.shape)} onValueChange={v => setGrains(grains.map(x => x.id === g.id ? {...x, shape: +v as any} : x))}>
                                    <SelectTrigger className="bg-background border-input h-8 text-[11px] px-2 py-0 min-h-0 text-foreground flex items-center gap-2 cursor-pointer w-full justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <GrainShapeIcon shape={g.shape} grainId={g.id} />
                                        <span className="font-semibold">{g.shape === 1 ? (lang === 'es' ? 'Cilíndrico' : 'Cylindrical') : g.shape === 2 ? (lang === 'es' ? 'Estrella' : 'Star') : g.shape === 4 ? 'Finocyl (FMM)' : (lang === 'es' ? 'Macizo' : 'Solid')}</span>
                                      </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-card text-foreground border-border min-w-[200px]">
                                      <SelectItem value="1" className="text-[11px] py-1.5 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <GrainShapeIcon shape={1} grainId={`${g.id}-opt1`} />
                                          <div className="text-left">
                                            <p className="font-bold text-xs">{lang === 'es' ? 'Cilíndrico' : 'Cylindrical'}</p>
                                            <p className="text-[9px] opacity-80 leading-none">{lang === 'es' ? 'Perforación tubular central' : 'Central tubular core'}</p>
                                          </div>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="2" className="text-[11px] py-1.5 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <GrainShapeIcon shape={2} grainId={`${g.id}-opt2`} />
                                          <div className="text-left">
                                            <p className="font-bold text-xs">{lang === 'es' ? 'Estrella' : 'Star'}</p>
                                            <p className="text-[9px] opacity-80 leading-none">{lang === 'es' ? 'Perforación estelar progresiva' : 'Star core configuration'}</p>
                                          </div>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="4" className="text-[11px] py-1.5 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <GrainShapeIcon shape={4} grainId={`${g.id}-opt4`} />
                                          <div className="text-left">
                                            <p className="font-bold text-xs">Finocyl (FMM)</p>
                                            <p className="text-[9px] opacity-80 leading-none">{lang === 'es' ? 'Núcleo circular con aletas (OpenMotor)' : 'Circular core with rectangular fins'}</p>
                                          </div>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="3" className="text-[11px] py-1.5 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <GrainShapeIcon shape={3} grainId={`${g.id}-opt3`} />
                                          <div className="text-left">
                                            <p className="font-bold text-xs">{lang === 'es' ? 'Macizo' : 'Solid'}</p>
                                            <p className="text-[9px] opacity-80 leading-none">{lang === 'es' ? 'Sin núcleo, quemado exterior' : 'No core, external burn only'}</p>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {g.shape !== 3 && <NumberInput label={t.inner_d0 + " [mm]"} value={g.d0} onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, d0: v} : x))} tooltip={t.inner_d0_desc} />}
                                {g.shape === 2 && (
                                  <>
                                    <NumberInput label={t.valley_d0 + " [mm]"} value={g.d0mayor} onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, d0mayor: v} : x))} tooltip={t.valley_d0_desc} />
                                    <NumberInput label={t.star_points} value={g.Np} onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, Np: v} : x))} tooltip={t.star_points_desc} />
                                    {(() => {
                                      const minD0mayor = g.d0 / Math.cos(Math.PI / Math.max(3, g.Np));
                                      const isInvalid = g.d0mayor <= minD0mayor || g.d0mayor >= g.D0 || g.Np < 3;
                                      if (isInvalid) {
                                        return (
                                          <div className="col-span-2 bg-destructive/10 border border-destructive/30 p-1.5 rounded-sm flex flex-col gap-0.5 mt-1 backdrop-blur-sm">
                                            <span className="text-[9px] font-bold text-destructive uppercase tracking-widest leading-none drop-shadow-md">Star Configuration Alert</span>
                                            {g.Np < 3 && <span className="text-[9px] text-destructive/80 font-mono line-clamp-1 italic">• Need &gt;= 3 points</span>}
                                            {g.d0mayor <= minD0mayor && <span className="text-[9px] text-destructive/80 font-mono line-clamp-1 italic">• Valley (Dp) &gt; {(minD0mayor).toFixed(1)}mm</span>}
                                            {g.d0mayor >= g.D0 && <span className="text-[9px] text-destructive/80 font-mono line-clamp-1 italic">• Valley (Dp) &lt; Outer D0</span>}
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </>
                                )}
                                {g.shape === 4 && (
                                  <>
                                    <NumberInput 
                                      label={t.num_fins} 
                                      step="1"
                                      value={g.numFins !== undefined ? g.numFins : (g.Np > 0 ? g.Np : 4)} 
                                      onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, numFins: Math.max(0, Math.floor(v)), Np: Math.max(0, Math.floor(v))} : x))} 
                                      tooltip={t.num_fins_desc} 
                                    />
                                    <NumberInput 
                                      label={t.fin_length + " [mm]"} 
                                      step="0.5"
                                      value={g.finLength !== undefined ? g.finLength : (g.d0mayor > 0 ? g.d0mayor : 15)} 
                                      onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, finLength: v, d0mayor: v} : x))} 
                                      tooltip={t.fin_length_desc} 
                                    />
                                    <NumberInput 
                                      label={t.fin_width + " [mm]"} 
                                      step="0.5"
                                      value={g.finWidth !== undefined ? g.finWidth : 10} 
                                      onChange={(v:any) => setGrains(grains.map(x => x.id === g.id ? {...x, finWidth: v} : x))} 
                                      tooltip={t.fin_width_desc} 
                                    />
                                    <div className="col-span-2 flex items-center justify-between py-1 px-1 bg-muted/20 rounded border border-border/40 mt-1">
                                      <UiLabel className="text-[10px] text-muted-foreground font-mono cursor-pointer" htmlFor={`inv-${g.id}`}>
                                        {t.inverted_fins}
                                      </UiLabel>
                                      <Checkbox 
                                        id={`inv-${g.id}`}
                                        checked={!!g.invertedFins} 
                                        onCheckedChange={c => setGrains(grains.map(x => x.id === g.id ? {...x, invertedFins: !!c} : x))} 
                                        className="w-4 h-4 rounded-sm border-slate-400 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                      />
                                    </div>
                                    {(() => {
                                      const finParams = {
                                        Dg: g.D0,
                                        L: g.L0,
                                        Dc: g.d0,
                                        Nf: g.numFins !== undefined ? g.numFins : (g.Np > 0 ? g.Np : 4),
                                        w: g.finWidth !== undefined ? g.finWidth : 10,
                                        l: g.finLength !== undefined ? g.finLength : (g.d0mayor > 0 ? g.d0mayor : 15),
                                        invertedFins: !!g.invertedFins,
                                      };
                                      const val = validateFinocylGeometry(finParams);
                                      if (!val.valid || val.warnings.length > 0) {
                                        return (
                                          <div className={`col-span-2 ${val.errors.length > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-amber-500/10 border-amber-500/30'} border p-1.5 rounded-sm flex flex-col gap-0.5 mt-1 backdrop-blur-sm`}>
                                            <span className={`text-[9px] font-bold ${val.errors.length > 0 ? 'text-destructive' : 'text-amber-500'} uppercase tracking-widest leading-none drop-shadow-md`}>
                                              {val.errors.length > 0 ? 'Finocyl Geometry Error' : 'Finocyl Warning'}
                                            </span>
                                            {val.errors.map((err, eIdx) => (
                                              <span key={eIdx} className="text-[9px] text-destructive/90 font-mono line-clamp-1 italic">• {err}</span>
                                            ))}
                                            {val.warnings.map((warn, wIdx) => (
                                              <span key={wIdx} className="text-[9px] text-amber-600 dark:text-amber-400 font-mono line-clamp-1 italic">• {warn}</span>
                                            ))}
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </>
                                )}
                                
                                <div className="border-t border-border pt-2 mt-2 flex justify-between items-center px-1">
                                  <UiLabel className="text-[10px] text-[#2563eb] dark:text-blue-400/80 uppercase font-bold tracking-wider">{t.burn_faces}</UiLabel>
                                  <div className="flex gap-4">
                                  <div className="flex items-center space-x-1.5" title={t.external}><Checkbox className="w-4 h-4 rounded-sm border-slate-400 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary" checked={g.osi===1} onCheckedChange={c => setGrains(grains.map(x => x.id === g.id ? {...x, osi: c ? 1 : 0} : x))} id={`osi-${g.id}`} /><UiLabel className="text-[11px] font-mono text-slate-700 dark:text-slate-350 font-bold cursor-pointer" htmlFor={`osi-${g.id}`}>EXT</UiLabel></div>
                                  <div className="flex items-center space-x-1.5" title={t.ends}><Checkbox className="w-4 h-4 rounded-sm border-slate-400 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary" checked={g.ei===1} onCheckedChange={c => setGrains(grains.map(x => x.id === g.id ? {...x, osi: g.osi, ei: c ? 1 : 0} : x))} id={`ei-${g.id}`} /><UiLabel className="text-[11px] font-mono text-slate-700 dark:text-slate-350 font-bold cursor-pointer" htmlFor={`ei-${g.id}`}>ENDS</UiLabel></div>
                                  {g.shape !== 3 && <div className="flex items-center space-x-1.5" title={t.internal}><Checkbox className="w-4 h-4 rounded-sm border-slate-400 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary" checked={g.ci===1} onCheckedChange={c => setGrains(grains.map(x => x.id === g.id ? {...x, ci: c ? 1 : 0} : x))} id={`ci-${g.id}`} /><UiLabel className="text-[11px] font-mono text-slate-700 dark:text-slate-350 font-bold cursor-pointer" htmlFor={`ci-${g.id}`}>INT</UiLabel></div>}
                                  </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Previews (2D Transversal/Longitudinal & 3D Interactive) */}
                        <div className={`w-[350px] shrink-0 ${theme === 'light' ? 'bg-purple-50/15' : 'bg-slate-900/50'} border-l border-border flex flex-col overflow-hidden relative min-h-[170px]`}>
                            {/* Inner glow effect */}
                            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] z-0 pointer-events-none"></div>

                            {/* View Switcher: 2D vs 3D */}
                            <div className="absolute top-1.5 right-2 z-20 flex items-center bg-card/85 backdrop-blur-md rounded border border-border p-0.5 shadow-sm">
                              <button
                                type="button"
                                onClick={() => setGrainViewModes(prev => ({ ...prev, [g.id]: '2d' }))}
                                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded transition-all ${
                                  (grainViewModes[g.id] || '2d') === '2d' 
                                    ? 'bg-primary text-primary-foreground shadow-xs' 
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                2D
                              </button>
                              <button
                                type="button"
                                onClick={() => setGrainViewModes(prev => ({ ...prev, [g.id]: '3d' }))}
                                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded transition-all flex items-center gap-1 ${
                                  grainViewModes[g.id] === '3d' 
                                    ? 'bg-purple-600 text-white shadow-xs' 
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <Box size={10} /> 3D
                              </button>
                            </div>
                            
                            {grainViewModes[g.id] === '3d' ? (
                              <div className="w-full h-full relative z-10 flex-1">
                                <Grain3DPreview grain={g} theme={theme} t={t} />
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-row relative z-10 flex-1">
                                <div className="w-1/2 h-full border-r border-slate-700/30 relative">
                                   <GrainPreview grain={g} t={t} mode="transversal" />
                                </div>
                                <div className="w-1/2 h-full relative">
                                   <GrainPreview grain={g} t={t} mode="longitudinal" />
                                </div>
                              </div>
                            )}
                        </div>
                    </div>
                  ))}
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="flex-1 overflow-y-auto w-full p-2">
            {results && (() => {
              const f_nakka_max = Math.max(...results.F_N);
              const activeNakkaSteps = results.F_N.filter((_, i) => results.mgra_total[i] > 0);
              const f_nakka_avg = activeNakkaSteps.length > 0 
                ? activeNakkaSteps.reduce((sum, v) => sum + v, 0) / activeNakkaSteps.length 
                : 0;
              const textValClass = theme === 'light' ? 'text-slate-900' : 'text-slate-100';

              return (
                <div className="flex flex-col gap-6 pb-20">
                  <div className="flex justify-end">
                    <Button onClick={() => prepareExport(results)} variant="outline" size="sm" className="bg-card h-9 shadow-sm border-border text-primary">{t.export_csv}</Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3">
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-purple-500">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase leading-tight">{t.shape} (Motor)</p>
                        <h3 className={`text-lg font-bold tracking-widest mt-1.5 leading-none ${textValClass}`}>{results.summary.motorClass}</h3>
                      </CardContent>
                    </Card>
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-blue-500">
                      <CardContent className="p-3 font-semibold">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase leading-tight">{t.total_impulse} (IT)</p>
                        <h3 className={`text-lg font-bold mt-1.5 leading-none ${textValClass}`}>{(results.summary.It_total_N_s || 0).toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">N·s</span></h3>
                      </CardContent>
                    </Card>
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-blue-500">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase leading-tight">{t.specific_impulse} (ISP)</p>
                        <h3 className={`text-lg font-bold mt-1.5 leading-none ${textValClass}`}>{(results.summary.Isp_total_s || 0).toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">s</span></h3>
                      </CardContent>
                    </Card>
                    
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-slate-500/50"><CardContent className="p-2 gap-1 flex flex-col justify-center">
                      <p className="text-[10px] font-mono text-muted-foreground text-center mb-1 uppercase tracking-widest leading-none">{t.times}</p>
                      <div className="flex justify-between text-[11px] font-mono items-center"><span className="text-muted-foreground">{t.burn}</span><span className={`font-bold px-1 ${textValClass}`}>{(results.summary.t_quemado || 0).toFixed(3)}s</span></div>
                      <div className="flex justify-between text-[11px] font-mono items-center"><span className="text-muted-foreground">{t.action}</span><span className={`font-bold px-1 ${textValClass}`}>{(results.summary.t_fin || 0).toFixed(3)}s</span></div>
                    </CardContent></Card>
                    
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-orange-500">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-mono text-orange-600 dark:text-orange-400 font-bold uppercase leading-tight">{t.max_p || "Max Pressure"}</p>
                        <h3 className={`text-lg font-bold mt-1.5 leading-none text-orange-600 dark:text-orange-400 ${theme === 'dark' ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]' : ''}`}>{(results.summary.Pmax_MPa || 0).toFixed(4)} <span className="text-[10px] font-normal text-muted-foreground">MPa</span></h3>
                      </CardContent>
                    </Card>
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-orange-500">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-mono text-orange-600 dark:text-orange-400 font-bold uppercase leading-tight">{t.avg_p || "Avg Pressure"}</p>
                        <h3 className={`text-lg font-bold mt-1.5 leading-none text-orange-600 dark:text-orange-400`}>{(results.summary.Pmed_MPa || 0).toFixed(4)} <span className="text-[10px] font-normal text-muted-foreground">MPa</span></h3>
                      </CardContent>
                    </Card>
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-sky-500">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-mono text-sky-600 dark:text-sky-450 font-bold uppercase leading-tight">{t.max_f} (Nakka)</p>
                        <h3 className={`text-lg font-bold mt-1.5 leading-none text-sky-600 dark:text-sky-400 ${theme === 'dark' ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]' : ''}`}>{f_nakka_max.toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">N</span></h3>
                      </CardContent>
                    </Card>
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-sky-500">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-mono text-sky-600 dark:text-sky-450 font-bold uppercase leading-tight">{t.avg_f} (Nakka)</p>
                        <h3 className="text-lg font-bold mt-1.5 leading-none text-sky-600 dark:text-sky-400">{f_nakka_avg.toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">N</span></h3>
                      </CardContent>
                    </Card>
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-purple-500">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold uppercase leading-tight">{t.max_f} (TTI)</p>
                        <h3 className={`text-lg font-bold mt-1.5 leading-none text-purple-600 dark:text-purple-400 ${theme === 'dark' ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]' : ''}`}>{(results.summary.Fmax_N || 0).toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">N</span></h3>
                      </CardContent>
                    </Card>
                    <Card className="col-span-2 lg:col-span-1 bg-card border-border shadow-sm border-t-2 border-t-purple-500">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold uppercase leading-tight">{t.avg_f} (TTI)</p>
                        <h3 className="text-lg font-bold mt-1.5 leading-none text-purple-600 dark:text-purple-400">{(results.summary.Fmed_N || 0).toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">N</span></h3>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0">
                    <Card className="flex flex-col bg-card border-border shadow-sm">
                      <CardHeader className="py-2 border-b border-border bg-muted/20"><CardTitle className="text-[13px] uppercase tracking-widest text-orange-600 dark:text-orange-400">{t.pressure_vs_time}</CardTitle></CardHeader>
                      <CardContent className="p-0 pt-4 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 20, right: 40, left: 70, bottom: 80 }}>
                            <CartesianGrid strokeDasharray="2 4" vertical={false} stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} />
                            <XAxis 
                              dataKey="time" 
                              type="number" 
                              domain={[0, 'dataMax']} 
                              tickCount={10} 
                              tickFormatter={(value) => value.toFixed(2)}
                              tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#475569', fontFamily: 'monospace' }}
                              height={60}
                              axisLine={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1' }}
                              tickLine={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1' }}
                            >
                              <ChartLabel value={t.axis_time} position="bottom" offset={0} fill={theme === 'dark' ? '#cbd5e1' : '#475569'} style={{ fontSize: '11px', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 700, textAnchor: 'middle' }} />
                            </XAxis>
                            <YAxis 
                              domain={[0, (dataMax: number) => (dataMax * 1.1)]} 
                              tickFormatter={(value) => value.toFixed(1)} 
                              tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#475569', fontFamily: 'monospace' }}
                              width={70}
                              axisLine={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1' }}
                              tickLine={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1' }}
                            >
                              <ChartLabel value={t.axis_pressure} angle={-90} position="left" offset={0} fill={theme === 'dark' ? '#cbd5e1' : '#475569'} style={{ fontSize: '11px', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 700, textAnchor: 'middle' }} />
                            </YAxis>
                            <Tooltip 
                              formatter={(value: number) => value.toFixed(2) + " MPa"} 
                              labelFormatter={(lbl) => "T+ " + Number(lbl).toFixed(3) + "s"}
                              contentStyle={theme === 'dark' ? { backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#f8fafc' } : { backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#0f172a' }}
                            />
                            <Legend 
                              verticalAlign="top" 
                              align="right"
                              wrapperStyle={theme === 'dark' ? { 
                                display: 'inline-block',
                                width: 'auto',
                                right: '0px',
                                backgroundColor: 'rgba(15, 23, 42, 0.8)', 
                                border: '1px solid rgba(51, 65, 85, 0.8)', 
                                borderRadius: '4px', 
                                padding: '4px 8px', 
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                color: '#cbd5e1'
                              } : {
                                display: 'inline-block',
                                width: 'auto',
                                right: '0px',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                border: '1px solid rgba(203, 213, 225, 0.8)', 
                                borderRadius: '4px', 
                                padding: '4px 8px', 
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                color: '#0f172a'
                              }} 
                            />
                            <Line type="monotone" dataKey="P0_gage" stroke="#f97316" dot={false} strokeWidth={2.5} name="Chamber Gauge Pressure (MPa)" style={{ filter: 'drop-shadow(0px 0px 5px rgba(249,115,22,0.5))' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="flex flex-col bg-card border-border shadow-sm">
                      <CardHeader className="py-2 border-b border-border bg-muted/20"><CardTitle className="text-[13px] uppercase tracking-widest text-[#00ccff]">{t.thrust_vs_time}</CardTitle></CardHeader>
                      <CardContent className="p-0 pt-4 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 20, right: 40, left: 70, bottom: 80 }}>
                            <CartesianGrid strokeDasharray="2 4" vertical={false} stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} />
                            <XAxis 
                              dataKey="time" 
                              type="number" 
                              domain={[0, 'dataMax']} 
                              tickCount={10} 
                              tickFormatter={(value) => value.toFixed(2)}
                              tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#475569', fontFamily: 'monospace' }}
                              height={60}
                              axisLine={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1' }}
                              tickLine={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1' }}
                            >
                              <ChartLabel value={t.axis_time} position="bottom" offset={0} fill={theme === 'dark' ? '#cbd5e1' : '#475569'} style={{ fontSize: '11px', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 700, textAnchor: 'middle' }} />
                            </XAxis>
                            <YAxis 
                              domain={[0, (dataMax: number) => (dataMax * 1.1)]} 
                              tickFormatter={(value) => value.toFixed(0)} 
                              tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#475569', fontFamily: 'monospace' }}
                              width={70}
                              axisLine={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1' }}
                              tickLine={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1' }}
                            >
                              <ChartLabel value={t.axis_thrust} angle={-90} position="left" offset={0} fill={theme === 'dark' ? '#cbd5e1' : '#475569'} style={{ fontSize: '11px', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 700, textAnchor: 'middle' }} />
                            </YAxis>
                            <Tooltip 
                              formatter={(value: number) => value.toFixed(1) + " N"} 
                              labelFormatter={(lbl) => "T+ " + Number(lbl).toFixed(3) + "s"}
                              contentStyle={theme === 'dark' ? { backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#f8fafc' } : { backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#0f172a' }}
                            />
                            <Legend 
                              verticalAlign="top" 
                              align="right"
                              layout="vertical"
                              wrapperStyle={theme === 'dark' ? { 
                                display: 'inline-block',
                                width: 'auto',
                                right: '0px',
                                backgroundColor: 'rgba(15, 23, 42, 0.8)', 
                                border: '1px solid rgba(51, 65, 85, 0.8)', 
                                borderRadius: '4px', 
                                padding: '4px 8px', 
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                color: '#cbd5e1'
                              } : {
                                display: 'inline-block',
                                width: 'auto',
                                right: '0px',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                border: '1px solid rgba(203, 213, 225, 0.8)', 
                                borderRadius: '4px', 
                                padding: '4px 8px', 
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                color: '#0f172a'
                              }} 
                            />
                            <Line type="monotone" dataKey="F_N" stroke="#00ccff" dot={false} strokeWidth={2.5} name={t.r_nakka + " (N)"} style={{ filter: 'drop-shadow(0px 0px 5px rgba(0,204,255,0.5))' }} />
                            <Line type="monotone" dataKey="E_N" stroke="#a855f7" dot={false} strokeWidth={2.5} name={t.ideal_tti + " (N)"} style={{ filter: 'drop-shadow(0px 0px 5px rgba(168,85,247,0.4))' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

           <TabsContent value="analysis" className="flex-1 overflow-y-auto w-full no-scrollbar p-1">
             {results && (
               <DetailedAnalysisView 
                 results={results} 
                 lang={lang} 
                 motor={motor} 
                 nozzle={nozzle} 
                 customPropellants={customPropellants}
               />
             )}
           </TabsContent>

           <TabsContent value="cfd" className="flex-1 overflow-hidden w-full relative min-h-0 flex flex-col gap-2">
             {results && (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col xl:flex-row gap-4 pb-10">
                 <div className="flex-1 flex flex-col gap-4">
                     <div className="flex justify-between items-center bg-muted/60 p-2 rounded-lg border border-border">
                        <span className="text-xs uppercase font-bold text-foreground font-mono tracking-widest">{t.exhaust_sim}</span>
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setShowCfdInfo(!showCfdInfo)}>{t.more_info}</Button>
                     </div>
                     {showCfdInfo && (
                       <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[10px] leading-relaxed border border-border shadow-inner">
                         <p className="font-bold text-blue-400 mb-1">{t.cfd_solver_title}</p>
                         {t.cfd_solver_desc}
                       </div>
                     )}
                     <div className="flex flex-col flex-1 min-h-[460px] bg-card rounded-lg shadow-sm border overflow-hidden shrink-0 w-full">
                        <PlaybackWrapper results={results} t_parent={t} motor={motor} nozzle={nozzle} />
                     </div>
                 </div>
                 <div className="flex-1 flex flex-col min-h-[400px]">
                     <FlightViewer simApogee={simApogee} expApogee={expApogee} t={t} propellantType={results?.propellantType || 1} />
                 </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="mission_control" className="flex-1 flex flex-col min-h-0 gap-2 px-1 overflow-y-auto pt-2">
             <MissionControl 
               results={results} 
               lang={lang} 
               onApogeeUpdate={(sim, exp) => { setSimApogee(sim); setExpApogee(exp); }} 
               nozzleParams={nozzle}
             />
          </TabsContent>

          {/* SMART SEARCH TAB CONTENT */}
          <TabsContent value="smart_search" className="flex-1 flex flex-col min-h-0 gap-4 p-2 md:p-4 overflow-y-auto">
            <SmartSearchEngine
              initialMotor={motor}
              initialNozzle={nozzle}
              initialGrains={grains}
              customPropellants={customPropellants}
              lang={lang}
              theme={theme}
              onApplyConfiguration={handleApplySmartSearchConfiguration}
            />
          </TabsContent>

          {/* AGENTE JESUS TAB CONTENT */}
          <TabsContent value="agente_jesus" className="flex-1 flex flex-col min-h-0 gap-4 p-3 md:p-6 overflow-y-auto">
            <div className={`max-w-4xl mx-auto w-full rounded-2xl border-2 border-dashed p-6 md:p-8 transition-all shadow-md ${
              theme === 'light'
                ? 'bg-amber-500/5 border-amber-500/40 text-stone-850'
                : 'bg-amber-950/20 border-amber-500/40 text-slate-200'
            }`}>
              {/* Header Status Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-amber-500/25">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
                    <Bot size={28} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        {lang === 'es' ? 'En Mantenimiento • No disponible en Beta' : 'Under Maintenance • Not in Beta'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-2">
                      <Brain size={22} />
                      {lang === 'es' ? 'Agente Jesús / IA Experta en Cohetería' : 'Agente Jesús / Rocketry Expert AI'}
                    </h2>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-750 dark:text-amber-300 border border-amber-500/30">
                  {lang === 'es' ? '100% Local & Opcional' : '100% Local & Optional'}
                </div>
              </div>

              {/* Main Proposal Description */}
              <div className="mt-6 space-y-5 text-sm md:text-base leading-relaxed">
                <div className={`p-4 rounded-xl border ${
                  theme === 'light' ? 'bg-white/80 border-amber-200 text-stone-800' : 'bg-slate-900/80 border-amber-500/20 text-slate-200'
                }`}>
                  <h3 className="font-bold text-amber-700 dark:text-amber-400 text-base mb-2 flex items-center gap-2">
                    <Sparkles size={18} />
                    {lang === 'es' ? '¿Qué se va a plantear con el Agente Jesús?' : 'What is planned with Agente Jesús?'}
                  </h3>
                  <p>
                    {lang === 'es'
                      ? 'Un asistente de Inteligencia Artificial especializado en física y balística de cohetería. Estará diseñado para interactuar con los resultados de simulación, evaluar el rendimiento del motor y ayudarte a detectar posibles inconsistencias o áreas de mejora.'
                      : 'An Artificial Intelligence assistant specialized in rocketry physics and internal ballistics. Designed to interact with your simulation results, evaluate engine performance, and help you detect potential anomalies or optimization areas.'}
                  </p>
                </div>

                {/* Core Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border flex gap-3 ${theme === 'light' ? 'bg-white/70 border-amber-200' : 'bg-slate-900/70 border-amber-500/20'}`}>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <DownloadCloud size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-amber-700 dark:text-amber-300 mb-1">
                        {lang === 'es' ? '100% Opcional, Local y Gratuito' : '100% Optional, Local & Free'}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lang === 'es'
                          ? 'Si el usuario desea descargarlo, funcionará integrado directamente en su aplicación. Si no lo descarga, HERMES funcionará exactamente igual sin verse afectado en absoluto.'
                          : 'If the user chooses to download it, it will integrate directly into their app. If not downloaded, HERMES operates completely identically without any limitations.'}
                      </p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex gap-3 ${theme === 'light' ? 'bg-white/70 border-amber-200' : 'bg-slate-900/70 border-amber-500/20'}`}>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-amber-700 dark:text-amber-300 mb-1">
                        {lang === 'es' ? 'Detección de Anomalías & Alertas' : 'Anomaly Detection & Alerts'}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lang === 'es'
                          ? 'Supervisará picos de presión extraños, velocidades críticas de erosión en tobera o anomalías en la curva de empuje tras cada simulación.'
                          : 'Monitors strange pressure spikes, critical nozzle erosion velocities, or abnormal thrust curve shapes after every simulation.'}
                      </p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex gap-3 ${theme === 'light' ? 'bg-white/70 border-amber-200' : 'bg-slate-900/70 border-amber-500/20'}`}>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Brain size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-amber-700 dark:text-amber-300 mb-1">
                        {lang === 'es' ? 'Aprendizaje & Tutoría de Física' : 'Learning & Physics Tutoring'}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lang === 'es'
                          ? 'Te explicará qué fenómenos aerodinámicos o de combustión están ocurriendo en tu motor para enriquecer tu aprendizaje técnico.'
                          : 'Explains the aerodynamic and combustion phenomena taking place in your engine to enrich your technical understanding.'}
                      </p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex gap-3 ${theme === 'light' ? 'bg-white/70 border-amber-200' : 'bg-slate-900/70 border-amber-500/20'}`}>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-amber-700 dark:text-amber-300 mb-1">
                        {lang === 'es' ? 'Privacidad Total (On-Device)' : 'Total Privacy (On-Device)'}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lang === 'es'
                          ? 'Tus motores, parámetros y datos de misión se procesan 100% en tu máquina sin conectarse a servicios de pago en la nube.'
                          : 'Your motors, parameters, and mission data process 100% locally on your machine without relying on external cloud APIs.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* PROFESSIONAL FOOTER */}
      <footer className={`py-2.5 border-t mt-auto shrink-0 relative z-10 transition-all ${
        theme === 'light' 
          ? 'bg-[#f4f1ea] border-[#e4dfd5] text-stone-850' 
          : 'bg-slate-900 border-slate-800 text-slate-400'
      }`}>
        <div className="max-w-[1600px] mx-auto w-full px-6 flex justify-between items-center text-xs font-mono relative">
           <div className="flex items-center gap-2">
              <span className={`font-semibold tracking-wider ${theme === 'light' ? 'text-stone-900' : 'text-slate-200'}`}>
                {t.dept_prop}
              </span>
           </div>
           
           <div className="flex items-center gap-2">
               <button 
                 onClick={() => setShowFeedbackModal(true)}
                 className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all font-semibold uppercase cursor-pointer ${
                   theme === 'light'
                     ? 'bg-white hover:bg-stone-50 border-[#e4dfd5] text-stone-700 hover:text-stone-950 shadow-xs'
                     : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-slate-100'
                 }`}
               >
                 <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                 <span className="text-[10px] tracking-wide">{lang === 'es' ? 'Ayuda' : 'Feedback'}</span>
               </button>
               
               <div className="relative">
                 <button 
                   onClick={() => setShowCredits(!showCredits)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all font-semibold uppercase cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white hover:bg-stone-50 border-[#e4dfd5] text-stone-700 hover:text-stone-950 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] tracking-wide">{lang === 'es' ? 'Créditos' : 'Credits'}</span>
              </button>
              
              {showCredits && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowCredits(false)} />
                  <div className={`absolute right-0 bottom-full mb-2 w-[280px] border rounded-lg p-3.5 shadow-lg z-50 text-left font-sans backdrop-blur-md ${
                    theme === 'light'
                      ? 'bg-white border-[#e4dfd5] shadow-stone-200 text-stone-800 shadow-xl'
                      : 'bg-slate-950/95 border-purple-500/30 shadow-[0_4px_20px_rgba(168,85,247,0.25)] text-slate-100'
                  }`}>
                    <div className="space-y-2.5">
                      <div>
                        <p className={`text-[9px] font-bold tracking-wider uppercase font-mono ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`}>{lang === 'es' ? 'DESARROLLADOR' : 'DEVELOPER'}</p>
                        <p className={`text-xs font-extrabold mt-0.5 ${theme === 'light' ? 'text-stone-950' : 'text-slate-100'}`}>Miguel Tejera Lesmes</p>
                      </div>
                      <div className={`border-t pt-2 ${theme === 'light' ? 'border-stone-100' : 'border-slate-800/85'}`}>
                        <p className={`text-[9px] font-bold tracking-wider uppercase font-mono ${theme === 'light' ? 'text-stone-500' : 'text-slate-400'}`}>{lang === 'es' ? 'COLABORADORES' : 'COLLABORATORS'}</p>
                        <p className={`text-xs font-bold mt-0.5 ${theme === 'light' ? 'text-stone-800' : 'text-slate-200'}`}>Jesús Sáez Barragán</p>
                        <p className={`text-xs font-bold ${theme === 'light' ? 'text-stone-800' : 'text-slate-200'}`}>Pablo Sánchez Mora</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
           </div>
           </div>
        </div>
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-sm rounded-lg p-6 shadow-xl border border-border">
              <h2 className="text-lg font-bold mb-4">{lang === 'es' ? 'Exportar Resultados' : 'Export Results'}</h2>
              <div className="mb-4">
                <UiLabel>{lang === 'es' ? 'Nombre del archivo' : 'Filename'}</UiLabel>
                <Input 
                  value={exportFilename} 
                  onChange={(e) => setExportFilename(e.target.value)} 
                  className="mt-1"
                />
              </div>
              <div className="mb-6">
                <UiLabel>{lang === 'es' ? 'Formato' : 'Format'}</UiLabel>
                <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">.csv (Valores separados por comas)</SelectItem>
                    <SelectItem value="xlsx">.xlsx (Microsoft Excel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowExportModal(false)}>{lang === 'es' ? 'Cancelar' : 'Cancel'}</Button>
                <Button onClick={() => {
                  if (exportData) {
                    const ws = XLSX.utils.json_to_sheet(exportData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Results");
                    
                    if (exportFormat === 'csv') {
                      XLSX.writeFile(wb, `${exportFilename}.csv`, { bookType: 'csv' });
                    } else {
                      XLSX.writeFile(wb, `${exportFilename}.xlsx`, { bookType: 'xlsx' });
                    }
                    setShowExportModal(false);
                  }
                }}>{lang === 'es' ? 'Descargar' : 'Download'}</Button>
              </div>
            </div>
          </div>
        )}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-sm rounded-lg p-6 shadow-xl border border-border">
              <h2 className="text-lg font-bold mb-4">{lang === 'es' ? 'Enviar Sugerencias' : 'Send Feedback'}</h2>
              <p className="text-xs text-muted-foreground mb-4">
                {lang === 'es' ? '¿Has encontrado algún error o tienes una sugerencia? Déjanos un mensaje y te contactaremos a la brevedad.' : 'Found a bug or have a suggestion? Leave us a message and we will get back to you shortly.'}
              </p>
              <textarea 
                value={feedbackMessage} 
                onChange={(e) => setFeedbackMessage(e.target.value)} 
                className="w-full h-32 p-2 text-sm border rounded bg-input text-foreground mb-4 resize-none"
                placeholder={lang === 'es' ? 'Escribe aquí tu mensaje...' : 'Write your message here...'}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>{lang === 'es' ? 'Cancelar' : 'Cancel'}</Button>
                <Button onClick={() => {
                  window.location.href = `mailto:miguel.tejera@coheteros.com?subject=Hermes%20App%20Feedback&body=${encodeURIComponent(feedbackMessage)}`;
                  setShowFeedbackModal(false);
                  setFeedbackMessage('');
                }}>{lang === 'es' ? 'Enviar' : 'Send'}</Button>
              </div>
            </div>
          </div>
        )}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-sm rounded-lg p-6 shadow-xl border border-border">
              <h2 className="text-lg font-bold mb-4">{lang === 'es' ? 'Guardar Simulación' : 'Save Simulation'}</h2>
              <div className="space-y-4 mb-4">
                <div>
                  <UiLabel>{lang === 'es' ? 'Nombre de la simulación' : 'Simulation Name'}</UiLabel>
                  <Input 
                    value={saveName} 
                    onChange={(e) => setSaveName(e.target.value)} 
                    className="mt-1"
                    placeholder={lang === 'es' ? 'Ej. Motor de prueba A' : 'E.g. Test Motor A'}
                  />
                </div>
                <div>
                  <UiLabel>{lang === 'es' ? 'Carpeta / Grupo' : 'Folder / Group'}</UiLabel>
                  <Input 
                    value={saveFolder} 
                    onChange={(e) => setSaveFolder(e.target.value)} 
                    className="mt-1"
                    placeholder={lang === 'es' ? 'Ej. General' : 'E.g. General'}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSaveModal(false)}>{lang === 'es' ? 'Cancelar' : 'Cancel'}</Button>
                <Button onClick={() => {
                  if (!saveName.trim()) return;
                  const newSim = {
                    id: Date.now().toString(),
                    name: saveName.trim(),
                    folder: saveFolder.trim() || 'General',
                    timestamp: Date.now(),
                    motor,
                    nozzle,
                    grains
                  };
                  setSavedSimulations([...savedSimulations, newSim]);
                  setSaveName('');
                  setShowSaveModal(false);
                }}>{lang === 'es' ? 'Guardar' : 'Save'}</Button>
              </div>
            </div>
          </div>
        )}
        {showLibraryModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-2xl rounded-lg p-0 shadow-xl border border-border overflow-hidden flex flex-col max-h-[80vh]">
              <div className="px-6 py-4 border-b border-border bg-muted flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FolderOpen size={20} />
                  {lang === 'es' ? 'Biblioteca de Simulaciones' : 'Simulations Library'}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowLibraryModal(false)} className="h-8 w-8 p-0">
                  ✕
                </Button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-background">
                {savedSimulations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {lang === 'es' ? 'No hay simulaciones guardadas.' : 'No saved simulations.'}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Array.from(new Set(savedSimulations.map(s => s.folder || 'General'))).sort().map(folder => {
                      const simsInFolder = savedSimulations.filter(s => (s.folder || 'General') === folder);
                      return (
                        <div key={folder} className="space-y-2">
                          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-1">
                            <Folder size={14} className="text-muted-foreground" />
                            {folder}
                            <span className="text-xs font-normal text-muted-foreground ml-auto">{simsInFolder.length}</span>
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {simsInFolder.map(sim => (
                              <div key={sim.id} className="group flex items-center justify-between p-3 rounded-md border border-border bg-card hover:border-purple-500/50 transition-colors">
                                <div 
                                  className="flex-1 cursor-pointer overflow-hidden"
                                  onClick={() => {
                                    setLoadedSimId(sim.id);
                                    setMotor(sim.motor);
                                    setNozzle(sim.nozzle);
                                    setGrains(sim.grains);
                                    setShowLibraryModal(false);
                                  }}
                                >
                                  <div className="font-semibold text-sm truncate">{sim.name}</div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(sim.timestamp).toLocaleString()}
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSimToDelete(sim.id);
                                  }}
                                  title={lang === 'es' ? 'Eliminar simulación' : 'Delete simulation'}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {simToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-sm rounded-lg p-6 shadow-xl border border-border">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-destructive">
                <Trash2 size={20} />
                {lang === 'es' ? 'Confirmar eliminación' : 'Confirm deletion'}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {lang === 'es' ? '¿Estás seguro de que deseas eliminar esta simulación? Esta acción no se puede deshacer.' : 'Are you sure you want to delete this simulation? This action cannot be undone.'}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSimToDelete(null)}>
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button variant="destructive" onClick={() => {
                  setSavedSimulations(savedSimulations.filter(s => s.id !== simToDelete));
                  setSimToDelete(null);
                }}>
                  {lang === 'es' ? 'Eliminar' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
        {showTutorial && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-lg max-h-[85vh] rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col">
              <div className="bg-muted px-6 py-4 border-b border-border flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-foreground">
                  {(TUTORIAL_STEPS[lang] || TUTORIAL_STEPS['en'])[tutorialStep].title}
                </h2>
                
                <div className="flex items-center gap-3">
                  <Select value={lang} onValueChange={(v: any) => setLang(v)}>
                    <SelectTrigger className={`w-[70px] h-7 text-[10px] font-bold border-2 ${
                      theme === 'light' 
                        ? 'bg-white text-slate-800 border-slate-200' 
                        : 'bg-slate-900 text-slate-100 border-slate-700'
                    }`}>
                      <SelectValue placeholder="Lang" />
                    </SelectTrigger>
                    <SelectContent className={`min-w-[70px] ${
                      theme === 'light' 
                        ? 'bg-white text-slate-800 border-slate-200' 
                        : 'bg-slate-900 text-slate-100 border-slate-700'
                    }`}>
                      <SelectItem value="en" className="text-xs cursor-pointer">ENG</SelectItem>
                      <SelectItem value="es" className="text-xs cursor-pointer">ESP</SelectItem>
                      <SelectItem value="fr" className="text-xs cursor-pointer">FRA</SelectItem>
                      <SelectItem value="it" className="text-xs cursor-pointer">ITA</SelectItem>
                    </SelectContent>
                  </Select>

                  <span className="text-xs font-mono font-semibold text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                    {tutorialStep + 1} / {(TUTORIAL_STEPS[lang] || TUTORIAL_STEPS['en']).length}
                  </span>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[55vh]">
                <ul className="space-y-3">
                  {(TUTORIAL_STEPS[lang] || TUTORIAL_STEPS['en'])[tutorialStep].content.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></div>
                      <p className="text-sm text-foreground leading-relaxed">{bullet}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/50 px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
                <Button variant="ghost" onClick={closeTutorial} className="text-muted-foreground hover:text-foreground">
                  {(TUTORIAL_BTN_TEXTS[lang] || TUTORIAL_BTN_TEXTS['en']).skip}
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))}
                    disabled={tutorialStep === 0}
                  >
                    {(TUTORIAL_BTN_TEXTS[lang] || TUTORIAL_BTN_TEXTS['en']).prev}
                  </Button>
                  
                  {tutorialStep < (TUTORIAL_STEPS[lang] || TUTORIAL_STEPS['en']).length - 1 ? (
                    <Button onClick={() => setTutorialStep(tutorialStep + 1)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {(TUTORIAL_BTN_TEXTS[lang] || TUTORIAL_BTN_TEXTS['en']).next}
                    </Button>
                  ) : (
                    <Button onClick={closeTutorial} className="bg-green-600 hover:bg-green-700 text-white">
                      {(TUTORIAL_BTN_TEXTS[lang] || TUTORIAL_BTN_TEXTS['en']).done}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <VersionHistoryBook
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          lang={lang}
          theme={theme}
        />

        <CustomPropellantModal
          isOpen={showPropellantModal}
          onClose={() => {
            setShowPropellantModal(false);
            setTargetGrainForModal(null);
          }}
          customPropellants={customPropellants}
          onSavePropellants={handleSavePropellants}
          onSelectPropellantForGrain={(id) => {
            handleSelectPropellantForGrain(id);
          }}
          lang={lang}
          theme={theme}
        />
      </footer>
    </div>
  );
}
