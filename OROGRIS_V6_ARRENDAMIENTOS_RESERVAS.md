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
