import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { 
  BookOpen, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Flame, 
  Activity, 
  Weight, 
  Cpu, 
  Box, 
  Compass, 
  Rocket, 
  Calendar,
  ListOrdered,
  ArrowRight
} from 'lucide-react';
import { Language } from '../lib/i18n';

interface VersionHistoryBookProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  theme?: 'dark' | 'light';
}

interface VersionData {
  version: string;
  codename: string;
  date: string;
  isLatest?: boolean;
  badge: { en: string; es: string; fr: string; it: string };
  title: { en: string; es: string; fr: string; it: string };
  summary: { en: string; es: string; fr: string; it: string };
  highlights: Array<{
    icon: any;
    title: { en: string; es: string; fr: string; it: string };
    desc: { en: string; es: string; fr: string; it: string };
  }>;
}

export const VERSIONS_LOG: VersionData[] = [
  {
    version: '1.0',
    codename: 'Genesis Core',
    date: '2026-01-15',
    badge: { en: 'Foundation', es: 'Fundacional', fr: 'Fondation', it: 'Fondazione' },
    title: {
      en: 'Initial Engine Architecture & Thermodynamics',
      es: 'Arquitectura Base y Termodinámica',
      fr: 'Architecture de Base et Thermodynamique',
      it: 'Architettura di Base e Termodinamica'
    },
    summary: {
      en: 'Initial release of the HERMES solid rocket motor numerical simulation engine with semi-empirical regression solver.',
      es: 'Lanzamiento inicial del motor de simulación numérica HERMES con resolvedor semi-empírico de regresión de propelente.',
      fr: 'Sortie initiale du moteur de simulation numérique HERMES pour la propulsion solide.',
      it: 'Rilascio iniziale del motore di simulazione numerica HERMES per propellenti solidi.'
    },
    highlights: [
      {
        icon: Cpu,
        title: { en: '1D Regression Solver', es: 'Resolvedor 1D de Regresión', fr: 'Solveur 1D de Régression', it: 'Solutore 1D di Regressione' },
        desc: {
          en: 'Accurate time-step numerical integration for grain geometries including BATES, cylindrical, star core, and solid end configurations.',
          es: 'Integración numérica por pasos de tiempo para geometrías de grano BATES, cilíndrico, estrella y grano macizo.',
          fr: 'Intégration numérique précise pour géométries de grains BATES, cylindrique, étoile et macif.',
          it: 'Integrazione numerica accurata per geometrie di grani BATES, cilindrici, a stella e compatti.'
        }
      },
      {
        icon: Flame,
        title: { en: 'Dual Thrust Models', es: 'Modelos Duales de Empuje', fr: 'Modèles Doubles de Poussée', it: 'Modelli Doppi di Spinta' },
        desc: {
          en: 'Simultaneous calculation of TTI (Ideal Nozzle Theory) and standard Richard Nakka nozzle expansion formulas.',
          es: 'Cálculo simultáneo mediante TTI (Teoría de Tobera Ideal) y formulación empírica estándar de Richard Nakka.',
          fr: 'Calcul simultané via TTI (Théorie de Tuyère Idéale) et méthode empirique de Richard Nakka.',
          it: 'Calcolo simultaneo tramite TTI (Teoria Ugello Ideale) e metodo empirico di Richard Nakka.'
        }
      },
      {
        icon: Box,
        title: { en: 'Thermodynamics DB', es: 'Base Termodinámica', fr: 'Base Thermodynamique', it: 'Database Termodinamico' },
        desc: {
          en: 'Built-in database for KNDX, KNSO, KNSU, RNX-71V, RNX-57, and APCP composite propellant formulations.',
          es: 'Base de datos termodinámica integrada para propelentes KNDX, KNSO, KNSU, RNX-71V, RNX-57 y compuestos APCP.',
          fr: 'Base de données intégrée pour propergols KNDX, KNSO, KNSU, RNX et composites APCP.',
          it: 'Database integrato per propellenti KNDX, KNSO, KNSU, RNX e compositi APCP.'
        }
      }
    ]
  },
  {
    version: '1.1',
    codename: 'Aero Dynamics',
    date: '2026-04-20',
    badge: { en: 'CFD & Nozzle', es: 'CFD y Tobera', fr: 'CFD & Tuyère', it: 'CFD e Ugello' },
    title: {
      en: 'Nozzle Erosion, Slag Deposition & Mission Control',
      es: 'Erosión de Tobera, Depósito de Slag y Control de Misión',
      fr: 'Érosion de Tuyère, Dépôt de Scorie et Contrôle de Mission',
      it: 'Erosione Ugello, Deposito Scorie e Controllo Missione'
    },
    summary: {
      en: 'Major upgrade introducing real-time nozzle variation models, experimental data imports, and full rocket flight trajectory modeling.',
      es: 'Actualización mayor que incorpora modelos matemáticos de variación de garganta, importación experimental y dinámica de vuelo.',
      fr: 'Mise à niveau majeure avec modèles de tuyère, import de données et simulation de vol de fusée.',
      it: 'Aggiornamento importante con modelli di variazione ugello, importazione dati e dinamica di volo.'
    },
    highlights: [
      {
        icon: Rocket,
        title: { en: 'Mission Control & Flight Sim', es: 'Control de Misión y Vuelo', fr: 'Contrôle de Mission & Vol', it: 'Controllo Missione e Volo' },
        desc: {
          en: 'Full 1D ballistic flight simulator with atmospheric air density, drag coefficients, acceleration curves, and apogee calculation.',
          es: 'Simulador balístico 1D de vuelo con modelo atmosférico, resistencia aerodinámica, aceleraciones y cálculo de apogeo.',
          fr: 'Simulateur balistique 1D avec modèle atmosphérique, traînée aérodynamique et calcul d\'apogée.',
          it: 'Simulatore balistico 1D con densità atmosferica, resistenza aerodinamica e calcolo dell\'apogeo.'
        }
      },
      {
        icon: Compass,
        title: { en: 'Throat Slag & Erosion Models', es: 'Modelos de Slag y Erosión', fr: 'Modèles de Scorie et Érosion', it: 'Modelli di Scorie ed Erosione' },
        desc: {
          en: 'Progression models (linear, exponential, quadratic, root, parabola, sine) for throat constriction and thermal erosion.',
          es: '6 modelos de progresión para constricción por depósito de Al2O3 (slag) y ensanchamiento por erosión térmica.',
          fr: '6 modèles de progression pour la constriction par scorie et l\'érosion thermique du col.',
          it: '6 modelli di progressione per la costrizione da scorie e l\'erosione termica della gola.'
        }
      },
      {
        icon: Activity,
        title: { en: 'Experimental Telemetry Import', es: 'Importación Experimental', fr: 'Import de Télémétrie', it: 'Importazione Telemetria' },
        desc: {
          en: 'Direct drag-and-drop ingestion of CSV / Excel test stand load-cell data for side-by-side curve overlay.',
          es: 'Carga de curvas experimentales desde CSV/Excel con superposición directa de empuje y presión.',
          fr: 'Import direct de fichiers CSV/Excel pour comparaison directe des courbes de poussée.',
          it: 'Importazione diretta da CSV/Excel per confronto simultaneo delle curve sperimentali.'
        }
      }
    ]
  },
  {
    version: '1.2',
    codename: 'Orbital View',
    date: '2026-06-30',
    badge: { en: '3D WebGL', es: 'Motor 3D', fr: 'Moteur 3D', it: 'Motore 3D' },
    title: {
      en: 'Interactive 3D WebGL Engine & Cutaway Views',
      es: 'Motor 3D Interactivo WebGL y Vistas en Corte',
      fr: 'Moteur 3D Interactif WebGL et Vues en Coupe',
      it: 'Motore 3D Interattivo WebGL e Viste in Spaccato'
    },
    summary: {
      en: 'Complete 3D visual engine with real-time grain core regression, realistic particle exhaust CFD, and transparent cutaway casing.',
      es: 'Motor visual 3D interactivo con regresión de grano en tiempo real, corte longitudinal transparente y penacho supersónico con diamantes de choque.',
      fr: 'Moteur 3D interactif avec régression des grains en temps réel, coupe transparente et panache CFD réaliste.',
      it: 'Motore 3D interattivo con regressione dei grani in tempo reale, spaccato trasparente e pennacchio CFD realistico.'
    },
    highlights: [
      {
        icon: Box,
        title: { en: '3D Cutaway & Transparent Casing', es: 'Corte 3D y Carcasa Transparente', fr: 'Coupe 3D et Boîtier Transparent', it: 'Spaccato 3D e Cassa Trasparente' },
        desc: {
          en: 'Physical half-cut grain visualization showcasing progressive internal core expansion and propellant web consumption.',
          es: 'Visualización del grano partido por la mitad para apreciar nítidamente la regresión de la cavidad interna y el consumo de la pared.',
          fr: 'Visualisation des grains coupés en deux pour observer l\'expansion de la cavité et la consommation du web.',
          it: 'Visualizzazione del grano sezionato a metà per mostrare l\'espansione della cavità interna e il consumo.'
        }
      },
      {
        icon: Sparkles,
        title: { en: 'Realistic Exhaust Particles', es: 'Penacho de Humo y Llama Realista', fr: 'Particules d\'Échappement Réalistes', it: 'Particelle di Scarico Realistiche' },
        desc: {
          en: 'Dynamic exhaust effects tailored to propellant chemistry: dense white smoke for Candy, dark resin smoke for RNX, and supersonic diamonds for APCP.',
          es: 'Simulación visual de escape adaptada a la química del combustible: humo blanco denso para Sugar, humo oscuro para RNX y llama supersónica para APCP.',
          fr: 'Effets visuels d\'échappement adaptés: fumée blanche dense (Sugar), fumée sombre (RNX) et diamants supersoniques (APCP).',
          it: 'Effetti visivi dello scarico specifici: fumo bianco denso per Sugar, fumo scuro per RNX e diamanti d\'urto per APCP.'
        }
      },
      {
        icon: Activity,
        title: { en: 'Synchronized Playback Speed', es: 'Control de Velocidad Sincronizado', fr: 'Vitesse de Lecture Synchronisée', it: 'Velocità di Riproduzione' },
        desc: {
          en: 'Unified playback engine with variable speeds (0.1x to 2.0x), real-time pressure gauges, and responsive timeline scrubbing.',
          es: 'Control unificado de velocidad (0.1x a 2.0x), manómetros de presión digital y sincronización fluida.',
          fr: 'Contrôle unifié de la vitesse (0.1x à 2.0x), manomètres numériques et scrubbing temporel réactif.',
          it: 'Controllo unificato della velocità (0.1x a 2.0x), manometri digitali e sincronizzazione reattiva.'
        }
      }
    ]
  },
  {
    version: '1.3',
    codename: 'Deep Telemetry',
    date: '2026-08-18',
    isLatest: false,
    badge: { en: 'Telemetry', es: 'Telemetría', fr: 'Télémétrie', it: 'Telemetria' },
    title: {
      en: 'Detailed Analysis Overhaul & Advanced Telemetry Suite',
      es: 'Reforma Integral de Análisis Detallado y Telemetría',
      fr: 'Refonte de l\'Analyse Détaillée et Suite Télémétrique',
      it: 'Revisione Completa Analisi Dettagliata e Telemetria'
    },
    summary: {
      en: 'Complete transformation of the Detailed Analysis tab into four high-precision engineering sub-modules: Burning Areas, Kn & Pressure Regime, Burn Rate & Saint-Robert Law, and Mass Flow Dynamics.',
      es: 'Transformación total de la pestaña Análisis Detallado en cuatro submódulos de ingeniería de alta precisión: Áreas de Combustión, Kn y Régimen de Presión, Velocidad de Quemado y Ley de Saint-Robert, y Dinámica de Gasto Másico.',
      fr: 'Transformation complète de l\'onglet Analyse Détaillée en quatre sous-modules d\'ingénierie: Surfaces de combustion, Kn, Vitesse de combustion et Débit massique.',
      it: 'Trasformazione completa della scheda Analisi Dettagliata in quattro moduli di alta ingegneria: Superfici di combustione, Kn, Velocità di combustione e Flusso di massa.'
    },
    highlights: [
      {
        icon: Activity,
        title: { en: 'Kn (Knudsen) & Stability Regimes', es: 'Relación Kn y Régimen de Estabilidad', fr: 'Ratio Kn et Régimes de Stabilité', it: 'Rapporto Kn e Regimi di Stabilità' },
        desc: {
          en: 'Real-time Kn = Ab(t)/At(t) tracking synchronized with chamber pressure P0, featuring active warning bands for chuffing (<150) and overpressure (>450).',
          es: 'Cálculo y gráfica de Kn = Ab(t)/At(t) sincronizada con la presión en cámara P0, con bandas de diagnóstico para chuffing/extinción (<150) y sobrepresión crítica (>450).',
          fr: 'Suivi en temps réel de Kn = Ab/At synchronisé avec la pression P0 et zones d\'alerte pour chuffing (<150) et surpression (>450).',
          it: 'Tracciamento in tempo reale di Kn = Ab/At sincronizzato con la pressione P0 e fasce di sicurezza per chuffing (<150) e sovrapressione (>450).'
        }
      },
      {
        icon: Flame,
        title: { en: 'Burn Rate (r) & Vieille Law', es: 'Velocidad de Quemado (r) y Ley de Vieille', fr: 'Vitesse de Combustion (r) & Loi de Vieille', it: 'Velocità di Combustione (r) e Legge di Vieille' },
        desc: {
          en: 'Dual charts displaying regression speed r(t) in mm/s and the characteristic Saint-Robert curve r(P) = a · P^n, auto-classifying progressive, regressive, or neutral burn profiles.',
          es: 'Gráficas duales de r(t) en mm/s y la curva característica de Saint-Robert r(P) = a · P^n, con clasificación automática en perfil progresivo, regresivo o neutro.',
          fr: 'Double graphique de r(t) en mm/s et courbe caractéristique r(P) = a · P^n avec détection automatique du profil de combustion.',
          it: 'Doppio grafico di r(t) in mm/s e curva caratteristica r(P) = a · P^n con classificazione automatica del profilo di combustione.'
        }
      },
      {
        icon: Weight,
        title: { en: 'Mass Flow (ṁ) & Consumption', es: 'Gasto Másico (ṁ) y Consumo de Masa', fr: 'Débit Massique (ṁ) & Consommation', it: 'Flusso di Massa (ṁ) e Consumo' },
        desc: {
          en: 'Dynamic comparison between gas generation inside the chamber (ṁ_gen) and choked nozzle exhaust (ṁ_noz) alongside real-time propellant mass consumption.',
          es: 'Comparación continua entre el gasto generado en cámara (ṁ_gen) y el caudal sónico de la tobera (ṁ_noz), junto con el seguimiento de masa de propelente restante.',
          fr: 'Bilan dynamique entre gaz généré (ṁ_gen) et débit sonique de tuyère (ṁ_noz) avec consommation de masse en temps réel.',
          it: 'Bilancio dinamico tra gas generato in camera (ṁ_gen) e flusso sonico dell\'ugello (ṁ_noz) con consumo di massa in tempo reale.'
        }
      },
      {
        icon: Layers,
        title: { en: 'Multi-Grain Area Breakdown', es: 'Desglose Multigrano de Áreas', fr: 'Décomposition des Surfaces Multigrains', it: 'Scomposizione Aree Multigrano' },
        desc: {
          en: 'Individual grain filtering and total sum views for core cavity (Abc), end faces (Abe), and outer surface (Abs) burning areas in cm².',
          es: 'Filtro por grano individual y suma total para cavidad interna (Abc), extremos (Abe) y superficie exterior (Abs) en cm².',
          fr: 'Filtrage par grain et vue globale des surfaces de combustion interne, extrémités et externe.',
          it: 'Filtro per singolo grano e somma totale per cavità interna, estremità e superficie esterna.'
        }
      }
    ]
  },
  {
    version: '1.4',
    codename: 'Smart Search & Custom Chemistry',
    date: '2026-08-20',
    isLatest: true,
    badge: { en: 'Active Version', es: 'Versión Activa', fr: 'Version Active', it: 'Versione Attiva' },
    title: {
      en: 'Smart Search Engine, Custom Propellants & Technical Notes',
      es: 'Motor Smart Search, Propulsantes Personalizados y Notas Técnicas',
      fr: 'Moteur Smart Search, Propergols Personnalisés et Notes Techniques',
      it: 'Motore Smart Search, Propellenti Personalizzati e Note Tecniche'
    },
    summary: {
      en: 'Launches Version 1.4 featuring the Smart Search inverse optimization architecture, the Custom Propellant Synthesizer with multi-pressure Saint-Robert ranges, technical documentation suite in /NOTAS, and responsive split-screen input precision.',
      es: 'Inaugura la Versión 1.4 destacando la arquitectura de optimización inversa Smart Search, el sintetizador de propulsantes a medida con rangos múltiples de Saint-Robert, la suite de documentación técnica en /NOTAS y la precisión responsiva de entradas.',
      fr: 'Lancement de la Version 1.4 avec l\'architecture d\'optimisation Smart Search, le synthétiseur de propergols sur mesure, la documentation /NOTAS et les entrées réactives.',
      it: 'Lancio della Versione 1.4 con l\'architettura di ottimizzazione Smart Search, il sintetizzatore di propellenti, la documentazione /NOTAS e gli input reattivi.'
    },
    highlights: [
      {
        icon: Sparkles,
        title: { 
          en: 'Smart Search Inverse Optimization (Max Altitude Most Validated)', 
          es: 'Optimización Inversa Smart Search (Máxima Altitud Más Validada)', 
          fr: 'Optimisation Inverse Smart Search (Altitude Maximale Validée)', 
          it: 'Ottimizzazione Inversa Smart Search (Altitudine Massima Validata)' 
        },
        desc: {
          en: 'Inverse design engine that finds the optimal grain combination and nozzle throat. The "Maximum Altitude / Peak Total Impulse" mode is the most thoroughly tested and ballistically validated algorithm in the engine.',
          es: 'Motor de diseño inverso que calcula la combinación óptima de granos y tobera. El objetivo de "Máxima Altitud / Mayor Impulso Total" es el algoritmo más extensamente probado y validado balísticamente.',
          fr: 'Moteur de conception inverse. Le mode "Altitude Maximale / Impulsion Totale" est l\'algorithme le plus testé et validé balistiquement.',
          it: 'Motore di progettazione inversa. La modalità "Altitudine Massima / Impulso Totale" è l\'algoritmo più testato e validato balisticamente.'
        }
      },
      {
        icon: Flame,
        title: { en: 'Custom Propellant Synthesizer', es: 'Sintetizador de Propulsantes a Medida', fr: 'Créateur de Propergols Personnalisés', it: 'Creatore di Propellenti Personalizzati' },
        desc: {
          en: 'Create, name, edit, and save unlimited custom fuels directly from the motor setup, storing custom densities (rho), chamber flame temperatures (T0), specific heat ratios (gamma), and molecular weights (M).',
          es: 'Crea, nombra, edita y almacena propelentes personalizados desde la interfaz, configurando densidad (rho), temperatura de llama (T0), ratio de calores específicos (gamma) y masa molar (M).',
          fr: 'Créez, nommez et sauvegardez vos propres carburants avec densité, température de flamme, gamma et masse molaire.',
          it: 'Crea, nomina e salva carburanti personalizzati con densità, temperatura di fiamma, gamma e massa molare.'
        }
      },
      {
        icon: Activity,
        title: { en: 'Saint-Robert Pressure Ranges (a & n)', es: 'Rangos de Presión y Ley de Saint-Robert (a y n)', fr: 'Plages de Pression Saint-Robert (a & n)', it: 'Intervalli di Pressione Saint-Robert (a e n)' },
        desc: {
          en: 'Configure regression parameters a and n for custom propellants, including specific pressure intervals to match empirical burn rate test curves.',
          es: 'Define los coeficientes empíricos a y n por intervalos de presión para reproducir curvas experimentales reales de velocidad de combustión r = a · P^n.',
          fr: 'Configurez les coefficients a et n par plages de pression pour reproduire fidèlement les essais réels de combustion.',
          it: 'Configura i coefficienti a e n per intervalli di pressione per riprodurre le curve sperimentali reali.'
        }
      },
      {
        icon: BookOpen,
        title: { en: 'Technical Documentation Suite (/NOTAS)', es: 'Suite de Documentación Técnica (/NOTAS)', fr: 'Documentation Technique (/NOTAS)', it: 'Documentazione Tecnica (/NOTAS)' },
        desc: {
          en: 'Comprehensive developer and engineering notes covering ballistics modeling, Electron executable build guide (.exe), chemistry databases, and telemetry algorithms.',
          es: 'Directorio completo de notas de ingeniería que documenta los modelos balísticos, la guía para compilar el ejecutable (.exe), la química y los algoritmos de telemetría.',
          fr: 'Dossier complet de notes techniques documentant la balistique, la compilation (.exe), la chimie et la télémétrie.',
          it: 'Cartella completa di note tecniche che documenta la balistica, la compilazione (.exe), la chimica e la telemetria.'
        }
      }
    ]
  }
];

export const VersionHistoryBook: React.FC<VersionHistoryBookProps> = ({
  isOpen,
  onClose,
  lang,
  theme = 'dark'
}) => {
  // Page 0 = Cover / Table of Contents, Page 1..N = Version pages (N = VERSIONS_LOG.length)
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);

  // Reset to latest version or cover when opening
  useEffect(() => {
    if (isOpen) {
      // By default, open on cover page (0)
      setCurrentPage(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage]);

  const totalPages = VERSIONS_LOG.length + 1; // 0 (Cover) + versions

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setDirection(1);
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setDirection(-1);
      setCurrentPage(prev => prev - 1);
    }
  };

  const jumpToVersion = (versionIndex: number) => {
    const targetPage = versionIndex + 1;
    setDirection(targetPage > currentPage ? 1 : -1);
    setCurrentPage(targetPage);
  };

  if (!isOpen) return null;

  const currentVersionData = currentPage > 0 ? VERSIONS_LOG[currentPage - 1] : null;

  const i18nTitles = {
    book_title: { en: 'Version History Log', es: 'Historial de Versiones', fr: 'Historique des Versions', it: 'Cronologia Versioni' },
    book_subtitle: { en: 'HERMES Engineering Release Notes', es: 'Registro de Lanzamientos y Cambios HERMES', fr: 'Notes de Version et Évolutions HERMES', it: 'Note di Rilascio HERMES' },
    index_title: { en: 'Table of Contents', es: 'Índice de Versiones', fr: 'Table des Matières', it: 'Indice delle Versioni' },
    open_latest: { en: 'View Latest Version (v1.4)', es: 'Ver Última Versión (v1.4)', fr: 'Voir Dernière Version (v1.4)', it: 'Vedi Ultima Versione (v1.4)' },
    prev_page: { en: 'Previous Page', es: 'Página Anterior', fr: 'Page Précédente', it: 'Pagina Precedente' },
    next_page: { en: 'Next Page', es: 'Página Siguiente', fr: 'Page Suivante', it: 'Pagina Successiva' },
    back_to_index: { en: 'Index', es: 'Índice', fr: 'Sommaire', it: 'Indice' },
    page_of: { en: 'Page', es: 'Página', fr: 'Page', it: 'Pagina' },
    of: { en: 'of', es: 'de', fr: 'sur', it: 'di' },
    latest_badge: { en: 'Current Version', es: 'Versión Actual', fr: 'Version Actuelle', it: 'Versione Attuale' },
    whats_new: { en: 'Key Features & Implementations', es: 'Características y Cambios Implementados', fr: 'Fonctionnalités et Évolutions', it: 'Caratteristiche e Modifiche' }
  };

  const getT = (key: keyof typeof i18nTitles) => i18nTitles[key][lang] || i18nTitles[key]['en'];

  // Animation variants for fast page flip
  const pageVariants: Variants = {
    enter: (dir: number) => ({
      rotateY: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.95,
      transformOrigin: dir > 0 ? 'left center' : 'right center',
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.32,
        ease: [0.25, 1, 0.5, 1] as const,
      },
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.95,
      transformOrigin: dir > 0 ? 'right center' : 'left center',
      transition: {
        duration: 0.28,
        ease: [0.4, 0, 1, 1] as const,
      },
    }),
  };

  return (
    <div 
      id="version-history-book-modal" 
      className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      style={{ perspective: 1600 }}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>

      {/* Book Container */}
      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border overflow-hidden ${
        theme === 'light' 
          ? 'bg-stone-50 border-amber-800/30 text-stone-900' 
          : 'bg-[#0b101b] border-slate-700/60 text-slate-100'
      }`}>
        
        {/* Book Header Bar (Spine ribbon) */}
        <div className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${
          theme === 'light'
            ? 'bg-gradient-to-r from-amber-100 via-stone-100 to-amber-100 border-amber-300/40 text-stone-800'
            : 'bg-gradient-to-r from-slate-900 via-[#131b2e] to-slate-900 border-slate-800 text-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-inner">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">HERMES ARCHIVE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-mono">v{VERSIONS_LOG[VERSIONS_LOG.length - 1].version}</span>
              </div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {getT('book_title')}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick jump to Index */}
            {currentPage > 0 && (
              <button
                onClick={() => {
                  setDirection(-1);
                  setCurrentPage(0);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
                  theme === 'light'
                    ? 'bg-white/80 border-stone-300 hover:bg-stone-100 text-stone-700'
                    : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200'
                }`}
                title={getT('back_to_index')}
              >
                <ListOrdered size={14} />
                <span className="hidden sm:inline">{getT('back_to_index')}</span>
              </button>
            )}

            {/* Close modal button */}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-all ${
                theme === 'light'
                  ? 'bg-white hover:bg-stone-100 text-stone-600 border-stone-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Dynamic Animated Book Page ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 min-h-[460px] relative" style={{ perspective: 1200 }}>
          <AnimatePresence custom={direction} mode="wait">
            {currentPage === 0 ? (
              /* ── PAGE 0: COVER & TABLE OF CONTENTS ── */
              <motion.div
                key="cover-page"
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col h-full gap-6 max-w-3xl mx-auto"
              >
                {/* Hero Cover Header */}
                <div className={`p-6 sm:p-8 rounded-2xl border text-center relative overflow-hidden shadow-inner ${
                  theme === 'light'
                    ? 'bg-gradient-to-b from-amber-50 to-orange-50/40 border-amber-200/80 text-amber-950'
                    : 'bg-gradient-to-b from-slate-900/90 to-[#0e1626] border-purple-500/20 text-slate-100'
                }`}>
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Rocket size={32} className="text-purple-500 animate-pulse" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                    {getT('book_title')}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground font-mono max-w-xl mx-auto">
                    {getT('book_subtitle')}
                  </p>

                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => jumpToVersion(VERSIONS_LOG.length - 1)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shadow-md shadow-purple-600/25 transition-all hover:scale-105"
                    >
                      <Sparkles size={16} />
                      <span>{getT('open_latest')}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>

                {/* Table of Contents List */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ListOrdered size={16} />
                      <span>{getT('index_title')}</span>
                    </h3>
                    <span className="text-[11px] font-mono text-muted-foreground">{VERSIONS_LOG.length} versions logged</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VERSIONS_LOG.map((ver, idx) => (
                      <div
                        key={ver.version}
                        onClick={() => jumpToVersion(idx)}
                        className={`group p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                          ver.isLatest
                            ? theme === 'light'
                              ? 'bg-purple-50/80 border-purple-300 hover:border-purple-500'
                              : 'bg-purple-950/20 border-purple-500/40 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                            : theme === 'light'
                              ? 'bg-white border-stone-200 hover:border-stone-400'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black font-mono text-purple-600 dark:text-purple-400">
                              v{ver.version}
                            </span>
                            <span className="text-xs font-semibold text-foreground/80 group-hover:text-foreground">
                              {ver.codename}
                            </span>
                          </div>
                          {ver.isLatest ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                              {ver.badge[lang] || ver.badge.en}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                              {ver.badge[lang] || ver.badge.en}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {ver.title[lang] || ver.title.en}
                        </p>

                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-2 border-t border-border/50">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {ver.date}
                          </span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                            {lang === 'es' ? 'Leer' : 'Read'} ➡
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : currentVersionData ? (
              /* ── PAGE 1..N: VERSION DETAILS PAGE ── */
              <motion.div
                key={`page-${currentVersionData.version}`}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col h-full gap-5 max-w-3xl mx-auto"
              >
                {/* Version Title Header */}
                <div className={`p-5 sm:p-6 rounded-2xl border flex flex-wrap items-start justify-between gap-4 shadow-sm ${
                  currentVersionData.isLatest
                    ? theme === 'light'
                      ? 'bg-purple-50/70 border-purple-300'
                      : 'bg-gradient-to-r from-purple-950/30 to-indigo-950/20 border-purple-500/30'
                    : theme === 'light'
                      ? 'bg-white border-stone-200'
                      : 'bg-slate-900/70 border-slate-800'
                }`}>
                  <div className="space-y-1.5 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400">
                        Version {currentVersionData.version}
                      </span>
                      <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded font-bold bg-muted text-muted-foreground border border-border">
                        {currentVersionData.codename}
                      </span>
                      {currentVersionData.isLatest && (
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                          {getT('latest_badge')}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                      {currentVersionData.title[lang] || currentVersionData.title.en}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {currentVersionData.summary[lang] || currentVersionData.summary.en}
                    </p>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg text-xs font-mono bg-background border border-border text-muted-foreground shrink-0 flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{currentVersionData.date}</span>
                  </div>
                </div>

                {/* Detailed Highlights Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-2">
                    <Bookmark size={15} className="text-purple-500" />
                    <span>{getT('whats_new')}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentVersionData.highlights.map((item, hIdx) => {
                      const IconComp = item.icon || CheckCircle2;
                      return (
                        <div
                          key={hIdx}
                          className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                            theme === 'light'
                              ? 'bg-white border-stone-200/90 shadow-sm hover:border-purple-300'
                              : 'bg-[#0f172a]/70 border-slate-800 shadow-sm hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                              <IconComp size={16} />
                            </div>
                            <h5 className="font-bold text-xs sm:text-sm text-foreground leading-tight">
                              {item.title[lang] || item.title.en}
                            </h5>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                            {item.desc[lang] || item.desc.en}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── Book Bottom Navigation & Page Turner Controls ── */}
        <div className={`px-5 py-3 border-t shrink-0 flex items-center justify-between gap-3 ${
          theme === 'light'
            ? 'bg-stone-100 border-amber-300/40 text-stone-800'
            : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}>
          {/* Previous Page Button */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
              currentPage === 0
                ? 'opacity-40 cursor-not-allowed border-transparent'
                : theme === 'light'
                  ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-purple-400 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-purple-500 shadow-sm'
            }`}
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">{getT('prev_page')}</span>
          </button>

          {/* Page Indicators */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {getT('page_of')} {currentPage === 0 ? 'Cover' : `v${VERSIONS_LOG[currentPage - 1].version}`} {getT('of')} {totalPages - 1}
            </span>
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => {
                    setDirection(pIdx > currentPage ? 1 : -1);
                    setCurrentPage(pIdx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    currentPage === pIdx
                      ? 'w-6 bg-purple-600'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                  }`}
                  title={pIdx === 0 ? 'Index' : `v${VERSIONS_LOG[pIdx - 1].version}`}
                />
              ))}
            </div>
          </div>

          {/* Next Page Button */}
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages - 1}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
              currentPage >= totalPages - 1
                ? 'opacity-40 cursor-not-allowed border-transparent'
                : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-sm shadow-purple-600/20'
            }`}
          >
            <span className="hidden sm:inline">{getT('next_page')}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
