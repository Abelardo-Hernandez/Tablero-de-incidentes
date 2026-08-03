const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('../config/db');

async function iniciarSesion(req, res) {
    try {
        const { usuario, password } = req.body;

        if (!usuario || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son obligatorios'
            });
        }

        const [usuarios] = await db.query(
            `
            SELECT
                u.id,
                u.nombre,
                u.usuario,
                u.correo,
                u.password,
                u.rol,
                u.area_id,
                u.linea_id,
                u.es_lider,
                u.activo,
                a.nombre AS area_nombre,
                l.nombre AS linea_nombre
            FROM usuarios u
            LEFT JOIN areas a
                ON a.id = u.area_id
            LEFT JOIN lineas l
                ON l.id = u.linea_id
            WHERE u.usuario = ?
            LIMIT 1
            `,
            [usuario.trim()]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        const usuarioEncontrado = usuarios[0];

        if (!usuarioEncontrado.activo) {
            return res.status(403).json({
                success: false,
                message: 'El usuario se encuentra desactivado'
            });
        }

        const passwordCorrecto = await bcrypt.compare(
            password,
            usuarioEncontrado.password
        );

        if (!passwordCorrecto) {
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        const payload = {
            id: usuarioEncontrado.id,
            nombre: usuarioEncontrado.nombre,
            usuario: usuarioEncontrado.usuario,
            correo: usuarioEncontrado.correo,
            rol: usuarioEncontrado.rol,
            area_id: usuarioEncontrado.area_id,
            linea_id: usuarioEncontrado.linea_id,
            es_lider: Boolean(usuarioEncontrado.es_lider)
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '8h'
            }
        );

        return res.json({
            success: true,
            message: 'Inicio de sesión correcto',
            token,
            data: {
                id: usuarioEncontrado.id,
                nombre: usuarioEncontrado.nombre,
                usuario: usuarioEncontrado.usuario,
                correo: usuarioEncontrado.correo,
                rol: usuarioEncontrado.rol,
                area_id: usuarioEncontrado.area_id,
                area_nombre: usuarioEncontrado.area_nombre,
                linea_id: usuarioEncontrado.linea_id,
                linea_nombre: usuarioEncontrado.linea_nombre,
                es_lider: Boolean(usuarioEncontrado.es_lider)
            }
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible iniciar sesión'
        });
    }
}

async function obtenerSesion(req, res) {
    try {
        const [usuarios] = await db.query(
            `
            SELECT
                u.id,
                u.nombre,
                u.usuario,
                u.correo,
                u.rol,
                u.area_id,
                u.linea_id,
                u.es_lider,
                u.activo,
                a.nombre AS area_nombre,
                l.nombre AS linea_nombre
            FROM usuarios u
            LEFT JOIN areas a
                ON a.id = u.area_id
            LEFT JOIN lineas l
                ON l.id = u.linea_id
            WHERE u.id = ?
            LIMIT 1
            `,
            [req.user.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const usuario = usuarios[0];

        if (!usuario.activo) {
            return res.status(403).json({
                success: false,
                message: 'El usuario está desactivado'
            });
        }

        return res.json({
            success: true,
            data: {
                ...usuario,
                es_lider: Boolean(usuario.es_lider),
                activo: Boolean(usuario.activo)
            }
        });
    } catch (error) {
        console.error('Error al obtener sesión:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener la sesión'
        });
    }
}

module.exports = {
    iniciarSesion,
    obtenerSesion
};
