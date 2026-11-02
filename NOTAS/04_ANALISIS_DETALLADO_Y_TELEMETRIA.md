# 04 - Análisis Detallado, Diagnóstico y Telemetría de Vuelo

Este documento describe los cuatro módulos de análisis técnico de HERMES (`src/components/DetailedAnalysisView.tsx`) y el simulador de vuelo balístico 1D (`src/components/MissionControl.tsx`).

---

## 1. Ratio de Knudsen ($Kn$) y Estabilidad de Combustión

$$Kn(t) = \frac{A_b(t)}{A_t(t)}$$

El ratio entre el área de quemado del propelente ($A_b$) y el área de la garganta de la tobera ($A_t$) determina directamente la presión de equilibrio en la cámara de combustión. HERMES clasifica la operación en tres regímenes:

1. **Zona de Chuffing / Baja Presión ($Kn < 150$)**: Peligro de combustión pulsante o extinción prematura.
2. **Zona Óptima de Operación ($180 \le Kn \le 400$)**: Combustión estable y eficiente.
3. **Zona Crítica / Riesgo de Sobrepresión ($Kn > 450$)**: Riesgo de explosión o rotura estructural de la carcasa.

---

## 2. Dinámica de Gasto Másico ($\dot{m}$)

El submódulo de flujo másico desglosa:
* **Gasto Generado en Cámara ($\dot{m}_{gen}$)**: Caudal de gases producto de la combustión.
* **Gasto Evacuado por la Tobera ($\dot{m}_{noz}$)**: Caudal sónico asumiendo flujo estrangulado (choked flow) en la garganta.
* **Consumo de Masa de Propelente**: Porcentaje de masa restante y consumida a lo largo del tiempo.

---

## 3. Desglose de Superficies de Combustión ($A_b$)

Permite inspeccionar la evolución de las áreas geométricas de forma individual por cada bloque de grano o la suma total combinada:
* $A_{bc}$: Área de la cavidad central (núcleo tubular o estelar).
* $A_{bs}$: Área de la pared externa (si no está inhibida).
* $A_{be}$: Área de las caras extremas (ends).

---

## 4. Control de Misión y Dinámica de Vuelo 1D

Calcula la trayectoria vertical del cohete a partir de la curva de empuje $F(t)$:

### Ecuación de Movimiento:
$$m(t) \cdot \frac{dv}{dt} = F(t) - m(t) \cdot g - \frac{1}{2} \rho_{aire}(z) \cdot v^2 \cdot C_d \cdot A_{ref}$$

* **Masa Variable**: $m(t) = m_{seco} + m_{prop}(t)$.
* **Densidad del Aire Barométrica**: $\rho_{aire}(z) = \rho_0 \cdot \exp\left(-\frac{g \cdot z}{R_{aire} \cdot T}\right)$.
* **Cálculo de Apogeo**: Determina la altitud máxima ($z_{max}$), velocidad máxima y aceleración pico en $g$.
