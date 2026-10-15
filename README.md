# Cartel láser

Generador online de **carteles en SVG para corte y grabado láser**: texto con varias tipografías, un emoji opcional (arriba, abajo, a la izquierda o a la derecha del texto) y agujeros de sujeción (a un lado, al otro o a los dos). Todo ocurre en el navegador: no se sube nada a ningún servidor.

## Qué hace

- **Texto** de varias líneas con 16 tipografías incluidas (normal y negrita donde existe).
- **Emoji opcional**: se elige de un selector por categorías o se escribe/pega cualquiera de un solo carácter. Va como dibujo vectorial (fuente Noto Emoji monocroma, trazo fino o grueso) y se coloca arriba, abajo, izquierda o derecha del texto, con tamaño ajustable.
- **Agujeros**: ninguno, izquierda, derecha o los dos lados; con diámetro y distancia al borde configurables.
- **Placa** con esquinas redondeadas; tamaño automático o ancho/alto fijos (si el contenido no cabe, se reduce solo).
- **Colores**: el borde de corte y los agujeros salen en **rojo** por defecto; el texto y el emoji en el color que elijas (negro de partida). También se puede usar un solo color para todo.
- **SVG optimizado para láser**: unidades en milímetros (`width`/`height` en `mm` y `viewBox` en mm), texto y emoji convertidos a trazados (sin `<text>`, no hace falta la letra instalada), sin transformaciones, un grupo `grabado` (relleno) y un grupo `corte` (línea de 0,1 mm) al final, con ids claros (`figura-texto`, `figura-emoji`, `contorno`, `agujeros`).

## Uso

Abre `docs/index.html` desde un servidor estático (por ejemplo `python3 -m http.server -d docs`) o usa la versión publicada en GitHub Pages.

## Tests

```bash
npm install
npm test
```

## Licencias

Letras: Atkinson Hyperlegible, Lexend, Nunito, Comic Neue, Montserrat, Oswald, Playfair Display, Roboto Slab, Bebas Neue, Pacifico, Lobster, Caveat, Permanent Marker, Fredoka y Noto Emoji bajo SIL Open Font License 1.1; DejaVu bajo su licencia libre (Bitstream Vera).

## Estructura

- `docs/svg.js`: maqueta el cartel y genera el SVG.
- `docs/emojis.js`: emojis del selector, por categorías.
- `docs/app.js`: interfaz, vista previa y descarga.
- `docs/fonts/`: letras incluidas.
- `tests/svg.mjs`: pruebas del motor.
