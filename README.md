# Tablero de Incidentes

Sistema web para registrar, asignar, atender y consultar incidentes operativos por unidad de negocio. Incluye tablero para usuarios, vista TV, histórico, alertas por paro de línea, notificaciones, videos informativos, reportes diarios por correo y administración de catálogos.

## Arquitectura

- **Frontend:** React 19, Vite 8 y Tailwind CSS 4.
- **Backend:** Node.js, Express 5 y API REST.
- **Base de datos:** MySQL 8 con tablas InnoDB y codificación `utf8mb4`.
- **Autenticación:** JWT.
- **Procesos auxiliares:** correo SMTP, Web Push y sincronización de una carpeta local de videos.

El navegador conserva únicamente la sesión necesaria para consumir la API. Los usuarios, catálogos, incidentes, comentarios, historial, configuraciones, notificaciones, videos y destinatarios del reporte diario se almacenan en MySQL.

## Requisitos del equipo servidor

- Node.js 20 LTS o superior y npm.
- MySQL 8.0 o superior.
- Una cuenta de MySQL dedicada para la aplicación.
- Una carpeta legible por el proceso de Node para los videos.
- Opcional: servidor SMTP y claves VAPID para correo y notificaciones push.

Para producción se recomienda asignar una IP fija al servidor, ejecutar el backend como servicio (por ejemplo con PM2, NSSM o systemd) y publicar el frontend mediante Nginx, IIS o Apache.

## Estructura

```text
tablero_incidentes/
├── backend/
│   ├── scripts/             # Utilidades para administrador y VAPID
│   ├── sql/                 # Instalador completo y complementos SQL
│   └── src/                 # API, controladores, rutas y servicios
├── frontend/
│   ├── public/              # PWA y recursos públicos
│   └── src/                 # Aplicación React
└── README.md
```

## Instalación en el nuevo equipo

### 1. Copiar el proyecto

Copie el repositorio sin las carpetas `node_modules`, `frontend/dist` ni los archivos `.env`. Las credenciales deben configurarse directamente en el nuevo servidor.

### 2. Crear la base de datos

El archivo [backend/sql/esquema_completo.sql](backend/sql/esquema_completo.sql) crea la base `tablero_incidentes` y sus 16 tablas, índices y relaciones, sin datos de prueba:

```powershell
mysql -u root -p < backend/sql/esquema_completo.sql
```

Si se utilizará otro nombre de base, cambie las dos primeras instrucciones del archivo y use el mismo nombre en `DB_NAME`.

Es recomendable crear un usuario exclusivo en MySQL y otorgarle permisos solamente sobre esta base:

```sql
CREATE USER 'tablero_app'@'localhost' IDENTIFIED BY 'CAMBIAR_CONTRASENA_SEGURA';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON tablero_incidentes.* TO 'tablero_app'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configurar el backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
```

Edite `backend/.env`:

```dotenv
PORT=3010

DB_HOST=localhost
DB_PORT=3306
DB_USER=tablero_app
DB_PASSWORD=CAMBIAR_CONTRASENA_SEGURA
DB_NAME=tablero_incidentes

JWT_SECRET=GENERAR_UN_SECRETO_LARGO_Y_ALEATORIO
JWT_EXPIRES_IN=8h
APP_TIMEZONE=America/Mexico_City
```

No suba `.env` a Git ni lo incluya en respaldos compartidos. Para generar un secreto JWT en PowerShell puede utilizar:

```powershell
[Convert]::ToHexString((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4. Restaurar únicamente el superadministrador

En el equipo actual, genere el respaldo exclusivo de las cuentas con rol `super_admin`:

```powershell
cd backend
npm run respaldar-super-admin
```

Se genera `backend/backups/respaldo_super_usuario.sql`. Conserva nombre, usuario, correo, estado y hash de contraseña; no exporta unidades operativas, áreas, líneas, turnos, tipos de falla, incidentes, configuraciones ni videos. Para mantener la relación obligatoria de MySQL crea solamente la unidad técnica **Administración del sistema**.

Copie ese archivo por un medio seguro al nuevo equipo y, después de instalar el esquema, impórtelo:

```powershell
mysql -u tablero_app -p tablero_incidentes < backend/backups/respaldo_super_usuario.sql
```

El respaldo está excluido de Git porque contiene el hash de la contraseña. Después del primer acceso, cree desde cero las nuevas unidades y sus catálogos.

### 5. Configurar correo y notificaciones push (opcional)

Para correo complete las variables `SMTP_*` incluidas en `backend/.env.example`. En Gmail debe usarse una contraseña de aplicación, no la contraseña normal de la cuenta.

Para Web Push genere el par de claves y cópielas al `.env`:

```powershell
cd backend
npm run generar-vapid
```

```dotenv
VAPID_SUBJECT=mailto:soporte@empresa.com
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

Sin SMTP o VAPID el sistema principal continúa funcionando; únicamente quedan deshabilitadas esas funciones.

### 6. Configurar y compilar el frontend

`VITE_API_URL` se integra durante la compilación. Debe ser una URL alcanzable desde los equipos cliente, no `localhost` salvo que navegador y backend estén en el mismo equipo.

```powershell
cd frontend
Copy-Item .env.example .env
```

Ejemplo para una red local:

```dotenv
VITE_API_URL=http://192.168.1.50:3010/api
```

Instale y compile:

```powershell
npm install
npm run build
```

Publique el contenido generado en `frontend/dist`. El servidor web debe redirigir las rutas desconocidas a `index.html` para que funcione el enrutamiento de React.

### 7. Iniciar el backend

```powershell
cd backend
npm start
```

La comprobación básica debe responder con JSON:

```powershell
Invoke-RestMethod http://localhost:3010/api
```

En producción no conviene depender de una consola abierta. Configure `npm start` como servicio con reinicio automático y registre stdout/stderr en archivos con rotación.

## Videos de la vista TV

La carpeta se define dentro del sistema en **Configuración > Videos**. Use **Aplicar y validar** para comprobarla y sincronizar el catálogo. El backend necesita permiso de lectura sobre esa ruta.

- La ruta pertenece al equipo donde se ejecuta el backend.
- Si es una carpeta de red, use una ruta UNC (`\\servidor\\videos`) y conceda permisos a la cuenta que ejecuta el servicio.
- Los archivos de video no deben guardarse en Git.
- La vista TV y el dashboard reciben la lista vigente desde la API y reproducen los videos activos en bucle.

## Comandos disponibles

Backend, desde `backend/`:

| Comando | Función |
|---|---|
| `npm run dev` | Ejecuta la API con recarga automática |
| `npm start` | Ejecuta la API en modo normal |
| `npm run respaldar-super-admin` | Exporta únicamente los superadministradores |
| `npm run generar-vapid` | Genera claves Web Push |

Frontend, desde `frontend/`:

| Comando | Función |
|---|---|
| `npm run dev` | Servidor local de desarrollo |
| `npm run lint` | Revisión estática |
| `npm run build` | Compilación de producción |
| `npm run preview` | Vista previa local de la compilación |

## Datos que deben respaldarse

Para este traslado inicial conserve únicamente `backend/backups/respaldo_super_usuario.sql`. No restaure un respaldo completo anterior, pues las unidades, catálogos e incidentes deben comenzar vacíos.

Después de poner en operación el nuevo sistema, un respaldo completo requerirá dos elementos:

1. La base MySQL.
2. La carpeta de videos configurada, si contiene material que no existe en otro almacenamiento.

Ejemplo de respaldo de la base:

```powershell
mysqldump --single-transaction --routines --triggers -u tablero_app -p tablero_incidentes > tablero_incidentes.sql
```

Ejemplo de restauración:

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS tablero_incidentes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u tablero_app -p tablero_incidentes < tablero_incidentes.sql
```

Pruebe periódicamente la restauración en una base separada. Respalde el `.env` en un almacén seguro de secretos, no junto al código.

## Lista de verificación para la migración

- [ ] Node.js y MySQL instalados.
- [ ] Proyecto copiado sin secretos ni dependencias generadas.
- [ ] Base vacía creada con `esquema_completo.sql`.
- [ ] Usuario MySQL de la aplicación creado.
- [ ] `backend/.env` creado y `JWT_SECRET` renovado.
- [ ] Dependencias instaladas en backend y frontend.
- [ ] Respaldo exclusivo del superadministrador generado e importado.
- [ ] `VITE_API_URL` apunta a la IP o dominio del servidor.
- [ ] Frontend recompilado y publicado.
- [ ] Backend instalado como servicio con reinicio automático.
- [ ] Puertos/firewall y CORS validados desde otro equipo.
- [ ] Carpeta de videos configurada y accesible para el servicio.
- [ ] Inicio de sesión, alta de incidente, atención, histórico y vista TV probados.
- [ ] Respaldo automático de MySQL y videos programado.

## Actualizaciones futuras

Antes de actualizar, respalde MySQL y la carpeta de videos. Después:

```powershell
cd backend
npm install

cd ..\frontend
npm install
npm run lint
npm run build
```

Reinicie el servicio del backend y sustituya el contenido publicado del frontend. Si una versión incorpora una migración SQL adicional, ejecútela antes de iniciar el backend nuevo.

## Solución de problemas

- **La API no inicia:** revise `backend/.env`, que MySQL esté activo y que el usuario tenga permisos sobre `DB_NAME`.
- **El frontend intenta conectarse a localhost:** corrija `frontend/.env` y vuelva a ejecutar `npm run build`.
- **La ruta de videos no se encuentra:** confirme que la ruta existe en el servidor y que la cuenta del servicio tiene acceso. Una unidad de red asignada a un usuario interactivo puede no existir para un servicio; prefiera UNC.
- **No llegan correos:** compruebe `SMTP_*`, la contraseña de aplicación y la salida al puerto SMTP.
- **No llegan notificaciones push:** configure VAPID, permita notificaciones en el navegador y use HTTPS fuera de `localhost`.
- **Una ruta del frontend devuelve 404 al recargar:** configure el servidor web para entregar `index.html` como fallback.

## Seguridad operativa

- Use HTTPS al publicar fuera de una red aislada.
- No exponga MySQL directamente a Internet.
- Limite el acceso a los puertos del backend y de MySQL mediante firewall.
- Use contraseñas distintas para MySQL, SMTP y usuarios del sistema.
- Renueve `JWT_SECRET` y las credenciales al cambiar de equipo o responsable.
- Mantenga Node.js, MySQL y las dependencias actualizados después de probar los cambios.
