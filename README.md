# KCJ — Sistema de Gestión de Cotizaciones

**KCJ** es una plataforma web para la administración de cotizaciones comerciales, diseñada para centralizar la gestión de clientes, servicios, vehículos, tarifas y documentos comerciales.

El sistema busca agilizar la elaboración de cotizaciones, automatizar cálculos y facilitar el seguimiento de las operaciones comerciales mediante una interfaz moderna, intuitiva y adaptable a diferentes dispositivos.

## Tecnologías utilizadas

| Tecnología | Descripción |
|---|---|
| Next.js 16 | Framework principal para el desarrollo web |
| React | Construcción de interfaces de usuario |
| TypeScript | Desarrollo con tipado estático |
| PostgreSQL | Base de datos relacional |
| Prisma ORM 7 | Acceso y administración de datos |
| Tailwind CSS | Diseño de interfaces responsivas |
| Zod | Validación de datos |
| SweetAlert2 | Notificaciones y confirmaciones |
| Lucide React | Iconografía |

## Funcionalidades principales

### Gestión de clientes
- Registro y administración de clientes.
- Información comercial y datos de identificación.
- Búsqueda y actualización de registros.

### Gestión de servicios
- Administración del catálogo de servicios.
- Configuración de tarifas por servicio.
- Asociación de servicios con modelos de vehículos.

### Gestión de vehículos
- Administración de tipos y modelos de vehículos.
- Asociación de vehículos con las tarifas comerciales.

### Gestión de tarifas
- Configuración de precios por servicio.
- Tarifas por unidad de medida y duración.
- Manejo de monedas PEN y USD.

### Gestión de cotizaciones
- Creación y edición de cotizaciones.
- Selección de clientes, servicios y tarifas.
- Cálculo de cantidades, descuentos e IGV.
- Conversión monetaria mediante tipo de cambio.
- Generación de documentos PDF.
- Seguimiento de estados comerciales.
- Generación de enlaces de revisión para clientes.

### Seguridad
- Autenticación de usuarios.
- Control de acceso basado en roles.
- Separación de información por empresa.
- Validación de operaciones en el servidor.

## Requisitos previos

Para ejecutar el proyecto en un entorno local necesitas:

- Node.js compatible con Next.js 16.
- npm.
- PostgreSQL.
- Git.
- Un editor como Visual Studio Code o un IDE compatible con TypeScript.

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/DamianUscapiBaez/kcj.git
cd kcj
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar las variables de entorno

Crea un archivo `.env` en la raíz del proyecto y configura las variables necesarias para la aplicación.

Ejemplo básico:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/kcj"
```

El resto de las variables dependerá de los servicios de autenticación y las integraciones configuradas en el proyecto.

**Importante:** no publiques contraseñas, tokens ni archivos `.env` con credenciales reales.

### 4. Generar el cliente Prisma

```bash
npx prisma generate
```

### 5. Preparar la base de datos

En un entorno de desarrollo, si el repositorio contiene las migraciones necesarias:

```bash
npx prisma migrate dev
```

Si las migraciones no están versionadas, debes