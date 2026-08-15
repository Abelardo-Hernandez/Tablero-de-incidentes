const db = require('../config/db');

async function crearNotificacionIncidencia({
    incidenciaId,
    areaId,
    unidadNegocioId,
    usuarioId = null,
    tipo = 'nueva_incidencia',
    titulo,
    mensaje
}) {
    const [destinatarios] = await db.query(
        `
        SELECT id
        FROM usuarios
        WHERE activo = 1
          AND unidad_negocio_id = ?
          AND (area_id = ? OR rol IN ('administrador', 'super_admin'))
        `,
        [unidadNegocioId, areaId]
    );

    const idsUsuarios = usuarioId
        ? [usuarioId]
        : destinatarios.map((usuario) => usuario.id);

    if (idsUsuarios.length === 0) return;

    await db.query(
        `
        INSERT INTO notificaciones (
            usuario_id,
            area_id,
            incidencia_id,
            tipo,
            titulo,
            mensaje
        )
        VALUES ?
        `,
        [
            idsUsuarios.map((id) => [
                id,
                areaId,
                incidenciaId,
                tipo,
                titulo,
                mensaje
            ])
        ]
    );
}

module.exports = {
    crearNotificacionIncidencia
};
