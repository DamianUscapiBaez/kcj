# SUMAQ ILLARY — ampliación de CRUD y diseño

## Implementado
- Dashboard renovado, navegación lateral y métricas reales.
- Clientes: alta, listado, búsqueda, edición, desactivación/reactivación.
- Servicios: alta, listado, búsqueda, edición, desactivación/reactivación.
- Vehículos: alta, listado, búsqueda, edición, desactivación/reactivación.
- Tarifas: alta, listado, búsqueda, edición, desactivación/reactivación, validación de servicio y vehículo de la empresa.
- Cotizaciones: creación con múltiples líneas, edición de borradores, estados y trazabilidad, eliminación restringida de borradores, subtotal e IGV recalculados en el servidor.
- Aislamiento multiempresa por `companyId` y roles de escritura.
- `Suspense` y `connection()` para rutas dinámicas de Next.js 16.

## Instalación
1. Haz respaldo del proyecto y de la base de datos.
2. Copia los archivos sobre tu proyecto. **No se incluye `.env` ni credenciales**.
3. Ejecuta `npm install`, `npx prisma generate`, `npm run typecheck`, `npm run dev`.
4. No requiere migración de esquema: utiliza las tablas existentes.
5. Prueba los módulos con usuario de desarrollo y empresa activa.

## Pendiente antes de producción
- PDF formal, verificación pública QR, selección de empresa, paginación de servidor, auditoría más completa, controles de concurrencia adicionales, tests E2E, tasas tributarias según régimen y exportaciones.
- Desactivar un registro no elimina sus referencias históricas. Los borradores eliminados sí se borran permanentemente.
- Las cotizaciones enviadas no pueden editarse; no hay envío real de correo electrónico.
- La numeración usa transacción serializable: ante conflictos simultáneos puede requerir reintento.
- No se han ejecutado pruebas con tu base PostgreSQL real desde este entorno.

## PDF y QR de verificación (nueva implementación)
- Se añadió `GET /api/cotizaciones/[id]/pdf` con sesión obligatoria, aislamiento por membresía de empresa y descarga PDF A4 con detalles, IGV, total y QR.
- El QR contiene un enlace público a `/verificar/[token]`; muestra solo código, empresa, RUC, estado y fechas (no datos del cliente).
- Configura `APP_URL=https://tu-dominio.com` en producción; en local `APP_URL=http://localhost:3000`. **El QR de localhost no se abrirá desde un teléfono externo.**
- Instala dependencias con `npm install` (se añadieron `pdfkit` y `@types/pdfkit`).
- Ejecuta `npx prisma migrate deploy` para asegurarte de que `verification_token` existe; la migración adicional completa tokens faltantes de documentos antiguos.
- En la lista de cotizaciones aparece el enlace **PDF + QR**.
- No es comprobante SUNAT, ni incluye firma digital. La verificación prueba la existencia y el estado actual del registro, no la inmutabilidad del PDF.
- No se ejecutaron pruebas de integración con tu base de datos; verifica importes, saltos de página, roles, QR y permisos antes de producción.
