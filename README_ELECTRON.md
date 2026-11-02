# 🛠️ Guía Maestra: Crea tu Aplicación HERMES (.exe) para Escritorio

¡Hola! Has elegido la opción de **Electron** para convertir este simulador en un programa profesional que cualquiera pueda instalar en su ordenador. Como es tu primera vez, he preparado esta guía paso a paso para que no te pierdas.

> **Importante**: La creación del archivo instalador (`.exe`) se debe hacer **en tu propio ordenador**, ya que requiere acceso a las herramientas del sistema que no están disponibles en el navegador.

---

## 1️⃣ Paso 1: Descarga el Código
Primero, saca todo el trabajo que hemos hecho de aquí a tu escritorio:
1.  Arriba a la derecha, busca el botón **Settings** (Ajustes).
2.  Pulsa en **Export to ZIP**.
3.  Guarda el archivo en tu ordenador y **descomprímelo** (clic derecho -> Extraer todo) en una carpeta que tengas a mano, por ejemplo, en el Escritorio.

---

## 2️⃣ Paso 2: Prepara tu Ordenador (Solo la primera vez)
Para que tu PC pueda "cocinar" el código y convertirlo en una app, necesita un pequeño motor llamado **Node.js**:
1.  Ve a [nodejs.org](https://nodejs.org/).
2.  Descarga la versión que dice **LTS** (es la más estable).
3.  Instálala como cualquier otro programa (Siguiente, Siguiente, Aceptar).

---

## 3️⃣ Paso 3: Abre la "Cocina" (Terminal)
Ahora vamos a decirle al ordenador que trabaje con los archivos que descargaste:
1.  Entra en la carpeta donde extrajiste el código.
2.  En la barra de direcciones de la carpeta (arriba, donde pone la ruta), escribe `cmd` y pulsa **Enter**. Se abrirá una ventana negra (la terminal).

---

## 4️⃣ Paso 4: Comandos Mágicos
Escribe estos comandos en la ventana negra uno por uno (pulsa Enter después de cada uno y espera a que terminen):

### A) Instalar las herramientas necesarias:
Este paso descarga todas las librerías (React, Recharts, Electron...) en tu carpeta.
```bash
npm install
```

### B) Crear el instalador (.exe):
Este es el comando que hace todo el trabajo pesado. Limpia el código, lo prepara para Windows y crea el instalador.
```bash
npm run electron:build
```

---

## 5️⃣ ¡Ya lo tienes!
Cuando el proceso termine (verás que pone "Done" o vuelve a aparecer el cursor), ve a tu carpeta del proyecto. 
*   Verás que ha aparecido una carpeta nueva llamada **`release`**.
*   Dentro de `release` encontrarás un archivo llamado **`HERMES Rocket Simulator Setup.exe`**.

**¡Ese es tu instalador!** Puedes enviárselo a quien quieras, subirlo a una web o mandarlo por correo. Al ejecutarlo, se instalará en el PC con el icono de HERMES.

---

## 🎨 Personalización Final
Si quieres cambiar el icono antes de crear el `.exe`:
1.  Reemplaza el archivo `public/icon.png` por cualquier otro con el mismo nombre.
2.  Vuelve a ejecutar `npm run electron:build`.

---

## 💡 Consejos de Profesional
*   **Aviso de Windows**: Como tu app es nueva, Windows dirá "Protegió su PC". No te asustes, pulsa en *"Más información"* y luego en *"Ejecutar de todas formas"*.
*   **Probar sin instalar**: Si solo quieres ver cómo queda la ventana sin instalarla, usa el comando `npm run electron:dev` (teniendo en otra terminal abierto el comando `npm run dev`).

¡Disfruta de tu nueva aplicación de escritorio de HERMES! 🚀
