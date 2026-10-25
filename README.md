# Darleny Aesthetic Studio

Web con menú de servicios, reservas en línea, agenda privada y galería de trabajos.

En línea: https://darleny-aesthetic-studio.netlify.app

## Cómo está armada

- `public/`: la página (`index.html`, `app.mjs`) y los datos del estudio (`datos.mjs`: servicios, precios, duraciones, horario, WhatsApp y datos del banco).
- `netlify/functions/api.mjs`: el servidor. Guarda las citas y las fotos en Netlify Blobs.
- La agenda y la subida de fotos piden la contraseña que pongas en `ADMIN_PASSWORD`.

## Publicar en Netlify

1. En Netlify: **Add new project → Import an existing project → GitHub** y elige `darleny-web`. No hace falta comando de build; la carpeta de publicación ya está en `netlify.toml`.
2. En **Project configuration → Environment variables**, agrega `ADMIN_PASSWORD` con la contraseña de Darleny.
3. Vuelve a publicar (**Deploys → Trigger deploy**) para que tome la contraseña.
4. Cada vez que cambies `ADMIN_PASSWORD`, vuelve a publicar para que el servidor la use.
5. Para entrar a la agenda: toca **Acceso** al final de la página, o abre la web con `#acceso` al final.

## Cambiar precios, horario o datos del banco

Todo está en `public/datos.mjs`. Al guardar el cambio en GitHub, Netlify publica solo.

## Probar en tu computadora

```
npm install
npm run dev        # http://localhost:8888, contraseña "prueba"
```
