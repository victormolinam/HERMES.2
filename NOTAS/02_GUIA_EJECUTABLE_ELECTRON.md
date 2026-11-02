# 02 - Guía de Compilación del Ejecutable de Escritorio (.exe)

Este documento detalla la estructura y los comandos necesarios para compilar HERMES como una aplicación nativa de escritorio para Windows (`.exe`), macOS o Linux utilizando **Electron** y **electron-builder**.

---

## 1. Arquitectura de Electron en HERMES

* **Punto de Entrada**: `electron/main.cjs` (Proceso principal de Node/Chromium).
* **Preload / Seguridad**: `electron/preload.cjs` (Aislamiento de contexto y API de puente segura).
* **Frontend Empaquetado**: `dist/` (Generado por Vite mediante `npm run build`).
* **Configuración del Paquete**: Sección `"build"` en `package.json`.

---

## 2. Requisitos Previos en la Máquina de Compilación

1. **Node.js**: Versión LTS (18.x, 20.x o superior) instalada desde [nodejs.org](https://nodejs.org/).
2. **NPM**: Gestor de paquetes incluido con Node.js.

---

## 3. Procedimiento de Compilación Paso a Paso

### Paso 1: Instalación de Dependencias
```bash
npm install
```

### Paso 2: Ejecutar en Modo Desarrollo (Prueba Local)
Para probar la aplicación en ventana de Electron antes de compilar el `.exe`:
```bash
# Terminal 1: Inicia el servidor Vite
npm run dev

# Terminal 2: Lanza la ventana Electron
npm run electron:dev
```

### Paso 3: Generación del Instalador (.exe)
```bash
npm run electron:build
```

---

## 4. Archivos Resultantes

Una vez finalizado el comando `npm run electron:build`, se creará una carpeta llamada **`release/`** en la raíz del proyecto:

* **Instalador NSIS**: `release/HERMES Rocket Simulator Setup.exe` (Permite instalar la aplicación en cualquier PC Windows sin necesidad de tener Node.js instalado).
* **Versión Portátil** (si está configurada): Ejecutable directo sin instalación.

---

## 5. Personalización de Marca e Iconos

* **Icono de la Aplicación**: Colocar el archivo de imagen en `public/icon.png` (resolución recomendada: 512x512 o 256x256 px).
* **Nombre de la Ventana y Metadatos**: Configurados en `package.json` bajo la clave `"productName": "HERMES Rocket Simulator"`.
