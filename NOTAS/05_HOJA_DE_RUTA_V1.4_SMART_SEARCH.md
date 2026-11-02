# 05 - Hoja de Ruta Versión 1.4: Motor de Optimización Inversa (Smart Search)

Este documento establece los objetivos, la formulación matemática y el diseño técnico del módulo **Smart Search**, núcleo central de desarrollo para la **versión 1.4 de HERMES**.

---

## 1. Visión y Objetivo de Smart Search

En lugar de diseñar un motor por ensayo y error (modificando granos manualmente y ejecutando simulaciones hasta dar con los resultados deseados), **Smart Search** invierte el proceso de ingeniería:

> **El usuario define el hardware fijo disponible (Cámara de combustión y tobera) y el objetivo de la misión (p. ej. "Alcanzar 1.000 m de apogeo" o "Máximo impulso total con Pmax < 6 MPa"), y el algoritmo calcula automáticamente la combinación óptima de granos repetitivos, dimensiones ($D_0, d_0, L_0$), número de segmentos y superficies de quemado.**

---

## 2. Flujo de Trabajo en 3 Fases

### Fase 1: Datos de Cámara y Tobera (Hardware Fijo)
1. **Cámara de Combustión**:
   - Diámetro interior ($D_c$) [mm].
   - Longitud útil de cámara ($L_c$) [mm].
   - Presión máxima de diseño ($P_{max}$) [MPa] (por defecto 6.0 MPa).
   - Validación reactiva: al borrar el input queda en blanco sin forzar un "1", y al perder el foco (`onBlur`) muestra advertencia en rojo si está vacío.
2. **Tobera Fija**:
   - Diámetro inicial de garganta ($D_{t0}$) [mm].
   - Diámetro de salida ($D_s$) [mm].
   - Ángulo de divergencia ($\alpha$) [°].
3. **Propelente**:
   - Selector limpio con los 7 propelentes estándar (KNDX, KNSB, KNSU, KNER, KNRX, etc.) y formulaciones personalizadas, mostrando únicamente el nombre comercial.

### Fase 2: Restricciones de Geometría de Grano
1. **Forma de Grano**:
   - Cilíndrico con núcleo (BATES / Tubular).
   - Estrella (Star Core).
   - Cilíndrico Macizo (End-burner).
2. **Número de Segmentos**:
   - Modo Rango (1 a $N_{max}$ granos).
   - Modo Fijo ($N$ granos exactos).
3. **Bloqueos Físicos de Dimensiones**:
   - Diámetro exterior ($D_0$): Libre / Fijo.
   - Diámetro del núcleo ($d_0$): Libre (barrido denso de $Kn$) / Fijo (mandril específico).
   - Longitud de segmento ($L_0$): Libre (optimización de llenado) / Fijo (molde específico).
4. **Inhibición de Superficies**:
   - Exterior ($osi$), Núcleo ($ci$), Extremos ($ei$).

### Fase 3: Objetivos de Misión y Resultados
1. **Objetivos Disponibles**:
   - 🚀 Máximo Impulso Total (Mayor Altitud Global).
   - 🎯 Altura Objetivo de Vuelo (Apogeo en metros con masa seca estimada del cohete).
   - ⚖️ Empuje Neutro / Curva Plana (BATES).
   - ⚡ Combustión Rápida / Alto Empuje Inicial.
   - 📈 Quemado Progresivo.
   - 🎯 Impulso Total Objetivo Específico ($N \cdot s$).
2. **Presentación de Resultados**:
   - Ranking de mejores opciones con badges de clase de motor (E, F, G, H, I, J...).
   - Tarjeta de métricas completa (Impulso Total, Pmax, Fmax, Fmed, Tiempo de quemado, Isp y Apogeo estimado).
   - Botón directo **"Cargar esta Configuración al Motor"**.
   - Curvas balísticas de Empuje $F(t)$ y Presión $P(t)$.
   - Gráfico de dispersión y Pareto (Impulso vs Presión) marcando zonas seguras y de sobrepresión.
   - Visores interactivos 2D y 3D.
