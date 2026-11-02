# 📚 NOTAS TÉCNICAS Y DOCUMENTACIÓN DE HERMES (v1.4)

Bienvenido a la carpeta de **NOTAS** de HERMES Rocket Motor Simulator.
Este directorio recopila la documentación técnica, arquitectónica y operativa del software para desarrolladores, colaboradores e ingenieros que deseen comprender el funcionamiento interno del proyecto, replicarlo o generar ejecutables.

---

## 🗂️ Índice de Documentación

| Archivo | Contenido Principal |
| :--- | :--- |
| [**01_ARQUITECTURA_Y_SIMULADOR.md**](./01_ARQUITECTURA_Y_SIMULADOR.md) | Resolvedor balístico 1D, regresión geométrica de granos, tobera (Nakka vs TTI), erosión y escoria. |
| [**02_GUIA_EJECUTABLE_ELECTRON.md**](./02_GUIA_EJECUTABLE_ELECTRON.md) | Paso a paso para empaquetar la aplicación en un instalador `.exe` nativo de Windows con Electron. |
| [**03_PROPULSANTES_Y_QUIMICA.md**](./03_PROPULSANTES_Y_QUIMICA.md) | Sistema de combustibles, termodinámica ($\rho, T_0, \gamma, M$), persistencia y rangos de Saint-Robert ($a, n$). |
| [**04_ANALISIS_DETALLADO_Y_TELEMETRIA.md**](./04_ANALISIS_DETALLADO_Y_TELEMETRIA.md) | Diagnóstico $Kn$, ley de velocidad de quemado, balance de gasto másico ($\dot{m}$) y simulación de vuelo 1D. |
| [**05_HOJA_DE_RUTA_V1.4_SMART_SEARCH.md**](./05_HOJA_DE_RUTA_V1.4_SMART_SEARCH.md) | Especificación del motor de búsqueda inversa y optimización de diseño geométrico para la versión 1.4. |

---

## 🚀 Estado Actual del Software (Versión 1.4.0)

- **Núcleo de Simulación**: Resolvedor de balística interna en tiempo real con paso de integración $\Delta t$ variable.
- **Geometrías Soportadas**: Cilíndrico/Tubular, Estrella (Star Core con $N_p$ puntas y radio de valle), BATES y Grano Macizo con control de inhibición de caras.
- **Química de Propelentes**: Biblioteca estándar (KNDX, KNSB, KNSU, RNX-71V, RNX-57, APCP) + Diseñador de propelentes a medida con rangos de presión empíricos.
- **Análisis y Telemetría**: Ratio de Knudsen $Kn(t)$, Ley de Vieille/Saint-Robert $r(P) = a \cdot P^n$, caudales másicos de generación y escape, telemetría experimental superpuesta y animación CFD en 2D/3D.
- **Enfoque v1.4**: **Smart Search** (Algoritmos de optimización inversa para encontrar granos y toberas óptimas según objetivo de apogeo o impulso).
