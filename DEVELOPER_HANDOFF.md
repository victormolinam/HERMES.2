# 🚀 HERMES Simulator - Developer Handoff & Architecture

## 📋 Contexto del Proyecto
Bienvenido al desarrollo de **HERMES Rocket Simulator**. Este documento está diseñado para ser entregado a la Inteligencia Artificial (Google AI Studio / Gemini) cuando inicies una nueva sesión de desarrollo a partir de este código base.

---

## 🤖 PROMPT PARA COPIAR Y PEGAR EN GOOGLE AI STUDIO
*Copia el siguiente texto y pégalo en el chat de tu agente de IA cuando importes este proyecto en Google AI Studio (Build):*

> **"Hola. Acabo de importar el repositorio/código fuente de 'HERMES Rocket Launcher Simulator'. Eres el ingeniero de software líder a cargo de continuar su desarrollo.**
> 
> **CONTEXTO DEL PROYECTO Y ARQUITECTURA:**
> 1. **Propósito**: Es un simulador profesional offline para motores de cohetes de propulsante sólido. Realiza cálculos matemáticos y físicos (presión, empuje, áreas de quemado, etc.) y los visualiza en gráficos 2D y modelos 3D.
> 2. **Tecnologías Clave**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts (para las gráficas).
> 3. **Distribución**: Aunque está construido con tecnologías web, el objetivo final es empaquetarlo como una **aplicación de escritorio ejecutable (.exe) para Windows 100% offline** utilizando **Electron** y `electron-builder`. NO se apunta a Mac y NO requiere servicios en la nube ni API Keys de IA.
> 4. **Estado Actual**: Estamos en la Versión 1.0. El motor de físicas (`src/lib/simulator.ts`), la interfaz de pestañas, el modo 3D intermedio y las descargas a CSV ya funcionan. La app compila perfectamente en Windows usando `npm run electron:build`.
> 
> **REGLAS ESTRICTAS PARA TUS MODIFICACIONES:**
> - **Dependencias Físicas**: No modifiques ni elimines los scripts de `package.json` destinados al *build* de Electron. No rompas la compatibilidad con entornos sin internet.
> - **Resolución y Pantallas**: Mantén siempre un enfoque *Responsive Design* (usando Flexbox, CSS Grid y Tailwind predictivo) para asegurar que la app se vea perfecta y sin distorsiones en cualquier tamaño de pantalla o monitor 1080p, 2K, 4K o portátiles pequeños.
> - **Matemáticas**: Si modificas `simulator.ts`, asegúrate de mantener la precisión de los *floats* y las fórmulas balísticas intactas.
> - **Trabajo**: Antes de reprogramar un módulo existente, usa VIEW_FILE para leer el código. Cuando estemos listos para exportar, asegúrate de correr `lint_applet` o `compile_applet`.
> 
> **Tu tarea ahora es decirme que has entendido esta arquitectura y preguntarme qué nuevas características, bugs o refactorizaciones vamos a trabajar en esta rama de versiones hoy."**

---

## 🌿 Flujo de Trabajo y Colaboración

Actualmente **Google AI Studio (Build)** está enfocado en el prototipado rápido y la exportación, pero **no funciona como un cliente Git bidireccional**. Es decir, no puedes cambiar de ramas (`main` a `develop`) directamente desde el chat, ni hacer un "git pull" automático de los cambios de otro desarrollador.

Para colaborar con tu equipo en este proyecto, tienes DOS Opciones:

### Opción 1: Colaboración Nativa en AI Studio (Share & Remix)
Si quieres que tu compañero siga usando este mismo entorno web con la IA:
1. Presiona el botón de **Share (Compartir)** en la esquina superior derecha de AI Studio.
2. Pásale el enlace generado a tu compañero.
3. Tu compañero debe abrir el enlace y presionar el botón **"Remix"**. Esto creará un espacio de trabajo idéntico y aislado en su propia cuenta de Google.
4. Él puede continuar pidiendo cambios a la IA.
5. Cuando finalice, debe exportar su proyecto (descargar el ZIP) y pasarte los archivos modificados para que tú integres los cambios.

### Opción 2: Desarrollo Local (GitHub + VS Code) - *Recomendado*
Si queréis usar un sistema profesional de ramas (`main` para el `.exe` final, y `develop` para pruebas) debéis llevar el desarrollo a vuestros propios ordenadores:
1. Exporta el código desde AI Studio descargando el ZIP.
2. Abre la carpeta del proyecto en **Visual Studio Code** (VS Code).
3. Utiliza la aplicación **GitHub Desktop** para publicar el repositorio y crear ramas.
4. Invita a tu compañero como colaborador en GitHub.
5. Ahora sí podéis subir y descargar cambios en directo usando la rama `develop`. Podéis seguir programando usando extensiones de IA locales (como Copilot o Cursor) o copiando fragmentos de código de vuelta a chats de IA como Gemini Advanced.
