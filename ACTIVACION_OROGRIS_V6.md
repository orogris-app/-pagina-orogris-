# OROGRIS V6.0 — Entrega e instrucciones de activación

**Fecha de actualización:** 5 de noviembre de 2026  
**Estado:** diseño y frontend publicado en una **rama de prueba**, sin reemplazar la versión V5 vigente. Los módulos nuevos requieren migración y validación de Supabase.

## Accesos

- Aplicación de pruebas: https://deploy-preview-2--eclectic-hamster-db58dc.netlify.app/
- Panel administrador: https://deploy-preview-2--eclectic-hamster-db58dc.netlify.app/?admin=1
- OROGRIS CARS: https://deploy-preview-2--eclectic-hamster-db58dc.netlify.app/?section=vehiculos
- Ejemplo de ficha de carro (datos ficticios): https://deploy-preview-2--eclectic-hamster-db58dc.netlify.app/?section=vehiculos&demo=1
- Arriendos: https://deploy-preview-2--eclectic-hamster-db58dc.netlify.app/?section=arriendos
- Hipotecas: https://deploy-preview-2--eclectic-hamster-db58dc.netlify.app/?section=hipotecas

## Entregado en código

1. Retiro de botón Importar, sin borrar inmuebles.
2. Secciones y administración de arriendos de días, fines de semana y meses; contratos, pagos y calendario de reservas.
3. Solicitudes pendientes al administrador, apertura de WhatsApp; solo el administrador confirma. Evita confirmar fechas solapadas.
4. OROGRIS CARS: listado con filtros, ficha individual en grafito y dorado, fotografía, marca, versión, año, kilometraje, transmisión, combustible, motor, color, precio y botón de WhatsApp Business.
5. Estadísticas: registros de sesiones y fichas visitadas a partir de activación. No recupera visitas antiguas.
6. Hipotecas: el administrador escribe su texto y lo publica, sin PDF ni recepción de documentos.
7. Canal comercial WhatsApp Business +57 301 590 4303.

## Requisito antes de uso real

**La migración no se ha ejecutado**. Archivo:
`supabase/migrations/20261104_orogris_v6.sql`.

La tabla de inmuebles V5 permanece como estaba. Se agregan tablas **nuevas** para arriendos, reservas, pagos, vehículos, visitas y texto de hipotecas.

### Ruta recomendada

1. Conectar el plugin **Supabase** desde Configuración → Plugins de ChatGPT y autorizar el proyecto correcto de Orogris.
2. Revisar con cuidado el SQL, la autenticación y las políticas RLS; realizar respaldo antes de modificar la base de datos. No introducir datos reales de huéspedes antes de verificar permisos.
3. Ejecutar la migración sobre el proyecto correcto y probar con una cuenta administrativa y una sesión pública anónima.
4. Probar una solicitud de reserva, que aparezca como pendiente, que solo el administrador la confirme y que fechas cruzadas queden rechazadas. Probar también fotografías y fichas de carros, editor de hipotecas y métricas.
5. Solamente después de validar, revisar la solicitud de cambios GitHub #2 y fusionarla con `main` para publicar como versión definitiva.

### Validaciones realizadas

- Sintaxis JavaScript de los archivos principales.
- Pruebas aisladas de fichas de carros, URL individual, HTML escapado y WhatsApp.
- Netlify informó **éxito** del despliegue de vista previa.

### No confirmado aún

- Lectura/escritura real en tablas Supabase V6.
- Seguridad de extremo a extremo con usuarios reales.
- Funcionamiento final en celulares con diferentes versiones de navegador.
- Volumen/costos de tráfico reales (se planea mantener planes gratuitos).

**No confundir “despliegue publicado” con “sistema de reservas en producción”.** La V5 continúa operativa mientras se completa la validación.
