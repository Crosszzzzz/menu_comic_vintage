# Botana — carta 3D y AR

Carta de café de barrio: 9 productos en 2 secciones. Cada tarjeta abre una ficha con ingredientes, alérgenos, precio y un visor 3D; en un móvil compatible el producto se puede colocar sobre la mesa con realidad aumentada.

Los 9 productos son modelos escaneados, comprimidos para teléfono. No hay ilustraciones de relleno: la portada de cada tarjeta es un render del mismo GLB que se abre en 3D, así que lo que se ve es lo que se va a girar.

## Estructura

| Archivo | Responsabilidad |
| --- | --- |
| `src/data/dish.ts` | Tipos `Dish`, `DishViewer` y las claves de `ProductArt`. |
| `src/data/menu.ts` | Nombre del local, moneda, categorías, orden de la carta y helpers. |
| `src/data/dishes/<producto>.json` | Manifiesto de cada producto: textos, precio, tamaño real, rutas GLB/USDZ. |
| `src/App.tsx` | Composición de la página, filtro de categorías y ficha abierta. |
| `src/components/product-card.tsx` | Tarjeta: un solo botón, toda la tarjeta es el objetivo. |
| `src/components/product-sheet.tsx` | Ficha en diálogo (visor 3D o ficha estática). |
| `src/components/product-viewer.tsx` | `model-viewer`: carga diferida, órbita, AR, reintento y capas opcionales. |
| `src/components/product-info.tsx` | Precio, ingredientes, alérgenos, tamaño real y acciones. |
| `scripts/build-desserts.mjs` | Comprime los escaneos y genera GLB, USDZ y portada. |
| `scripts/desserts.json` | Qué escaneo se publica, con qué tamaño real y presupuesto de triángulos. |

## Carta actual

| Producto | Sección | Tamaño real | GLB | USDZ |
| --- | --- | --- | --- | --- |
| Capuchino | Cafés | 12 × 12 cm, 5.1 cm alto | 0.7 MB | 3.4 MB |
| Americano | Cafés | 10 × 8.6 cm, 8.1 cm alto | 0.6 MB | 2.6 MB |
| Café pasado | Cafés | 13 × 10.5 cm, 5.1 cm alto | 0.5 MB | 1.6 MB |
| Pay de manzana | Postres | 11 × 9.1 cm, 4.3 cm alto | 0.9 MB | 3.9 MB |
| Croissant de mantequilla | Postres | 12 × 5 cm, 4.5 cm alto | 0.9 MB | 4.0 MB |
| Cheesecake de mango | Postres | 10 × 5.4 cm, 3.6 cm alto | 0.6 MB | 3.6 MB |
| Torta princesa | Postres | 9 × 5.1 cm, 6.2 cm alto | 0.7 MB | 4.0 MB |
| Cheesecake de caramelo | Postres | 10 × 6 cm, 3.7 cm alto | 0.5 MB | 2.5 MB |
| Profiterol de vainilla | Postres | 8 × 8 cm, 6.1 cm alto | 0.8 MB | 4.1 MB |

Los escaneos originales pesaban 223 MB en total; los GLB publicados suman 6.2 MB. Cada modelo se descarga recién cuando se abre su ficha.

## Compresión y tamaño real

```sh
pnpm assets:desserts          # los 9
node scripts/build-desserts.mjs capuchino   # solo uno
```

El script parte de `public/models/postres/<archivo>.glb` y, para cada entrada de `scripts/desserts.json`:

1. Convierte el material a estándar. Los escaneos vienen como `KHR_materials_pbrSpecularGlossiness` o `KHR_materials_unlit`: model-viewer no renderiza spec/gloss (se ve todo blanco) y Quick Look no exporta materiales unlit a USDZ. El mapa difuso pasa a color base, sin metallic.
2. Reduce texturas a 1024 px (JPEG, o PNG si el mapa usa alfa) y simplifica la malla a ~20–24k triángulos con meshoptimizer.
3. Recentra el modelo en X/Z, lo apoya en Y = 0 y lo escala a su tamaño real en metros. Así AR lo coloca a escala real y el visor lo enmarca igual en Android y en iOS.
4. Captura la portada desde el visor (fondo transparente) y genera el USDZ **desde ese mismo GLB escalado**, para que iOS y Android muestren el mismo producto con el mismo tamaño.

El tamaño real se define en `scripts/desserts.json` (`widthCm`, lado horizontal mayor). Si cambia el modelo, se vuelve a correr y se actualiza `dimensions` en el manifiesto.

## Añadir o reemplazar un producto

1. Copiá el GLB del escaneo a `public/models/postres/`.
2. Agregá una entrada a `scripts/desserts.json` con `source`, `slug` (id del producto), `widthCm` y `tris`.
3. Ejecutá `node scripts/build-desserts.mjs <slug>`. Genera `public/models/<slug>/model.glb`, `model.usdz` y `public/images/<slug>.webp`.
4. Creá `src/data/dishes/<slug>.json` copiando un manifiesto existente y ajustá nombre, categoría, descripción, ingredientes, precio, alérgenos y `dimensions` con los cm que imprime el script.
5. Importalo en `src/data/menu.ts`, agregalo a `dishes` y, si es una sección nueva, a `categories`.

No hay que tocar componentes: el sello `badge`, el filtro, el CTA de AR y el tamaño se derivan del manifiesto.

### Contrato del visor

`viewer.animation`, `viewer.ingredients`, `viewer.camera` y `viewer.labels.explode` son opcionales. Un producto de una sola malla no muestra el botón de despiece ni la pista de ingredientes. Si un manifiesto declara `animation`, el visor exige que el GLB traiga ese clip y falla de forma visible si no está.

`viewer.camera` describe el encuadre; si se omite, model-viewer encuadra solo. Cuando se declara, `camera` y `animation` pertenecen a la geometría exportada: cambiarlos sin reexportar el modelo rompe el encuadre o el despiece.

`scripts/verify-dish-config.mjs` valida los 9 manifiestos (rutas existentes, dimensiones, USDZ, textos) y el contrato de capas con un fixture.

## Realidad aumentada

`canActivateAR` decide si aparece «Ver en mi mesa». Requiere móvil compatible, Safari en iPhone o Chrome en Android, y contexto seguro (HTTPS o `localhost`). La escala es fija (`ar-scale="fixed"`) y usa los metros del GLB/USDZ. Si no hay soporte se muestra una nota en lugar de un botón muerto.

Para probar desde el celular en la red local hace falta HTTPS: el servidor de desarrollo usa HTTP y AR no se activa. La verificación real se hace en el deploy.

## Desarrollo y comprobaciones

```sh
pnpm install --frozen-lockfile
pnpm dev          # http://127.0.0.1:5173
pnpm build
pnpm check:ui     # manifiestos + interacciones y capas
pnpm check:hover  # hover de ingredientes (fixture con capas)
pnpm check:menu   # responsive, carga diferida, tamaño, foco, reintento
```

Las pruebas de navegador necesitan Chrome y el servidor local. En Windows:

```sh
$env:CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
pnpm check:menu
```

La carta que se publica son nueve postres de una sola malla, así que las pruebas de despiece e ingredientes inyectan `test-assets/layered-dish.json` y `test-assets/assembly.glb`: el visor conserva esa capacidad sin publicar un segundo modelo.

## Escaneos y modelos por capas

El flujo Blender sigue disponible para productos que necesiten despiece. Cada plato con capas usa dos configuraciones: el manifiesto en `src/data/dishes/` y una receta en `scripts/recipes/` (escaneo de referencia, guías anatómicas, texturas de interior, desplazamientos y exportación).

```sh
uv run --with mcp python scripts/blender-mcp-client.py --script scripts/mcp-build-reference-dish.py --recipe scripts/recipes/egg-tomato-seams.json
node scripts/build-dish.mjs scripts/recipes/egg-tomato-seams.json
```

Requiere `uv`, el paquete `mcp`, el servidor `blender-mcp` y Blender abierto con el complemento activo en `localhost:9876`. Los pasos y decisiones de reconstrucción de interiores están documentados en `scripts/recipes/` y en el historial del proyecto.

## Despliegue

El proyecto está vinculado a Vercel en `.vercel/project.json`. Los escaneos originales (`public/models/postres/`, `v2/`, `v3/`, `v4/`, ZIP) y `test-assets/` quedan fuera del deploy; solo viajan los `public/models/<producto>/` comprimidos y las portadas. La colocación AR física solo se comprueba en un dispositivo compatible: los controles de la web no se trasladan a las aplicaciones nativas de AR.
