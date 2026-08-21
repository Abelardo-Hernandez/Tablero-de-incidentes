-- Canal de entrada de incidencias mediante WhatsApp Cloud API.
-- Ejecutar una sola vez en instalaciones existentes.
USE `tablero_incidentes`;

ALTER TABLE `usuarios`
  ADD COLUMN `telefono_whatsapp` varchar(20) DEFAULT NULL AFTER `correo`,
  ADD COLUMN `whatsapp_habilitado` tinyint(1) NOT NULL DEFAULT 0 AFTER `telefono_whatsapp`,
  ADD COLUMN `whatsapp_verificado_at` datetime DEFAULT NULL AFTER `whatsapp_habilitado`,
  ADD UNIQUE KEY `uq_usuarios_telefono_whatsapp` (`telefono_whatsapp`);

ALTER TABLE `incidencias`
  ADD COLUMN `canal_origen` enum('web','whatsapp') NOT NULL DEFAULT 'web' AFTER `solucion_aplicada`,
  ADD COLUMN `whatsapp_message_id` varchar(150) DEFAULT NULL AFTER `canal_origen`,
  ADD UNIQUE KEY `uq_incidencias_whatsapp_message` (`whatsapp_message_id`);

CREATE TABLE `whatsapp_conversaciones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `paso` varchar(50) NOT NULL,
  `datos_json` json DEFAULT NULL,
  `fecha_ultimo_mensaje` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_whatsapp_conversacion_usuario` (`usuario_id`),
  UNIQUE KEY `uq_whatsapp_conversacion_telefono` (`telefono`),
  KEY `idx_whatsapp_conversacion_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_whatsapp_conversacion_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `whatsapp_eventos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `message_id` varchar(150) NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `incidencia_id` int DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` enum('entrada','salida') NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `estado` varchar(30) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_whatsapp_evento_message` (`message_id`),
  KEY `idx_whatsapp_evento_usuario` (`usuario_id`),
  KEY `idx_whatsapp_evento_incidencia` (`incidencia_id`),
  KEY `idx_whatsapp_evento_fecha` (`fecha_creacion`),
  CONSTRAINT `fk_whatsapp_evento_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_whatsapp_evento_incidencia`
    FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
