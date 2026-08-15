require('dotenv').config();

const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const escapar = (valor) => db.escape(valor);

async function respaldarSuperAdministrador() {
    try {
        const [usuarios] = await db.query(`
            SELECT nombre, usuario, password, correo, activo
            FROM usuarios
            WHERE rol = 'super_admin'
            ORDER BY activo DESC, id ASC
        `);

        if (usuarios.length === 0) {
            throw new Error('No existe ningún usuario con rol super_admin.');
        }

        const carpeta = path.resolve(__dirname, '../backups');
        const destino = path.join(carpeta, 'respaldo_super_usuario.sql');
        fs.mkdirSync(carpeta, { recursive: true });

        const inserciones = usuarios.map((usuario) => `
INSERT INTO \`usuarios\` (
  \`unidad_negocio_id\`, \`nombre\`, \`usuario\`, \`password\`, \`rol\`,
  \`area_id\`, \`linea_id\`, \`es_lider\`, \`activo\`, \`correo\`
) VALUES (
  @unidad_sistema_id, ${escapar(usuario.nombre)}, ${escapar(usuario.usuario)},
  ${escapar(usuario.password)}, 'super_admin', NULL, NULL, 1,
  ${usuario.activo ? 1 : 0}, ${escapar(usuario.correo)}
)
ON DUPLICATE KEY UPDATE
  \`nombre\` = VALUES(\`nombre\`), \`password\` = VALUES(\`password\`),
  \`rol\` = 'super_admin', \`area_id\` = NULL, \`linea_id\` = NULL,
  \`es_lider\` = 1, \`activo\` = VALUES(\`activo\`), \`correo\` = VALUES(\`correo\`);`).join('\n');

        const contenido = `-- Respaldo exclusivo de superadministrador(es)
-- Generado: ${new Date().toISOString()}
-- Contiene hashes de contraseña: conservar como archivo confidencial.
-- Requiere ejecutar primero sql/esquema_completo.sql.

START TRANSACTION;

INSERT INTO \`unidades_negocio\` (\`nombre\`, \`descripcion\`, \`activo\`)
VALUES ('Administración del sistema', 'Unidad técnica para el superadministrador', 1)
ON DUPLICATE KEY UPDATE \`activo\` = 1;

SET @unidad_sistema_id = (
  SELECT \`id\` FROM \`unidades_negocio\`
  WHERE \`nombre\` = 'Administración del sistema' LIMIT 1
);
${inserciones}

COMMIT;
`;

        fs.writeFileSync(destino, contenido, { encoding: 'utf8', mode: 0o600 });
        console.log(`Respaldo generado: ${destino}`);
        console.log(`Superadministradores incluidos: ${usuarios.length}`);
        console.log('El archivo contiene hashes de contraseña y no debe subirse a Git.');
    } catch (error) {
        console.error(`No fue posible generar el respaldo: ${error.message}`);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

respaldarSuperAdministrador();
