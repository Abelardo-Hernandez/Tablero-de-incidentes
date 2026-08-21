-- Tablero de Incidentes - esquema completo para una instalación nueva
-- MySQL 8.0+. No inserta datos ni elimina tablas existentes.

CREATE DATABASE IF NOT EXISTS `tablero_incidentes`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tablero_incidentes`;

CREATE TABLE IF NOT EXISTS `unidades_negocio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `descripcion` text,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_unidades_negocio_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `areas` (
  `id` int NOT NULL AUTO_INCREMENT, `unidad_negocio_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL, `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1, `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_areas_unidad_nombre` (`unidad_negocio_id`,`nombre`),
  CONSTRAINT `fk_areas_unidad_negocio` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lineas` (
  `id` int NOT NULL AUTO_INCREMENT, `unidad_negocio_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL, `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1, `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_lineas_unidad_nombre` (`unidad_negocio_id`,`nombre`),
  CONSTRAINT `fk_lineas_unidad_negocio` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `turnos` (
  `id` int NOT NULL AUTO_INCREMENT, `unidad_negocio_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL, `hora_inicio` time DEFAULT NULL, `hora_fin` time DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1, `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_turnos_unidad_nombre` (`unidad_negocio_id`,`nombre`),
  CONSTRAINT `fk_turnos_unidad_negocio` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tipos_falla` (
  `id` int NOT NULL AUTO_INCREMENT, `unidad_negocio_id` int NOT NULL,
  `clave` varchar(80) NOT NULL, `nombre` varchar(120) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1, `sistema` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tipos_falla_unidad_clave` (`unidad_negocio_id`,`clave`),
  UNIQUE KEY `uq_tipos_falla_unidad_nombre` (`unidad_negocio_id`,`nombre`),
  CONSTRAINT `fk_tipos_falla_unidad_negocio` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT, `unidad_negocio_id` int NOT NULL,
  `nombre` varchar(150) NOT NULL, `usuario` varchar(100) NOT NULL, `password` varchar(255) NOT NULL,
  `rol` enum('super_admin','administrador','usuario') NOT NULL DEFAULT 'usuario',
  `area_id` int DEFAULT NULL, `linea_id` int DEFAULT NULL, `es_lider` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1, `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `correo` varchar(100) DEFAULT NULL, `telefono_contacto` varchar(20) DEFAULT NULL,
  `telegram_user_id` bigint DEFAULT NULL, `telegram_chat_id` bigint DEFAULT NULL,
  `telegram_habilitado` tinyint(1) NOT NULL DEFAULT 0, `telegram_vinculado_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `usuario` (`usuario`),
  UNIQUE KEY `uq_usuarios_telefono_contacto` (`telefono_contacto`),
  UNIQUE KEY `uq_usuarios_telegram_user` (`telegram_user_id`),
  UNIQUE KEY `uq_usuarios_telegram_chat` (`telegram_chat_id`),
  KEY `fk_usuarios_area` (`area_id`), KEY `fk_usuarios_linea` (`linea_id`),
  KEY `fk_usuarios_unidad_negocio` (`unidad_negocio_id`),
  CONSTRAINT `fk_usuarios_area` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_usuarios_linea` FOREIGN KEY (`linea_id`) REFERENCES `lineas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_usuarios_unidad_negocio` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `incidencias` (
  `id` int NOT NULL AUTO_INCREMENT, `unidad_negocio_id` int NOT NULL,
  `titulo` varchar(200) NOT NULL, `descripcion` text NOT NULL, `tipo` varchar(80) NOT NULL DEFAULT 'otro',
  `prioridad` enum('baja','media','alta','critica') NOT NULL DEFAULT 'media',
  `detuvo_linea` tinyint(1) NOT NULL DEFAULT 0, `cantidad_afectada` int unsigned DEFAULT NULL,
  `estado` enum('nueva','asignada','en_proceso','pendiente_confirmacion','resuelta','cerrada','cancelada') NOT NULL DEFAULT 'nueva',
  `linea_id` int DEFAULT NULL, `turno_id` int DEFAULT NULL, `area_origen_id` int NOT NULL,
  `area_responsable_id` int NOT NULL, `usuario_creador_id` int NOT NULL, `usuario_asignado_id` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP, `fecha_asignacion` datetime DEFAULT NULL,
  `fecha_inicio_atencion` datetime DEFAULT NULL, `fecha_resolucion` datetime DEFAULT NULL,
  `fecha_reanudacion` datetime DEFAULT NULL, `fecha_cierre` datetime DEFAULT NULL,
  `observacion_cierre` text, `causa_raiz` text, `solucion_aplicada` text,
  `canal_origen` enum('web','telegram') NOT NULL DEFAULT 'web',
  `telegram_update_id` bigint DEFAULT NULL, PRIMARY KEY (`id`),
  UNIQUE KEY `uq_incidencias_telegram_update` (`telegram_update_id`),
  KEY `fk_incidencias_linea` (`linea_id`), KEY `fk_incidencias_turno` (`turno_id`),
  KEY `fk_incidencias_area_origen` (`area_origen_id`), KEY `fk_incidencias_area_responsable` (`area_responsable_id`),
  KEY `fk_incidencias_usuario_creador` (`usuario_creador_id`), KEY `fk_incidencias_usuario_asignado` (`usuario_asignado_id`),
  KEY `fk_incidencias_unidad_negocio` (`unidad_negocio_id`),
  CONSTRAINT `fk_incidencias_area_origen` FOREIGN KEY (`area_origen_id`) REFERENCES `areas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_area_responsable` FOREIGN KEY (`area_responsable_id`) REFERENCES `areas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_linea` FOREIGN KEY (`linea_id`) REFERENCES `lineas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_turno` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_unidad_negocio` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`),
  CONSTRAINT `fk_incidencias_usuario_asignado` FOREIGN KEY (`usuario_asignado_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_usuario_creador` FOREIGN KEY (`usuario_creador_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `telegram_conversaciones` (
  `id` bigint NOT NULL AUTO_INCREMENT, `usuario_id` int NOT NULL,
  `telegram_chat_id` bigint NOT NULL, `paso` varchar(50) NOT NULL, `datos_json` json DEFAULT NULL,
  `fecha_ultimo_mensaje` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, `fecha_expiracion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_telegram_conversacion_usuario` (`usuario_id`),
  UNIQUE KEY `uq_telegram_conversacion_chat` (`telegram_chat_id`),
  KEY `idx_telegram_conversacion_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_telegram_conversacion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `telegram_eventos` (
  `id` bigint NOT NULL AUTO_INCREMENT, `telegram_update_id` bigint NOT NULL,
  `usuario_id` int DEFAULT NULL, `incidencia_id` int DEFAULT NULL, `telegram_chat_id` bigint DEFAULT NULL,
  `direccion` enum('entrada','salida') NOT NULL, `tipo` varchar(30) NOT NULL, `estado` varchar(30) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `fecha_actualizacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_telegram_evento_update` (`telegram_update_id`),
  KEY `idx_telegram_evento_usuario` (`usuario_id`), KEY `idx_telegram_evento_incidencia` (`incidencia_id`),
  KEY `idx_telegram_evento_fecha` (`fecha_creacion`),
  CONSTRAINT `fk_telegram_evento_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_telegram_evento_incidencia` FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `telegram_vinculaciones` (
  `id` bigint NOT NULL AUTO_INCREMENT, `usuario_id` int NOT NULL,
  `token_hash` char(64) NOT NULL, `creado_por` int NOT NULL,
  `fecha_expiracion` datetime NOT NULL, `fecha_uso` datetime DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_telegram_vinculacion_usuario` (`usuario_id`),
  UNIQUE KEY `uq_telegram_vinculacion_token` (`token_hash`),
  KEY `idx_telegram_vinculacion_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_telegram_vinculacion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_telegram_vinculacion_creador` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `historial_incidencias` (
  `id` int NOT NULL AUTO_INCREMENT, `incidencia_id` int NOT NULL, `usuario_id` int DEFAULT NULL,
  `accion` enum('creacion','asignacion_area','asignacion_usuario','cambio_estado','cambio_prioridad','reasignacion','comentario','archivo_agregado','resolucion','cierre','reapertura','cancelacion','otro') NOT NULL,
  `campo_modificado` varchar(100) DEFAULT NULL, `valor_anterior` text, `valor_nuevo` text,
  `comentario` text, `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`),
  KEY `idx_historial_incidencia` (`incidencia_id`), KEY `idx_historial_usuario` (`usuario_id`), KEY `idx_historial_fecha` (`fecha_creacion`),
  CONSTRAINT `fk_historial_incidencia` FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_historial_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `comentarios_incidencias` (
  `id` int NOT NULL AUTO_INCREMENT, `incidencia_id` int NOT NULL, `usuario_id` int DEFAULT NULL,
  `comentario` text NOT NULL, `es_interno` tinyint(1) NOT NULL DEFAULT 0, `editado` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `fecha_edicion` datetime DEFAULT NULL, PRIMARY KEY (`id`),
  KEY `idx_comentarios_incidencia` (`incidencia_id`), KEY `idx_comentarios_usuario` (`usuario_id`), KEY `idx_comentarios_fecha` (`fecha_creacion`),
  CONSTRAINT `fk_comentarios_incidencia` FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comentarios_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `adjuntos_incidencias` (
  `id` int NOT NULL AUTO_INCREMENT, `incidencia_id` int NOT NULL, `usuario_id` int DEFAULT NULL,
  `nombre_original` varchar(255) NOT NULL, `nombre_archivo` varchar(255) NOT NULL,
  `ruta_archivo` varchar(500) NOT NULL, `tipo_archivo` varchar(100) DEFAULT NULL,
  `tamano_bytes` bigint unsigned DEFAULT NULL, `descripcion` varchar(255) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`),
  KEY `idx_adjuntos_incidencia` (`incidencia_id`), KEY `idx_adjuntos_usuario` (`usuario_id`),
  CONSTRAINT `fk_adjuntos_incidencia` FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_adjuntos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT, `usuario_id` int DEFAULT NULL, `area_id` int DEFAULT NULL, `incidencia_id` int DEFAULT NULL,
  `tipo` enum('nueva_incidencia','incidencia_asignada','cambio_estado','comentario','alerta_tiempo','incidencia_resuelta','incidencia_cerrada','sistema') NOT NULL DEFAULT 'sistema',
  `titulo` varchar(200) NOT NULL, `mensaje` text NOT NULL, `leida` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_lectura` datetime DEFAULT NULL, `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`),
  KEY `fk_notificaciones_incidencia` (`incidencia_id`), KEY `idx_notificaciones_usuario_leida` (`usuario_id`,`leida`),
  KEY `idx_notificaciones_area_leida` (`area_id`,`leida`), KEY `idx_notificaciones_fecha` (`fecha_creacion`),
  CONSTRAINT `fk_notificaciones_area` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notificaciones_incidencia` FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notificaciones_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_suscripciones` (
  `id` int NOT NULL AUTO_INCREMENT, `usuario_id` int NOT NULL, `unidad_negocio_id` int NOT NULL, `area_id` int DEFAULT NULL,
  `endpoint` varchar(500) NOT NULL, `p256dh` varchar(255) NOT NULL, `auth` varchar(255) NOT NULL,
  `user_agent` varchar(500) DEFAULT NULL, `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_push_endpoint` (`endpoint`), KEY `idx_push_usuario` (`usuario_id`),
  KEY `idx_push_unidad_area` (`unidad_negocio_id`,`area_id`,`activo`), KEY `fk_push_area` (`area_id`),
  CONSTRAINT `fk_push_area` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_push_unidad` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`),
  CONSTRAINT `fk_push_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `configuracion` (
  `id` int NOT NULL AUTO_INCREMENT, `clave` varchar(150) NOT NULL, `valor` text,
  `tipo` enum('texto','numero','booleano','color','archivo','json') NOT NULL DEFAULT 'texto',
  `descripcion` varchar(255) DEFAULT NULL, `categoria` varchar(100) NOT NULL DEFAULT 'general',
  `editable` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `clave` (`clave`), KEY `idx_configuracion_categoria` (`categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `videos` (
  `id` int NOT NULL AUTO_INCREMENT, `unidad_negocio_id` int NOT NULL, `titulo` varchar(200) NOT NULL, `descripcion` varchar(500) DEFAULT NULL,
  `tipo` enum('archivo','youtube','url') NOT NULL DEFAULT 'archivo', `ruta` varchar(500) NOT NULL,
  `duracion_segundos` int unsigned DEFAULT NULL, `orden` int NOT NULL DEFAULT 1, `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_inicio` datetime DEFAULT NULL, `fecha_fin` datetime DEFAULT NULL, `usuario_creador_id` int DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `fk_videos_usuario` (`usuario_creador_id`), KEY `idx_videos_unidad_activo_orden` (`unidad_negocio_id`,`activo`,`orden`),
  KEY `idx_videos_activo_orden` (`activo`,`orden`), KEY `idx_videos_fechas` (`fecha_inicio`,`fecha_fin`),
  CONSTRAINT `fk_videos_usuario` FOREIGN KEY (`usuario_creador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_videos_unidad` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `configuracion_tv_unidad` (
  `id` int NOT NULL AUTO_INCREMENT, `unidad_negocio_id` int NOT NULL,
  `mostrar_videos` tinyint(1) NOT NULL DEFAULT 1, `ruta_videos` varchar(500) DEFAULT NULL,
  `mostrar_cerradas` tinyint(1) NOT NULL DEFAULT 0, `refresco_segundos` int unsigned NOT NULL DEFAULT 30,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_configuracion_tv_unidad` (`unidad_negocio_id`),
  CONSTRAINT `fk_configuracion_tv_unidad` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `config_envio_diario` (
  `id` int NOT NULL AUTO_INCREMENT, `unidad_negocio_id` int NOT NULL, `activo` tinyint NOT NULL DEFAULT 0,
  `hora_envio` time NOT NULL DEFAULT '17:00:00', `fecha_ultimo_envio` date DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_config_envio_diario_unidad` (`unidad_negocio_id`),
  CONSTRAINT `fk_config_envio_diario_unidad` FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `config_envio_diario_destinatarios` (
  `config_id` int NOT NULL, `usuario_id` int NOT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`config_id`,`usuario_id`),
  KEY `idx_envio_diario_destinatario_usuario` (`usuario_id`),
  CONSTRAINT `fk_envio_diario_destinatario_config` FOREIGN KEY (`config_id`) REFERENCES `config_envio_diario` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_envio_diario_destinatario_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `configuracion` (`clave`, `valor`, `tipo`, `categoria`, `editable`) VALUES
  ('nombre_sistema', 'Centro de incidencias', 'texto', 'sistema', 1),
  ('nombre_empresa', 'Confecciones Punto Textil', 'texto', 'sistema', 1),
  ('zona_horaria', 'America/Mexico_City', 'texto', 'sistema', 1),
  ('prioridad_default', 'media', 'texto', 'sistema', 1),
  ('tiempo_primera_respuesta', '15', 'numero', 'sistema', 1),
  ('tiempo_resolucion', '120', 'numero', 'sistema', 1),
  ('notificaciones_pantalla', 'true', 'booleano', 'sistema', 1),
  ('sonido_alertas', 'false', 'booleano', 'sistema', 1),
  ('resumen_diario', 'true', 'booleano', 'sistema', 1)
ON DUPLICATE KEY UPDATE `clave` = VALUES(`clave`);
