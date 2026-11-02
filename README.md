# HERMES Rocket Simulator

HERMES is an advanced, web-based internal ballistics simulator designed for solid rocket motors. It aims to empower rocket engineers, researchers, and hobbyists by providing an intuitive yet powerful interface for estimating motor performance, chamber pressure, thrust curves, and overall efficiency based on specific grain and nozzle geometries.

## Features

- **Multi-Grain Architecture**: Supports up to 10 solid propellant grains with different geometries (Bates, Tubular, Moon, Star, etc.).
- **Live Parametric Design**: Edit geometric parameters like length, outer diameter, core diameter, and inhibitor thickness, and immediately see visual updates in the 2D Motor Schematic.
- **Thermochemical & Internal Ballistics Engine**: Simulates combustion, pressure distribution, apogee estimation, exit mach, and specific impulse based on propellant properties ($a$, $n$, density, etc.).
- **Interactive Visualization**: Uses `recharts` to render real-time Thrust and Pressure curves over time.
- **Experimental Data Import**: Upload `.xlsx` or `.csv` files from real static fire tests to directly compare experimental curves against simulated results.
- **Simulation Library (Save & Load)**: Save different design iterations to your browser's local storage. You can organize your simulations in custom "Folders / Groups" to easily manage and compare distinct rocket projects.
- **Multi-language Support**: Fully translated into English, Spanish, French, and Italian.
- **Export Capabilities**: Export numerical simulation results to CSV/Excel for further analysis.

## Core Application Structure

### 1. The React Frontend
The application is built with React + Vite, utilizing `Tailwind CSS` for styling and `lucide-react` for iconography. The app leverages shadcn UI components for elements like Inputs, Dropdowns (Select), and Buttons to maintain a cohesive, accessible design.

### 2. Main Components
- `App.tsx`: The primary container that holds global state (motor parameters, grains, nozzle, saved simulations, language, theme).
- `MotorPreview.tsx`: Renders the 2D SVG schematic of the casing, closure, inhibitor walls, and solid grains inside the motor.
- `GrainPreview.tsx`: Visualizes the 2D cross-section of individual propellant grains, illustrating core geometries (Bates, Moon, Finocyl).
- `MissionControl.tsx`: A side-panel dashboard displaying estimated Apogee, expected Exit Mach, Thrust coefficients, and comparison metrics. It also handles importing experimental data.
- `EngineViewer.tsx` & `GrainViewer.tsx`: Allow structural viewing and configuring of the rocket casing/nozzle and specific propellant grains.

### 3. Simulation Logic (`src/lib/`)
- `simulator.ts`: Contains the `runSimulation()` function, representing the mathematical core of HERMES. It calculates:
  - Burning area progression (Kn).
  - Chamber pressure ($P_c$) over time based on steady-state approximation $P_c = (\frac{a \cdot A_b \cdot \rho}{A_t})^{(1 / (1-n))}$.
  - Thrust curves over time.
- `apogee.ts`: Houses kinematic functions (`calculateApogee()`) to roughly estimate launch altitude based on motor thrust, total impulse, rocket dry mass, drag coefficient, and environmental factors (altitude ASL, temperature).
- `i18n.ts`: Stores language dictionaries to seamlessly switch between localizations.

## How the Application Works (User Flow)

1. **Setup Dimensions**: The user adjusts the core rocket dimensions (Motor Chamber, Nozzle parameters) in the main panels.
2. **Configure Grains**: The user adds one or more grains, defining their geometries.
3. **Internal Calculations**: With every UI change, the `useEffect` hooks in React immediately trigger the `runSimulation` function.
4. **Visualizing Outcomes**: The chart component re-renders the continuous pressure and thrust graphs, enabling the user to immediately identify over-pressure violations or burn time issues.
5. **Mission Control Updates**: Flight metrics like Apogee are recalculated and shown in the Mission Control panel.
6. **Save Simulation**: When satisfied with a configuration, the user can click "Library / Save", select a group name (e.g., "60mm Test Motors"), and save it. It will persist in `localStorage`.
7. **Compare to Reality**: The user imports static-fire thrust data (CSV), which is overlaid directly on top of the simulated charts.

## Deployment & Build Process

This application runs purely on the client-side (SPA).
To run it locally:
```bash
npm install
npm run dev
```

To build for production:
```bash
npm run build
```

The output in `dist/` can be hosted statically.
