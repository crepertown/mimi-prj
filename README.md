# Para Mimi

Experiencia romántica personal, estática y sin frameworks. No incluye analítica,
cookies, rastreadores, anuncios ni paneles de configuración.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube `index.html`, `css/`, `js/`, `audio/` y
   `og.jpg` (1200x630).
2. En **Settings > Pages**, selecciona **Deploy from a branch**.
3. Elige la rama principal y la carpeta `/ (root)`, guarda y espera a que GitHub
   Pages publique el sitio.
4. Abre la URL publicada desde el teléfono. El audio comenzará después del
   primer toque en el corazón, como exige el navegador móvil.

No abras la página desde una subcarpeta distinta sin conservar las rutas
relativas `css/style.css`, `js/main.js` y `audio/sample.mp3`.

## Editar CONFIG

Al principio de [js/main.js](./js/main.js) está el objeto `CONFIG`:

- `nombre`: nombre que aparece en títulos y mensajes.
- `fechaInicio`: fecha ISO `AAAA-MM-DD` usada para calcular las noches.
- `gatos`: nombres y tipos de los tres gatos.
- `firma`: firma de la carta.
- `fechaFirma`: fecha que aparece bajo la firma.
- `textoFinal`: texto que aparece al terminar la lluvia de meteoritos.
- `mostrarPista`: muestra u oculta la pista `toca` de la primera escena.
- `pausaColina`: segundos desde la entrada a la colina hasta el inicio automático de la lluvia final.
- `botonReiniciar`: muestra u oculta el botón opcional de reinicio al final.
- `vibracion`: activa o desactiva la Vibration API.
- `PATRONES`: patrones editables para cada momento háptico:
  `toque`, `micro`, `tic`, `latido`, `latidoLento`, `pulsoDoble`,
  `crescendo`, `rafaga`.

La vibración se ignora automáticamente cuando el navegador no la admite, la
pestaña está oculta, el teléfono está horizontal o está activo
`prefers-reduced-motion`.

## Atajos de prueba

Para entrar directamente a una escena usa `?escena=1`, `?escena=2`,
`?escena=3`, `?escena=4` o `?escena=5`. Este modo inicia también la música
sin esperar el toque inicial y sirve para revisar escenas aisladas. Para la
Vibration API conviene abrir el enlace en Chrome desde un teléfono compatible.

## Problemas o mejoras detectados

- Algunos navegadores de escritorio no reproducen un MP3 local mediante
  `file://`; en GitHub Pages el archivo debe servirse por HTTP(S).
- `navigator.wakeLock` y `navigator.vibrate` dependen del navegador y del
  dispositivo; ambas APIs tienen fallback silencioso.
- `og.jpg` debe ser agregado manualmente en la raíz para que la vista previa de
  WhatsApp y otras plataformas muestre una imagen.
- El audio no puede validarse correctamente con `file://`; pruébalo mediante
  GitHub Pages o un servidor HTTP local.
