import React, { useState, useMemo } from 'react';
import { 
  X, Plus, Trash2, Edit3, Copy, Check, Flame, Activity, Sparkles, 
  Layers, Lock, AlertTriangle, Beaker, CheckCircle2, Shield, Info
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { CustomPropellant, PressureRangeBurnRate, DEFAULT_PROPELLANTS, getBurnRate } from '../lib/types';

interface CustomPropellantModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  theme?: string;
  customPropellants: CustomPropellant[];
  onSavePropellants: (list: CustomPropellant[]) => void;
  onSelectPropellantForGrain?: (propellantId: number) => void;
}

export interface EditablePressureRange {
  id: string;
  pMin: number | string;
  pMax: number | string;
  a: number | string;
  n: number | string;
}

export interface EditableCustomPropellant {
  id: number;
  name: string;
  category: 'candy' | 'rnx' | 'apcp' | 'custom';
  rho: number | string;
  T0: number | string;
  k: number | string;
  M: number | string;
  k2ph?: number | string;
  a: number | string;
  n: number | string;
  color?: string;
  description?: string;
  isCustom?: boolean;
  pressureRanges?: EditablePressureRange[];
}

const LOCAL_STORAGE_KEY = 'openmotor_custom_propellants_v1';

export const loadCustomPropellantsFromStorage = (): CustomPropellant[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading custom propellants from localStorage:', err);
  }
  return [];
};

export const saveCustomPropellantsToStorage = (list: CustomPropellant[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving custom propellants to localStorage:', err);
  }
};

/**
 * Subcomponent for numerical table inputs that allows clearing (empty string)
 * without auto-reverting to 0, and highlights empty fields with an illuminated warning border.
 */
const TableNumberInput: React.FC<{
  id?: string;
  value: number | string | undefined | null;
  onChange: (val: string) => void;
  step?: string;
  className?: string;
  placeholder?: string;
  styleVariant?: 'default' | 'primary' | 'amber';
}> = ({ id, value, onChange, step = "any", className = "", placeholder = "—", styleVariant = 'default' }) => {
  const strVal = value === undefined || value === null ? '' : String(value);
  const isEmpty = strVal.trim() === '';

  const variantText = 
    styleVariant === 'primary' 
      ? 'text-primary font-bold' 
      : styleVariant === 'amber' 
        ? 'text-amber-500 font-bold' 
        : 'text-foreground';

  return (
    <div className="relative w-full">
      <input
        id={id}
        type="number"
        step={step}
        value={strVal}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-2 py-1 text-xs font-mono rounded transition-all focus:outline-none ${
          isEmpty 
            ? 'border-2 border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/30 placeholder-amber-400 font-bold shadow-xs' 
            : `bg-muted/30 border border-border focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${variantText}`
        } ${className}`}
      />
      {isEmpty && (
        <span 
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-amber-500 pointer-events-none select-none" 
          title="Campo requerido"
        >
          !
        </span>
      )}
    </div>
  );
};

/**
 * Property input for general propellant thermodynamics
 */
const FormPropertyNumberInput: React.FC<{
  id: string;
  label: string;
  value: number | string | undefined | null;
  onChange: (val: string) => void;
  step?: string;
  placeholder?: string;
}> = ({ id, label, value, onChange, step = "any", placeholder = "0.0" }) => {
  const strVal = value === undefined || value === null ? '' : String(value);
  const isEmpty = strVal.trim() === '';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs text-muted-foreground font-medium">
          {label}
        </label>
        {isEmpty && (
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tight">
            Vacío
          </span>
        )}
      </div>
      <div className="relative">
        <input
          id={id}
          type="number"
          step={step}
          value={strVal}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className={`w-full px-2.5 py-1.5 text-sm font-mono rounded-lg transition-all focus:outline-none ${
            isEmpty
              ? 'border-2 border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/30 placeholder-amber-400 font-bold shadow-xs'
              : 'bg-background border border-border focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30'
          }`}
        />
        {isEmpty && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500 pointer-events-none">
            !
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Subcomponent to render the Burn Rate Table (Tabla de Tasa de Quemado)
 */
const BurnRateTable: React.FC<{
  propellant: CustomPropellant;
  lang: string;
}> = ({ propellant, lang }) => {
  const ranges = propellant.pressureRanges && propellant.pressureRanges.length > 0
    ? propellant.pressureRanges
    : [{ pMin: 0.101, pMax: 99.0, a: propellant.a, n: propellant.n }];

  return (
    <div className="rounded-lg border border-border/80 overflow-hidden bg-background/80 shadow-xs">
      <div className="px-2.5 py-1.5 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between border-b border-border/60">
        <span className="flex items-center gap-1.5 text-foreground">
          <Flame className="w-3 h-3 text-orange-500" />
          {lang === 'es' ? 'Tabla de Tasa de Quemado r(P)' : 'Burn Rate Table r(P)'}
        </span>
        <span className="font-mono text-[9px] lowercase text-muted-foreground font-semibold">r = a · Pⁿ [mm/s]</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20 text-[10px] text-muted-foreground font-semibold">
              <th className="py-1 px-2.5 text-left">{lang === 'es' ? 'Rango de Presión P [MPa]' : 'Pressure Range P [MPa]'}</th>
              <th className="py-1 px-2 text-right">{lang === 'es' ? 'Coef. a' : 'Coef. a'}</th>
              <th className="py-1 px-2 text-right">{lang === 'es' ? 'Exp. n' : 'Exp. n'}</th>
              <th className="py-1 px-2.5 text-right">{lang === 'es' ? 'Tasa a 3 MPa' : 'Rate at 3 MPa'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {ranges.map((range, idx) => {
              const pEval = Math.min(Math.max(3.0, range.pMin), range.pMax >= 90 ? 3.0 : range.pMax);
              const rVal = (range.a * Math.pow(pEval, range.n)).toFixed(2);
              const pMaxStr = range.pMax >= 90 ? '∞' : `${range.pMax.toFixed(3)} MPa`;
              return (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-1 px-2.5 text-foreground font-medium whitespace-nowrap">
                    {range.pMin.toFixed(3)} – {pMaxStr}
                  </td>
                  <td className="py-1 px-2 text-right text-primary font-bold">{range.a.toFixed(4).replace(/\.?0+$/, '')}</td>
                  <td className="py-1 px-2 text-right text-amber-500 font-bold">{range.n.toFixed(3)}</td>
                  <td className="py-1 px-2.5 text-right text-muted-foreground font-medium">{rVal} mm/s</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CustomPropellantModal: React.FC<CustomPropellantModalProps> = ({
  isOpen,
  onClose,
  lang = 'es',
  theme = 'dark',
  customPropellants,
  onSavePropellants,
  onSelectPropellantForGrain
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'editor'>('catalog');
  const [editingPropellant, setEditingPropellant] = useState<EditableCustomPropellant | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const t = {
    modal_title: lang === 'es' ? 'Gestor de Propulsantes & Síntesis Química' : lang === 'fr' ? 'Gestionnaire de Propergols' : lang === 'it' ? 'Gestore Propellenti' : 'Propellant Chemistry & Custom Synthesis',
    catalog_tab: lang === 'es' ? 'Catálogo de Propulsantes' : lang === 'fr' ? 'Catalogue de Propergols' : lang === 'it' ? 'Catalogo Propellenti' : 'Propellant Catalog',
    editor_tab_new: lang === 'es' ? 'Crear Nuevo Propulsante' : lang === 'fr' ? 'Nouveau Propergol' : lang === 'it' ? 'Nuovo Propellente' : 'Create Custom Propellant',
    editor_tab_edit: lang === 'es' ? 'Editar Propulsante Personalizado' : lang === 'fr' ? 'Modifier Propergol' : lang === 'it' ? 'Modifica Propellente' : 'Edit Custom Propellant',
    standard_propellants: lang === 'es' ? 'Propulsantes Estándar (1 a 7 - Fijos / Bloqueados)' : 'Standard Propellants (1 to 7 - Fixed / Protected)',
    custom_propellants: lang === 'es' ? 'Propulsantes Personalizados (Guardados en tu Biblioteca)' : 'Custom Propellants (Saved in your Library)',
    no_custom: lang === 'es' ? 'No tienes propulsantes personalizados todavía. Crea uno nuevo o duplica un propulsante estándar para empezar a experimentar con tus tablas de quemado.' : 'No custom propellants saved yet. Create a new one or duplicate a standard fuel to get started.',
    btn_new: lang === 'es' ? 'Nuevo Propulsante' : 'New Propellant',
    btn_duplicate: lang === 'es' ? 'Duplicar como Base' : 'Duplicate as Base',
    btn_edit: lang === 'es' ? 'Editar' : 'Edit',
    btn_delete: lang === 'es' ? 'Eliminar' : 'Delete',
    btn_use: lang === 'es' ? 'Seleccionar para Grano' : 'Select for Grain',
    btn_save: lang === 'es' ? 'Guardar en mi Biblioteca' : 'Save to Library',
    btn_cancel: lang === 'es' ? 'Cancelar / Volver' : 'Cancel',
    name: lang === 'es' ? 'Nombre / Denominación' : 'Propellant Name',
    category: lang === 'es' ? 'Familia Química' : 'Chemical Family',
    rho: lang === 'es' ? 'Densidad ρ (g/cm³)' : 'Density ρ (g/cm³)',
    T0: lang === 'es' ? 'Temperatura de llama T0 (K)' : 'Flame Temp T0 (K)',
    k: lang === 'es' ? 'Relación de calores específicos γ (k)' : 'Specific Heat Ratio γ (k)',
    M: lang === 'es' ? 'Masa molecular gases M (g/mol)' : 'Molecular Weight M (g/mol)',
    k2ph: lang === 'es' ? 'Factor de dos fases k2ph' : 'Two-Phase Factor k2ph',
    table_ranges_title: lang === 'es' ? 'Tabla de Tasa de Quemado por Rangos de Presión' : 'Burn Rate Table by Pressure Ranges',
    p_min: lang === 'es' ? 'P Mín [MPa]' : 'P Min [MPa]',
    p_max: lang === 'es' ? 'P Máx [MPa]' : 'P Max [MPa]',
    coef_a: lang === 'es' ? 'Coeficiente a' : 'Coefficient a',
    exp_n: lang === 'es' ? 'Exponente n' : 'Exponent n',
    add_range: lang === 'es' ? 'Añadir Rango de Presión' : 'Add Pressure Range',
    single_range: lang === 'es' ? 'Establecer Rango Único (0.101 a ∞)' : 'Set Single Global Range (0.101 to ∞)',
    curve_preview: lang === 'es' ? 'Curva Teórica de Regresión r(P)' : 'Theoretical Regression Curve r(P)',
    burn_rate_unit: lang === 'es' ? 'Velocidad r (mm/s)' : 'Burn Rate r (mm/s)',
    pressure_unit: lang === 'es' ? 'Presión P (MPa)' : 'Pressure P (MPa)',
    delete_confirm: lang === 'es' ? '¿Estás seguro de que deseas eliminar este propulsante personalizado de tu biblioteca?' : 'Are you sure you want to delete this custom propellant from your library?',
    fixed_badge: lang === 'es' ? 'Fijo / Protegido' : 'Fixed / Protected',
    custom_badge: lang === 'es' ? 'Personalizado' : 'Custom'
  };

  const startCreateNew = () => {
    const nextId = Math.max(8, ...customPropellants.map(p => p.id + 1));
    setEditingPropellant({
      id: nextId,
      name: `Propulsor #${nextId - 7}`,
      category: 'custom',
      rho: 1.80,
      T0: 1700,
      k: 1.14,
      M: 40.0,
      k2ph: 1.04,
      a: 8.0,
      n: 0.50,
      pressureRanges: [
        { id: 'r1', pMin: 0.101, pMax: 2.5, a: 8.0, n: 0.50 },
        { id: 'r2', pMin: 2.5, pMax: 10.0, a: 5.5, n: 0.60 }
      ],
      isCustom: true,
      color: '#8b5cf6',
      description: lang === 'es' ? 'Propulsante personalizado' : 'Custom formulated propellant'
    });
    setActiveTab('editor');
  };

  const startDuplicate = (prop: CustomPropellant) => {
    const nextId = Math.max(8, ...customPropellants.map(p => p.id + 1));
    const ranges: EditablePressureRange[] = prop.pressureRanges && prop.pressureRanges.length > 0
      ? JSON.parse(JSON.stringify(prop.pressureRanges))
      : [{ id: `r-${Date.now()}`, pMin: 0.101, pMax: 20.0, a: prop.a, n: prop.n }];

    setEditingPropellant({
      ...prop,
      id: nextId,
      name: `${prop.name} (Personalizado)`,
      category: 'custom',
      isCustom: true,
      pressureRanges: ranges
    });
    setActiveTab('editor');
  };

  const startEdit = (prop: CustomPropellant) => {
    if (prop.id <= 7) return;
    const ranges: EditablePressureRange[] = prop.pressureRanges && prop.pressureRanges.length > 0
      ? JSON.parse(JSON.stringify(prop.pressureRanges))
      : [{ id: `r-${Date.now()}`, pMin: 0.101, pMax: 20.0, a: prop.a, n: prop.n }];

    setEditingPropellant({
      ...JSON.parse(JSON.stringify(prop)),
      pressureRanges: ranges
    });
    setActiveTab('editor');
  };

  const confirmDelete = (id: number) => {
    if (id <= 7) return;
    const updated = customPropellants.filter(p => p.id !== id);
    onSavePropellants(updated);
    saveCustomPropellantsToStorage(updated);
    if (editingPropellant?.id === id) {
      setEditingPropellant(null);
      setActiveTab('catalog');
    }
    setDeletingId(null);
  };

  const updatePressureRange = (index: number, field: keyof EditablePressureRange, val: string) => {
    if (!editingPropellant || !editingPropellant.pressureRanges) return;
    const updated = [...editingPropellant.pressureRanges];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    setEditingPropellant({
      ...editingPropellant,
      pressureRanges: updated
    });
  };

  const addPressureRange = () => {
    if (!editingPropellant) return;
    const currentRanges = editingPropellant.pressureRanges || [];
    const lastRange = currentRanges[currentRanges.length - 1];
    
    let newMin = 0.101;
    if (lastRange) {
      const parsedMax = parseFloat(String(lastRange.pMax));
      newMin = !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : 0.101;
    }
    const newMax = Number((newMin + 3.0).toFixed(3));
    const defaultA = lastRange ? lastRange.a : 5.0;
    const defaultN = lastRange ? lastRange.n : 0.5;

    const updated: EditablePressureRange[] = [
      ...currentRanges,
      {
        id: `r-${Date.now()}-${Math.random()}`,
        pMin: Number(newMin.toFixed(3)),
        pMax: newMax,
        a: defaultA,
        n: defaultN
      }
    ];

    setEditingPropellant({
      ...editingPropellant,
      pressureRanges: updated
    });
  };

  const removePressureRange = (index: number) => {
    if (!editingPropellant || !editingPropellant.pressureRanges) return;
    if (editingPropellant.pressureRanges.length <= 1) {
      alert(lang === 'es' 
        ? 'Debe haber al menos un rango de presión definido en la tabla.' 
        : 'At least one pressure range must be defined in the table.');
      return;
    }
    const updated = editingPropellant.pressureRanges.filter((_, i) => i !== index);
    setEditingPropellant({
      ...editingPropellant,
      pressureRanges: updated
    });
  };

  const setSingleRange = () => {
    if (!editingPropellant) return;
    const first = editingPropellant.pressureRanges?.[0];
    setEditingPropellant({
      ...editingPropellant,
      pressureRanges: [
        {
          id: 'r-global',
          pMin: 0.101,
          pMax: 99.0,
          a: first ? first.a : (editingPropellant.a || 5.0),
          n: first ? first.n : (editingPropellant.n || 0.5)
        }
      ]
    });
  };

  const handleSave = () => {
    if (!editingPropellant) return;
    if (!editingPropellant.name.trim()) {
      alert(lang === 'es' ? 'Por favor introduce un nombre válido para el propulsante.' : 'Please enter a valid propellant name.');
      return;
    }

    // Validate thermodynamics fields are not empty
    if (
      String(editingPropellant.rho).trim() === '' ||
      String(editingPropellant.T0).trim() === '' ||
      String(editingPropellant.k).trim() === '' ||
      String(editingPropellant.M).trim() === ''
    ) {
      alert(lang === 'es' 
        ? 'Por favor completa todas las propiedades termodinámicas y densidad antes de guardar.' 
        : 'Please fill in all thermodynamic and density properties before saving.');
      return;
    }

    // Validate table rows have no empty values
    if (editingPropellant.pressureRanges && editingPropellant.pressureRanges.length > 0) {
      for (let i = 0; i < editingPropellant.pressureRanges.length; i++) {
        const r = editingPropellant.pressureRanges[i];
        if (
          String(r.pMin).trim() === '' ||
          String(r.pMax).trim() === '' ||
          String(r.a).trim() === '' ||
          String(r.n).trim() === ''
        ) {
          alert(lang === 'es'
            ? `Por favor rellena o elimina los campos vacíos en la fila ${i + 1} de la tabla de tasa de quemado.`
            : `Please fill in or delete the empty fields in row ${i + 1} of the burn rate table.`);
          return;
        }
      }
    }

    const ranges: PressureRangeBurnRate[] = (editingPropellant.pressureRanges && editingPropellant.pressureRanges.length > 0)
      ? editingPropellant.pressureRanges.map((r, i) => ({
          id: r.id || `r-${i}`,
          pMin: Number(parseFloat(String(r.pMin)).toFixed(4)),
          pMax: Number(parseFloat(String(r.pMax)).toFixed(4)),
          a: Number(parseFloat(String(r.a)).toFixed(4)),
          n: Number(parseFloat(String(r.n)).toFixed(4))
        }))
      : [{ id: 'r-default', pMin: 0.101, pMax: 20.0, a: parseFloat(String(editingPropellant.a)) || 5.0, n: parseFloat(String(editingPropellant.n)) || 0.5 }];

    const firstRange = ranges[0];
    const payload: CustomPropellant = {
      id: editingPropellant.id,
      name: editingPropellant.name.trim(),
      category: editingPropellant.category,
      rho: parseFloat(String(editingPropellant.rho)) || 1.8,
      T0: parseFloat(String(editingPropellant.T0)) || 1700,
      k: parseFloat(String(editingPropellant.k)) || 1.13,
      M: parseFloat(String(editingPropellant.M)) || 40,
      k2ph: parseFloat(String(editingPropellant.k2ph)) || 1.04,
      a: firstRange.a,
      n: firstRange.n,
      isCustom: true,
      pressureRanges: ranges,
      color: editingPropellant.color || '#8b5cf6',
      description: editingPropellant.description || (lang === 'es' ? 'Propulsante personalizado' : 'Custom propellant')
    };

    let updatedList: CustomPropellant[];
    const exists = customPropellants.some(p => p.id === payload.id);
    if (exists) {
      updatedList = customPropellants.map(p => p.id === payload.id ? payload : p);
    } else {
      updatedList = [...customPropellants, payload];
    }

    onSavePropellants(updatedList);
    saveCustomPropellantsToStorage(updatedList);
    setActiveTab('catalog');
    setEditingPropellant(null);
  };

  // Preview curve data for the editor
  const previewCurveData = useMemo(() => {
    if (!editingPropellant) return [];
    const points: Array<{ P: number; r: number }> = [];
    
    const sanitizedRanges: PressureRangeBurnRate[] = (editingPropellant.pressureRanges || []).map((r, i) => ({
      id: r.id || `r-${i}`,
      pMin: parseFloat(String(r.pMin)) || 0.101,
      pMax: parseFloat(String(r.pMax)) || 10.0,
      a: parseFloat(String(r.a)) || 5.0,
      n: parseFloat(String(r.n)) || 0.5
    }));

    const sanitizedPropellant: CustomPropellant = {
      id: editingPropellant.id,
      name: editingPropellant.name,
      category: editingPropellant.category,
      rho: parseFloat(String(editingPropellant.rho)) || 1.8,
      T0: parseFloat(String(editingPropellant.T0)) || 1700,
      k: parseFloat(String(editingPropellant.k)) || 1.13,
      M: parseFloat(String(editingPropellant.M)) || 40,
      k2ph: parseFloat(String(editingPropellant.k2ph)) || 1.04,
      a: sanitizedRanges[0]?.a ?? 5.0,
      n: sanitizedRanges[0]?.n ?? 0.5,
      pressureRanges: sanitizedRanges
    };

    const list = [sanitizedPropellant];

    for (let p = 0.1; p <= 10; p += 0.2) {
      const { a, n } = getBurnRate(p, editingPropellant.id, list);
      const r = a * Math.pow(p, n);
      points.push({
        P: Number(p.toFixed(2)),
        r: Number(r.toFixed(2))
      });
    }
    return points;
  }, [editingPropellant]);

  if (!isOpen) return null;

  return (
    <div 
      id="custom-propellant-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div 
        id="custom-propellant-modal-dialog" 
        className="relative w-full max-w-5xl max-h-[90vh] bg-card text-card-foreground border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Beaker className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                {t.modal_title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {lang === 'es' 
                  ? 'Gestiona tablas de tasa de quemado empíricas por intervalos de presión y propiedades termodinámicas' 
                  : 'Manage empirical piecewise burn rate tables and thermodynamic properties'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('catalog'); setEditingPropellant(null); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'catalog'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {t.catalog_tab}
            </button>

            {activeTab === 'editor' && editingPropellant && (
              <span className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {editingPropellant.id > 7 && customPropellants.some(p => p.id === editingPropellant.id)
                  ? t.editor_tab_edit 
                  : t.editor_tab_new}
              </span>
            )}
          </div>

          {activeTab === 'catalog' && (
            <button
              onClick={startCreateNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm hover:shadow-purple-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.btn_new}
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === 'catalog' ? (
            /* Catalog Tab */
            <div id="propellant-catalog-container" className="space-y-6 animate-fadeIn">
              
              {/* 1. Custom Propellants Section */}
              <div id="custom-propellants-section" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      {t.custom_propellants}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                        {customPropellants.length}
                      </span>
                    </h3>
                  </div>
                </div>

                {customPropellants.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-border text-center bg-muted/10 space-y-2">
                    <p className="text-sm text-muted-foreground">{t.no_custom}</p>
                    <button
                      onClick={startCreateNew}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {lang === 'es' ? 'Crear mi primer propulsor personalizado ahora' : 'Create my first custom propellant now'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {customPropellants.map(prop => (
                      <div
                        key={prop.id}
                        id={`custom-prop-card-${prop.id}`}
                        className="p-4 rounded-xl border border-purple-500/30 bg-card hover:border-purple-500/60 transition-all space-y-3 shadow-sm relative group"
                      >
                        {/* Header & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3.5 h-3.5 rounded-full ring-2 ring-purple-500/40 shrink-0" 
                              style={{ backgroundColor: prop.color || '#8b5cf6' }} 
                            />
                            <div>
                              <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                                {prop.name}
                                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-bold">
                                  #{prop.id} • {t.custom_badge}
                                </span>
                              </h4>
                              <p className="text-xs text-muted-foreground font-mono">
                                ρ = {prop.rho} g/cm³ • T₀ = {prop.T0} K • γ = {prop.k} • M = {prop.M} g/mol
                              </p>
                            </div>
                          </div>

                          {/* Action icons: Edit, Duplicate, Delete */}
                          <div className="flex items-center gap-1 shrink-0">
                            {deletingId === prop.id ? (
                              <div className="flex items-center gap-1 bg-red-500/10 dark:bg-red-950/40 border border-red-500/40 px-2 py-0.5 rounded-lg animate-fadeIn">
                                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 mr-1">
                                  {lang === 'es' ? '¿Eliminar?' : 'Delete?'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDelete(prop.id);
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer transition-colors shadow-xs"
                                >
                                  {lang === 'es' ? 'Sí' : 'Yes'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingId(null);
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-medium bg-muted hover:bg-muted/80 text-foreground rounded cursor-pointer transition-colors"
                                >
                                  {lang === 'es' ? 'No' : 'No'}
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(prop)}
                                  title={t.btn_edit}
                                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4 text-purple-500" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startDuplicate(prop)}
                                  title={t.btn_duplicate}
                                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingId(prop.id)}
                                  title={t.btn_delete}
                                  className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Explicit Burn Rate Table */}
                        <BurnRateTable propellant={prop} lang={lang} />

                        {onSelectPropellantForGrain && (
                          <button
                            onClick={() => {
                              onSelectPropellantForGrain(prop.id);
                              onClose();
                            }}
                            className="w-full py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {t.btn_use}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Built-in Propellants Section (Fixed 1 to 7) */}
              <div id="builtin-propellants-section" className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      {t.standard_propellants}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                        {DEFAULT_PROPELLANTS.length}
                      </span>
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    {lang === 'es' ? 'Valores experimentales calibrados' : 'Calibrated experimental values'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {DEFAULT_PROPELLANTS.map(prop => (
                    <div
                      key={prop.id}
                      id={`builtin-prop-card-${prop.id}`}
                      className="p-4 rounded-xl border border-border/80 bg-muted/15 hover:bg-muted/25 transition-all space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            {prop.name}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-bold">
                              #{prop.id} • {t.fixed_badge}
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground font-mono">
                            ρ = {prop.rho} g/cm³ • T₀ = {prop.T0} K • γ = {prop.k} • M = {prop.M} g/mol
                          </p>
                        </div>

                        {/* Duplicate button to use as base for a custom thruster */}
                        <button
                          onClick={() => startDuplicate(prop)}
                          title={t.btn_duplicate}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-md transition-colors cursor-pointer shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t.btn_duplicate}</span>
                        </button>
                      </div>

                      {/* Burn Rate Table by pressure intervals */}
                      <BurnRateTable propellant={prop} lang={lang} />

                      {onSelectPropellantForGrain && (
                        <button
                          onClick={() => {
                            onSelectPropellantForGrain(prop.id);
                            onClose();
                          }}
                          className="w-full py-1 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors cursor-pointer"
                        >
                          {t.btn_use}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : editingPropellant ? (
            /* Propellant Editor Tab */
            <div id="propellant-editor-container" className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Properties & Interactive Burn Rate Table */}
                <div className="lg:col-span-7 space-y-5">
                  
                  {/* General Identification */}
                  <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      {lang === 'es' ? 'Identificación del Propulsor' : 'Propellant Identification'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.name}</label>
                        <input
                          id="input-propellant-name"
                          type="text"
                          value={editingPropellant.name}
                          onChange={e => setEditingPropellant({ ...editingPropellant, name: e.target.value })}
                          className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none transition-all ${
                            !editingPropellant.name.trim() 
                              ? 'border-2 border-amber-500 ring-2 ring-amber-500/30' 
                              : 'border-border focus:ring-2 focus:ring-purple-500'
                          }`}
                          placeholder="ej. KNSB-65/35 Experimental"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.category}</label>
                        <select
                          id="select-propellant-category"
                          value={editingPropellant.category}
                          onChange={e => setEditingPropellant({ ...editingPropellant, category: e.target.value as any })}
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                        >
                          <option value="custom">{lang === 'es' ? 'Personalizado' : 'Custom'}</option>
                          <option value="candy">Candy / Azúcar (KNDX, KNSO, KNSU)</option>
                          <option value="rnx">Resina Epoxi (RNX)</option>
                          <option value="apcp">Perclorato Amónico (APCP)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Thermodynamics */}
                  <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-500" />
                      {lang === 'es' ? 'Propiedades Termodinámicas y Densidad' : 'Thermodynamics & Density'}
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <FormPropertyNumberInput
                        id="input-propellant-rho"
                        label={t.rho}
                        step="0.001"
                        value={editingPropellant.rho}
                        onChange={val => setEditingPropellant({ ...editingPropellant, rho: val })}
                      />

                      <FormPropertyNumberInput
                        id="input-propellant-T0"
                        label={t.T0}
                        step="10"
                        value={editingPropellant.T0}
                        onChange={val => setEditingPropellant({ ...editingPropellant, T0: val })}
                      />

                      <FormPropertyNumberInput
                        id="input-propellant-k"
                        label={t.k}
                        step="0.001"
                        value={editingPropellant.k}
                        onChange={val => setEditingPropellant({ ...editingPropellant, k: val })}
                      />

                      <FormPropertyNumberInput
                        id="input-propellant-M"
                        label={t.M}
                        step="0.1"
                        value={editingPropellant.M}
                        onChange={val => setEditingPropellant({ ...editingPropellant, M: val })}
                      />

                      <FormPropertyNumberInput
                        id="input-propellant-k2ph"
                        label={t.k2ph}
                        step="0.001"
                        value={editingPropellant.k2ph ?? 1.04}
                        onChange={val => setEditingPropellant({ ...editingPropellant, k2ph: val })}
                      />
                    </div>
                  </div>

                  {/* 3. Interactive Burn Rate Table Editor */}
                  <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Flame className="w-4 h-4 text-orange-500" />
                          {t.table_ranges_title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {lang === 'es' 
                            ? 'Define cada intervalo de presión [P_mín, P_máx] con sus coeficientes a y n asociados (r = a · Pⁿ).' 
                            : 'Set each pressure interval with associated empirical a and n coefficients (r = a · Pⁿ).'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={setSingleRange}
                          className="text-[11px] px-2.5 py-1 rounded bg-background border border-border hover:bg-muted text-foreground transition-colors cursor-pointer font-medium"
                        >
                          {t.single_range}
                        </button>
                      </div>
                    </div>

                    {/* Table View Inputs */}
                    <div className="rounded-lg border border-border overflow-hidden bg-background">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border text-[11px] text-muted-foreground font-semibold">
                            <th className="py-2 px-2.5 text-left">{t.p_min}</th>
                            <th className="py-2 px-2.5 text-left">{t.p_max}</th>
                            <th className="py-2 px-2.5 text-left">{t.coef_a}</th>
                            <th className="py-2 px-2.5 text-left">{t.exp_n}</th>
                            <th className="py-2 px-2 text-center w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(editingPropellant.pressureRanges || []).map((range, idx) => (
                            <tr key={range.id || idx} className="hover:bg-muted/20">
                              <td className="p-1.5">
                                <TableNumberInput
                                  step="0.01"
                                  placeholder="P mín"
                                  value={range.pMin}
                                  onChange={val => updatePressureRange(idx, 'pMin', val)}
                                />
                              </td>
                              <td className="p-1.5">
                                <TableNumberInput
                                  step="0.01"
                                  placeholder="P máx"
                                  value={range.pMax}
                                  onChange={val => updatePressureRange(idx, 'pMax', val)}
                                />
                              </td>
                              <td className="p-1.5">
                                <TableNumberInput
                                  step="0.001"
                                  placeholder="a"
                                  styleVariant="primary"
                                  value={range.a}
                                  onChange={val => updatePressureRange(idx, 'a', val)}
                                />
                              </td>
                              <td className="p-1.5">
                                <TableNumberInput
                                  step="0.001"
                                  placeholder="n"
                                  styleVariant="amber"
                                  value={range.n}
                                  onChange={val => updatePressureRange(idx, 'n', val)}
                                />
                              </td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => removePressureRange(idx)}
                                  className="p-1 text-red-500 hover:bg-red-500/10 rounded cursor-pointer transition-colors"
                                  title={t.btn_delete}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={addPressureRange}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t.add_range}
                      </button>

                      <span className="text-[11px] text-muted-foreground font-mono">
                        {editingPropellant.pressureRanges?.length || 0} {lang === 'es' ? 'intervalos definidos' : 'intervals defined'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Right Column: Live Saint-Robert Curve Preview */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col h-full min-h-[380px]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-primary" />
                        {t.curve_preview}
                      </h4>
                      <span className="text-[10px] font-mono text-muted-foreground">0.1 - 10.0 MPa</span>
                    </div>

                    <div className="flex-1 w-full min-h-[260px] bg-muted/10 rounded-lg p-2 border border-border/60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={previewCurveData} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis 
                            dataKey="P" 
                            unit=" MPa" 
                            fontSize={10} 
                            tickLine={false}
                          />
                          <YAxis 
                            unit=" mm/s" 
                            fontSize={10} 
                            tickLine={false} 
                            width={55}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="p-2 rounded bg-slate-900 text-white text-xs border border-slate-700 shadow-lg font-mono">
                                    <p className="text-slate-400">P = {data.P} MPa</p>
                                    <p className="text-purple-400 font-bold">r = {data.r} mm/s</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="r" 
                            stroke="#8b5cf6" 
                            strokeWidth={2.5} 
                            dot={false} 
                            activeDot={{ r: 4, fill: '#8b5cf6' }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1.5">
                      <p className="flex items-start gap-1.5">
                        <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                        <span>
                          {lang === 'es' 
                            ? 'La curva evalúa en tiempo real los valores de a y n para cada intervalo de presión ingresado en la tabla.' 
                            : 'The curve calculates in real time according to the table ranges and coefficients.'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Actions for Editor */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setActiveTab('catalog'); setEditingPropellant(null); }}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors cursor-pointer"
                >
                  {t.btn_cancel}
                </button>

                <button
                  type="button"
                  id="btn-save-custom-propellant"
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md hover:shadow-purple-500/20 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t.btn_save}
                </button>
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
};
