# OROGRIS V6.0 — Requisitos del módulo de arrendamientos y reservas

Estado: especificación preliminar; no implementado.

## Modalidades
- Arrendamiento tradicional con canon mensual, contrato, vencimientos, pagos y cartera.
- Estadías temporales por días/noches, fines de semana y meses.
- Un mismo inmueble puede aceptar varias modalidades, con disponibilidad compartida y sin publicaciones duplicadas.

## Reservas
- Calendario por inmueble con fechas disponibles, reservadas, ocupadas y bloqueadas.
- Check-in, check-out, huésped/cliente, contacto, precio pactado, anticipo, saldo, estado de pago y observaciones.
- Tarifas configurables por noche, fin de semana, mes y temporada; precio final editable.
- Evitar solapamientos de reservas confirmadas y bloqueos; gestión de cancelaciones y reembolsos.
- Diferenciar reservas pendientes de confirmadas y permitir bloqueo manual por mantenimiento o uso del propietario.
- Vista administrativa privada y publicación pública únicamente cuando esté habilitada.

## Seguridad y costos
- Acceso autenticado para información de huéspedes, arrendatarios y pagos.
- No exponer datos personales en catálogo público.
- Reutilizar GitHub, Netlify y Supabase dentro de cuotas gratuitas disponibles.
- Implementar y probar en rama v6-modulos-comerciales antes de publicar en main.
- Validar requisitos legales aplicables a alojamiento turístico y tratamiento de datos antes de operar reservas públicas.

## Criterios de aceptación
1. Registrar una reserva de viernes a domingo y visualizar fechas bloqueadas.
2. Impedir segunda reserva confirmada en fechas superpuestas.
3. Registrar anticipo y saldo pendiente.
4. Crear arriendo mensual y controlar cobro sin afectar reservas de otras propiedades.
5. Publicar disponibilidad sin mostrar información privada.

## Flujo de solicitud por WhatsApp (decisión del propietario, 2026-11-04)
- El visitante selecciona inmueble, fechas de llegada y salida, nombre y teléfono.
- Al enviar, se crea una solicitud **pendiente** en Supabase y se abre WhatsApp de Orogris (573015904303) con resumen y referencia de la solicitud.
- La solicitud debe guardarse en la base de datos antes de abrir WhatsApp; contemplar fallos de red y evitar solicitudes duplicadas.
- El administrador ve solicitudes pendientes, fechas, inmueble y teléfono para llamar al interesado y negociar.
- Una solicitud pendiente NO bloquea calendario; solo la confirmación manual del administrador bloquea fechas.
- Estados mínimos: pendiente, confirmada, cancelada. Verificar nuevamente disponibilidad al confirmar para impedir solapamientos.
- Nunca marcar como confirmada por el simple clic en WhatsApp ni por el envío del formulario.
- Datos personales protegidos y consentimiento explícito para contacto y tratamiento de datos.
- Mantener costo adicional objetivo de $0, sujeto a cuotas gratuitas.
