# 01 - Arquitectura Balística y Funcionamiento del Simulador

Este documento explica las bases matemáticas, físicas y de programación del motor de simulación 1D de HERMES (`src/lib/simulator.ts`).

---

## 1. Fundamento de Balística Interna

El simulador resuelve el equilibrio dinámico entre la masa de gas generada por la combustión de la superficie del propelente ($\dot{m}_{gen}$) y la masa de gas evacuada a través del área de garganta de la tobera sónica ($\dot{m}_{noz}$).

### A. Balance de Masa en la Cámara de Combustión
$$\frac{d(\rho_0 V_0)}{dt} = \dot{m}_{gen} - \dot{m}_{noz}$$

Donde:
* $\dot{m}_{gen} = \rho_{prop} \cdot A_b(t) \cdot r(P_0)$
* $\dot{m}_{noz} = \frac{P_0 \cdot A_t(t)}{c^*}$
* $c^*$ (Velocidad Característica): Representa la energía termodinámica del gas de combustión:
  $$c^* = \frac{\sqrt{\gamma R T_0}}{\gamma \sqrt{\left(\frac{2}{\gamma + 1}\right)^{\frac{\gamma + 1}{\gamma - 1}}}}$$

### B. Ley de Quemado de Saint-Robert (Vieille)
La velocidad de regresión lineal del grano $r$ (en mm/s) depende de la presión instantánea en la cámara $P_0$ (en MPa):
$$r = a \cdot (P_0)^n$$
* $a$: Coeficiente empírico de tasa de quemado.
* $n$: Exponente de presión ($n < 1$ para combustión estable; $n \ge 1$ produce riesgo de sobrepresión incontrolada).
* HERMES admite rangos de presión discretos: según el intervalo donde caiga $P_0$, se aplican diferentes pares de $(a, n)$.

---

## 2. Regresión Geométrica de Granos

El resolvedor calcula el área de combustión $A_b(t)$ en cada paso de tiempo $\Delta t$ según la geometría de cada grano:

### A. Grano Cilíndrico / Tubular (BATES)
* **Cavidad Interna**: $A_{bc}(t) = \pi \cdot d(t) \cdot L(t)$ donde $d(t) = d_0 + 2 \cdot y(t)$
* **Superficie Externa** (si no está inhibida): $A_{bs}(t) = \pi \cdot D(t) \cdot L(t)$ donde $D(t) = D_0 - 2 \cdot y(t)$
* **Caras de Extremo** (si no están inhibidas): $A_{be}(t) = 2 \cdot \frac{\pi}{4} \left(D(t)^2 - d(t)^2\right)$
* **Longitud del Grano**: $L(t) = L_0 - 2 \cdot y(t)$ (o $L_0 - y(t)$ si un extremo está protegido).

### B. Grano Estrella (Star Core)
* Dispone de $N_p$ puntas simétricas, diámetro interior inicial $d_0$ y diámetro de valle $d_{0mayor}$.
* Permite configuraciones de empuje neutrales o progresivas para compensar la caída de presión en motores largos.

### C. Grano Macizo (Solid End)
* Sin cavidad interna inicial ($d_0 = 0$). La combustión progresa desde la cara expuesta o el perímetro hacia el centro.

---

## 3. Modelos de Tobera y Empuje

HERMES calcula simultáneamente dos modelos de empuje:

1. **Modelo Richard Nakka (Empírico Realista)**:
   Aplica coeficientes empíricos de corrección por divergencia cónica ($\lambda = \frac{1 + \cos\alpha}{2}$), fricción y presión atmosférica $P_{amb}$.
2. **Modelo TTI (Teoría de Tobera Ideal)**:
   Calcula la expansión isentrópica exacta desde la presión de cámara $P_0$ hasta la presión de salida $P_e$ evaluando la relación de áreas $\varepsilon = A_e / A_t$.

---

## 4. Efectos Transitorios: Erosión de Tobera y Escoria (Slag)

HERMES implementa 6 modelos analíticos para la variación del diámetro de garganta $D_t(t)$ a lo largo de la combustión:
1. **Lineal**: $y = x$
2. **Exponencial Normalizado**: $y = \frac{e^x - 1}{e - 1}$
3. **Cuadrático**: $y = x^2$
4. **Raíz Cuadrada**: $y = \sqrt{x}$
5. **Parábola Cóncava**: $y = -x^2 + 2x$
6. **Sinusoidal**: $y = \sin\left(\frac{\pi}{2} x\right)$

Permite simular tanto **depósito de escoria de alúmina** ($-\Delta D_t$) como **erosión térmica** en grafito o aluminio ($+\Delta D_t$).
