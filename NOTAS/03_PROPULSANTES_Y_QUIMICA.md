# 03 - Química de Propelentes y Formulaciones Personalizadas

Este documento describe la base de datos de propelentes, las constantes termodinámicas utilizadas y el funcionamiento del módulo de propulsantes a medida de HERMES.

---

## 1. Propelentes Estándar Predefinidos

HERMES incluye formulaciones estándar de combustible sólido comúnmente empleadas en cohetería experimental:

| ID | Nombre | Tipo | Densidad $\rho$ (g/cm³) | $T_0$ (K) | $\gamma$ (k) | Masa Molar $M$ (g/mol) | Coeficiente $a$ | Exponente $n$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | KNDX | Azúcar (Dextrosa) | 1.879 | 1710 | 1.1308 | 42.39 | 8.85 | 0.319 |
| **2** | KNSB | Azúcar (Sorbitol) | 1.841 | 1600 | 1.1361 | 39.87 | 7.40 | 0.440 |
| **3** | KNSU | Azúcar (Sacarosa) | 1.889 | 1720 | 1.1330 | 41.98 | 8.26 | 0.319 |
| **4** | RNX-71V | Resina Epoxi / KNO3 | 1.679 | 1480 | 1.1730 | 36.50 | 5.30 | 0.520 |
| **5** | RNX-57 | Resina Epoxi / KNO3 | 1.650 | 1420 | 1.1800 | 35.80 | 4.80 | 0.500 |
| **6** | APCP 68 | Compuesto Amonio | 1.760 | 2800 | 1.2200 | 23.50 | 6.20 | 0.350 |
| **7** | APCP Alum | Compuesto Aluminizado | 1.810 | 3200 | 1.2000 | 25.20 | 7.50 | 0.380 |

---

## 2. Parámetros Termodinámicos Clave

1. **Densidad del Propelente ($\rho$)**: Utilizada para calcular la masa del grano a partir de su volumen geométrico: $m = \rho \cdot V_{grano}$.
2. **Temperatura de Llama de Cámara ($T_0$)**: Temperatura adiabática de combustión (Kelvin).
3. **Relación de Calores Específicos ($\gamma$ o $k$)**: Razón $C_p / C_v$ de los gases de escape, crítica para la expansión en tobera y velocidad del sonido.
4. **Masa Molar Aparente ($M$)**: Peso molecular medio de los productos gaseosos (g/mol). La constante específica del gas es $R = \frac{8314.46}{M}$.

---

## 3. Gestor de Propulsantes Personalizados (`CustomPropellantModal.tsx`)

Los usuarios pueden sintetizar y guardar formulaciones a medida mediante una ventana modal interactiva:

* **Almacenamiento Local**: Se guardan de forma persistente en el navegador bajo la clave `openmotor_custom_propellants_v1`.
* **Rangos Discretos de Presión**: Un propelente personalizado puede tener múltiples intervalos de presión (p. ej. de 0 a 3 MPa con $(a_1, n_1)$, de 3 a 7 MPa con $(a_2, n_2)$), garantizando máxima fidelidad con datos experimentales reales.
* **Integración con Granos**: Cada grano en la configuración del motor puede tener asignado un tipo de propelente independiente.
