# Atmos: predicción y clima

Web app instalable (PWA) para iPhone. No necesita servidor propio ni claves de API.

## Archivos
- `index.html`: estructura y estilos.
- `app.js`: toda la lógica (Open-Meteo, RainViewer, NASA GIBS, Windy).
- `sw.js`, `manifest.webmanifest`, `icon-*.png`: lo que hace que se instale y abra sin conexión.

## Publicarla gratis (elige una)

**GitHub Pages (permanente)**
1. Crea una cuenta en github.com y un repositorio público, por ejemplo `atmos`.
2. *Add file → Upload files*: arrastra todos los archivos de esta carpeta (no la carpeta en sí) y pulsa *Commit*.
3. *Settings → Pages → Branch: main / (root) → Save*.
4. En 1–2 minutos estará en `https://TU-USUARIO.github.io/atmos/`.

**Netlify Drop (más rápido)**
1. Entra en https://app.netlify.com/drop y arrastra la carpeta `atmos`.
2. Crea la cuenta gratuita cuando te lo pida para que el sitio no caduque.

## Instalarla en el iPhone
1. Abre el enlace en **Safari**.
2. Botón *Compartir* → *Añadir a pantalla de inicio* → *Añadir*.
3. Se abre a pantalla completa con su icono. Para usar «Mi ubicación», permite la localización cuando te lo pida.

## Cambiarla
- Modelos, variables y colores: listas `MODELS`, `VARS` y `ENS` al principio de `app.js`.
- Visores: función `renderLinks()` en `app.js`.
- Tras subir cambios, sube también el número de `V` en `sw.js` (`atmos-v2`…) para que el iPhone recoja la versión nueva.

## Fuentes y licencias
Open-Meteo (CC BY 4.0, gratis para uso no comercial): ECMWF IFS/AIFS, DWD ICON, NOAA GFS/GEFS, Météo-France AROME/ARPEGE, UK Met Office, KNMI y DMI HARMONIE, GEM, JMA, MET Norway, CMA; ERA5 (Copernicus); CMIP6 HighResMIP; CAMS. Radar: RainViewer. Satélite: NASA GIBS (VIIRS). Mapas animados: Windy (widget embebido). Teselas: OpenStreetMap y CARTO.
