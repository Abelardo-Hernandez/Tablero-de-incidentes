# Centro de incidencias

Sistema interno para registrar, asignar, atender y consultar incidencias operativas por unidad de negocio. Incluye tablero web, vista TV, historial, reportes diarios por correo, notificaciones, videos por unidad y atención mediante Telegram.

## Componentes

- Frontend: React 19, Vite 8 y Tailwind CSS 4.
- Backend: Node.js, Express 5 y API REST.
- Base de datos: MySQL 8, InnoDB y `utf8mb4`.
- Autenticación: JWT.
- Integraciones opcionales: Telegram Bot, SMTP y Web Push.

El frontend y el backend se ejecutan como procesos diferentes. Esto es correcto: solo debe existir **una instancia del backend**, porque allí se ejecutan Telegram y los programadores automáticos.

## Funciones principales

- Incidencias por unidad, área, línea, turno, tipo y prioridad.
- Asignación, comentarios, solución, confirmación y cierre administrativo.
- Historial completo de cada incidencia.
- Vista TV con videos y preferencias independientes por unidad.
- Resumen diario por correo y formato imprimible.
- Notificaciones en pantalla, navegador y Telegram.
- Telegram privado por colaborador: vinculación, creación de reportes, consulta, toma, comentarios y envío de solución.
- Roles `super_admin`, `administrador` y `usuario`.

## Requisitos para Windows 11

- Windows 11 actualizado.
- Node.js 20 LTS o superior (se recomienda una versión LTS).
- MySQL Server 8.0 y MySQL Workbench.
- Acceso a Internet si se utilizarán Telegram, correo o Web Push.
- IP fija o reservada para el equipo servidor si otros equipos accederán por red.
- Permiso de lectura para las carpetas de videos.

No copie `node_modules`, `frontend/dist`, archivos `.env`, registros `*.log` ni respaldos con credenciales desde el equipo de desarrollo.

## 1. Crear la base de datos

El instalador completo es:

[backend/sql/esquema_completo.sql](backend/sql/esquema_completo.sql)

Contiene la creación de `tablero_incidentes`, sus 20 tablas, relaciones, índices y configuración básica. No contiene usuarios, incidentes ni datos de prueba.

### Con MySQL Workbench

1. Abra MySQL Workbench y conéctese al servidor local.
2. Abra una pestaña SQL nueva.
3. Abra `backend/sql/esquema_completo.sql` o copie todo su contenido.
4. Ejecute el script completo con el botón del rayo.
5. Actualice la sección **Schemas** y confirme que aparezca `tablero_incidentes`.

### Desde PowerShell

```powershell
cd C:\ruta\tablero_incidentes
mysql -u root -p < backend\sql\esquema_completo.sql
```

Se recomienda crear una cuenta exclusiva para la aplicación:

```sql
CREATE USER 'tablero_app'@'localhost'
IDENTIFIED BY 'CAMBIAR_POR_UNA_CONTRASENA_SEGURA';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON tablero_incidentes.* TO 'tablero_app'@'localhost';

FLUSH PRIVILEGES;
```

## 2. Instalar y configurar el backend

```powershell
cd C:\ruta\tablero_incidentes\backend
npm install
Copy-Item .env.example .env
```

Edite `backend/.env`:

```dotenv
PORT=3010

DB_HOST=localhost
DB_PORT=3306
DB_USER=tablero_app
DB_PASSWORD=CAMBIAR_POR_UNA_CONTRASENA_SEGURA
DB_NAME=tablero_incidentes

JWT_SECRET=CAMBIAR_POR_UN_SECRETO_LARGO_Y_ALEATORIO
JWT_EXPIRES_IN=8h
APP_TIMEZONE=America/Mexico_City
```

Puede generar un secreto JWT desde PowerShell:

```powershell
[Convert]::ToHexString((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

No publique ni comparta el archivo `.env`.

## 3. Crear el primer superadministrador

Opcionalmente defina en `backend/.env`:

```dotenv
ADMIN_NOMBRE=Super Administrador
ADMIN_USUARIO=admin
ADMIN_PASSWORD=
```

Si `ADMIN_PASSWORD` queda vacío, el sistema genera una contraseña segura y la muestra una sola vez en la consola.

Ejecute:

```powershell
cd C:\ruta\tablero_incidentes\backend
npm run crear-admin
```

El script crea automáticamente la unidad técnica inicial y un usuario con rol `super_admin`. Guarde la contraseña mostrada y cámbiela después del primer acceso.

## 4. Configurar Telegram (opcional)

Cree el bot con `@BotFather` y agregue al `.env`:

```dotenv
TELEGRAM_BOT_TOKEN=TOKEN_PRIVADO_ENTREGADO_POR_BOTFATHER
TELEGRAM_BOT_USERNAME=nombre_del_bot_sin_arroba
TELEGRAM_POLLING_ENABLED=true
```

El token es una contraseña. No use el mismo token en dos equipos o dos procesos del backend. Telegram por polling requiere Internet, pero no necesita una IP pública ni abrir puertos de entrada.

Después de iniciar el sistema, el administrador genera la liga individual desde **Configuración > Usuarios**.

## 5. Configurar correo y Web Push (opcional)

Complete las variables `SMTP_*` del `.env`. Para Gmail use una contraseña de aplicación.

Para Web Push:

```powershell
cd C:\ruta\tablero_incidentes\backend
npm run generar-vapid
```

Copie el resultado en:

```dotenv
VAPID_SUBJECT=mailto:soporte@empresa.com
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

Sin SMTP o VAPID, el registro y atención de incidencias siguen funcionando.

## 6. Configurar y compilar el frontend

```powershell
cd C:\ruta\tablero_incidentes\frontend
npm install
Copy-Item .env.example .env
```

Si todo funciona en el mismo equipo:

```dotenv
VITE_API_URL=http://localhost:3010/api
```

Si otros equipos entrarán por la red, use la IP del servidor:

```dotenv
VITE_API_URL=http://192.168.1.50:3010/api
```

Compile:

```powershell
npm run lint
npm run build
```

El resultado se crea en `frontend/dist`. La variable `VITE_API_URL` queda incorporada durante la compilación; si cambia, debe volver a ejecutar `npm run build`.

## 7. Ejecutar en el equipo de pruebas

Backend:

```powershell
cd C:\ruta\tablero_incidentes\backend
npm start
```

Frontend para una instalación local pequeña:

```powershell
npm install --global serve
cd C:\ruta\tablero_incidentes\frontend
serve -s dist -l 5173
```

Abra:

```text
http://localhost:5173
```

Desde otro equipo use `http://IP_DEL_SERVIDOR:5173` y permita en Firewall de Windows los puertos TCP `5173` y `3010` solo para la red privada.

Para operación estable, registre ambos comandos como servicios de Windows mediante NSSM o publique `frontend/dist` en IIS. No use `npm run dev` en producción.

Configuración correcta:

```text
1 servicio frontend → sirve frontend/dist
1 servicio backend  → ejecuta npm start y Telegram
```

No ejecute simultáneamente `npm start` y `npm run dev` dentro de `backend`.

## 8. Verificar la instalación

```powershell
cd C:\ruta\tablero_incidentes\backend
npm run verificar-instalacion
```

El comando comprueba variables esenciales, las 20 tablas, el superadministrador y que el frontend esté compilado.

Compruebe también la API:

```powershell
Invoke-RestMethod http://localhost:3010/api
```

## Videos por unidad

Cada unidad tiene configuración independiente:

- Mostrar u ocultar videos.
- Carpeta local o de red propia.
- Mostrar incidencias cerradas.
- Intervalo de actualización de la vista TV.

Un administrador modifica únicamente su unidad; el superadministrador puede seleccionar cualquiera. Para carpetas de red use una ruta UNC, por ejemplo `\\servidor\videos\C2`, y conceda lectura a la cuenta que ejecuta el servicio backend.

## Comandos

Backend:

| Comando | Uso |
|---|---|
| `npm start` | Inicia el backend en modo normal |
| `npm run dev` | Desarrollo con reinicio automático |
| `npm run crear-admin` | Crea el primer superadministrador |
| `npm run verificar-instalacion` | Revisa el equipo instalado |
| `npm run verificar-telegram` | Revisa el esquema de Telegram |
| `npm run generar-vapid` | Genera claves Web Push |
| `npm run respaldar-super-admin` | Respalda los superadministradores |

Frontend:

| Comando | Uso |
|---|---|
| `npm run dev` | Desarrollo local |
| `npm run lint` | Revisión estática |
| `npm run build` | Compilación para operación |
| `npm run preview` | Vista previa de la compilación |

## Lista de comprobación

- [ ] Node.js y MySQL 8 instalados.
- [ ] `esquema_completo.sql` ejecutado sin errores.
- [ ] `backend/.env` creado y protegido.
- [ ] Dependencias instaladas en backend y frontend.
- [ ] Superadministrador creado.
- [ ] `VITE_API_URL` apunta al servidor correcto.
- [ ] Frontend compilado.
- [ ] Solo una instancia del backend activa.
- [ ] Firewall configurado para la red privada.
- [ ] Telegram, SMTP y VAPID configurados si se utilizarán.
- [ ] Carpetas de videos validadas por unidad.
- [ ] Inicio de sesión y flujo de una incidencia probados.
- [ ] Servicios configurados para iniciar con Windows.
- [ ] Respaldo periódico de MySQL configurado.

## Respaldos

Respaldo completo:

```powershell
mysqldump --single-transaction --routines --triggers -u tablero_app -p tablero_incidentes > tablero_incidentes.sql
```

Restauración:

```powershell
mysql -u root -p < backend\sql\esquema_completo.sql
mysql -u tablero_app -p tablero_incidentes < tablero_incidentes.sql
```

Respalde también las carpetas de videos si los archivos no existen en otra ubicación. Guarde el `.env` en un almacén seguro, separado del código y de los respaldos compartidos.

## Problemas comunes

- **Telegram indica conflicto:** hay dos backend usando el mismo token. Deje solo un `src/server.js` activo.
- **El frontend intenta usar localhost desde otro equipo:** cambie `VITE_API_URL` por la IP del servidor y vuelva a compilar.
- **Una ruta web devuelve 404 al actualizar:** el servidor del frontend debe usar fallback a `index.html`; `serve -s` ya lo hace.
- **No se reproducen videos:** revise la ruta de la unidad y los permisos de la cuenta del servicio.
- **La API no inicia:** revise MySQL, `backend/.env` y el puerto `3010`.
- **No llega correo:** revise las variables SMTP, la contraseña de aplicación y la salida a Internet.
- **No llegan avisos Push:** fuera de `localhost`, normalmente se necesita HTTPS.

## Seguridad

- No exponga MySQL a Internet.
- Restrinja los puertos mediante Firewall de Windows.
- Use HTTPS si el sistema sale de una red local confiable.
- No comparta tokens, contraseñas ni archivos `.env`.
- Cambie las credenciales predeterminadas y mantenga Node.js, MySQL y Windows actualizados.
