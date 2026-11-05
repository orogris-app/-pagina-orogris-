# OROGRIS V6.0 — Entrega de prueba

**Estado:** desarrollo y despliegue de prueba completados; pendiente de activar base de datos y validar en ambiente real. **No fusionar con main todavía.**

### Implementado
- Eliminación del botón «Importar» del menú.
- Panel de arriendos y administración de contratos, pagos, cartera, calendario y solicitudes de reserva con confirmación manual.
- Secciones públicas de arriendos, vehículos e hipotecas.
- **OROGRIS CARS:** identidad visual premium grafito/dorado diferenciada de la marca inmobiliaria, catálogo con búsqueda/filtros, fichas propias compartibles, galería táctil, año, kilometraje, transmisión, combustible, motor, color, precio y WhatsApp Business 301 590 4303.
- Editor de vehículos con fotos múltiples y ficha técnica desde el panel privado.
- Estadísticas básicas de visitas y fichas consultadas (comienza a medir tras activar tablas).
- **Hipotecas sin PDF ni subida de documentos:** texto que el administrador escribe y publica, con botón a WhatsApp Business.
- Archivos nuevos en public/v6.js y public/v6.css; migración aditiva en supabase/migrations/20261104_orogris_v6.sql.

### Confirmaciones
- Netlify deploy preview: https://deploy-preview-2--eclectic-hamster-db58dc.netlify.app/
- La sintaxis JS base y V6 fue verificada; las fichas de carros pasaron pruebas aisladas de sanitización, enlaces y datos.
- Ninguna modificación en la tabla anterior de inmuebles.

### Pendientes antes de producción
1. Autorizar acceso de Supabase desde ChatGPT (plugin), o ejecutar la migración manualmente en **el proyecto Supabase correcto**, previa revisión de seguridad/RLS.
2. Verificar carga y lectura real de vehículos, arriendos, pagos y solicitudes desde cuentas autorizadas.
3. Probar flujos completos en móvil: recepción de reserva, WhatsApp, confirmación y prevención de solapamientos.
4. Confirmar protección de datos de arrendatarios y visitantes y autenticación.
5. Revisar cuotas gratuitas Netlify/Supabase y publicar main únicamente al verificar el funcionamiento.

**No introducir datos privados de clientes en la vista de prueba.**
