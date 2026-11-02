# OROGRIS V5.0 — Buscador y catálogo público

Rama de desarrollo: `v5-buscador-catalogo`. La rama `main` y el sitio actual siguen sin cambios hasta la aprobación y publicación.

## Funciones incluidas
- Encabezado: ORO en gris y GRIS en dorado, con tipografía original.
- Panel privado: recuento automático de inmuebles por tipo (todos los estados).
- Catálogo público: contadores de inmuebles PUBLICADOS, filtros por tipo, municipio, barrio y rango de precios (en millones COP).
- Búsqueda de texto: título, tipo, municipio, barrio, descripción; interpreta frases sencillas con «hasta», «menos de», «entre X y Y» millones.
- WhatsApp comercial: +57 301 590 4303. En fichas de marca, mensaje con título de la propiedad; en catálogo, mensaje general.
- Fichas con marca: «Conoce más propiedades» y vínculo al catálogo.
- Fichas neutrales para asesores: solo ficha individual, sin enlace al catálogo ni datos de contacto de Orogris.
- Mantener galería de imágenes, compartir por WhatsApp Business, estado, enlaces y acceso administrativo.

## Plataformas
- GitHub: https://github.com/orogris-app/-pagina-orogris-
- Netlify: https://eclectic-hamster-db58dc.netlify.app/
- Supabase: fuente de datos / fotografías / autenticación.

## Despliegue seguro
1. No publicar directamente esta rama sin realizar pruebas manuales en móvil y ordenador.
2. Confirmar visualmente el color del encabezado y la vista de clientes.
3. Confirmar que los filtros coinciden con los registros **Publicado**.
4. Probar ficha branded y ficha individual `?p=<id>&v=neutral`; en esta última no debe verse ni marca, ni WhatsApp, ni acceso a más propiedades.
5. Revisar que los enlaces V4.9 y la vista previa de WhatsApp siguen funcionando.
6. Realizar respaldo de los datos antes de fusionar.
7. Aprobar y fusionar a `main` para activar Netlify.

Nota: «buscador inteligente» en esta versión significa filtros y lenguaje sencillo basados en los datos existentes. No implica integración de un modelo de IA externo.

## Seguridad y mantenimiento
No guardar contraseñas, tokens de servicio ni claves privadas en GitHub. El archivo `config.js` solo debe contener la clave pública (publishable). Mantener las políticas RLS de Supabase. Para futura comercialización multiinmobiliaria, habrá que separar por empresa los registros y permisos antes de vender licencias.
