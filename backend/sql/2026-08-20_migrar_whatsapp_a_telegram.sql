-- Sustituye la preparación de WhatsApp por integración con Telegram.
-- Conserva el teléfono capturado como dato de contacto.
USE `tablero_incidentes`;

ALTER TABLE `usuarios`
  DROP INDEX `uq_usuarios_telefono_whatsapp`,
  CHANGE COLUMN `telefono_whatsapp` `telefono_contacto` varchar(20) DEFAULT NULL,
  CHANGE COLUMN `whatsapp_habilitado` `telegram_habilitado` tinyint(1) NOT NULL DEFAULT 0,
  CHANGE COLUMN `whatsapp_verificado_at` `telegram_vinculado_at` datetime DEFAULT NULL,
  ADD COLUMN `telegram_user_id` bigint DEFAULT NULL AFTER `telefono_contacto`,
  ADD COLUMN `telegram_chat_id` bigint DEFAULT NULL AFTER `telegram_user_id`,
  ADD UNIQUE KEY `uq_usuarios_telefono_contacto` (`telefono_contacto`),
  ADD UNIQUE KEY `uq_usuarios_telegram_user` (`telegram_user_id`),
  ADD UNIQUE KEY `uq_usuarios_telegram_chat` (`telegram_chat_id`);

UPDATE `usuarios`
SET `telegram_habilitado` = 0,
    `telegram_vinculado_at` = NULL;

ALTER TABLE `incidencias`
  DROP INDEX `uq_incidencias_whatsapp_message`,
  CHANGE COLUMN `whatsapp_message_id` `telegram_update_id` bigint DEFAULT NULL;

ALTER TABLE `incidencias`
  MODIFY COLUMN `canal_origen` enum('web','telegram') NOT NULL DEFAULT 'web',
  ADD UNIQUE KEY `uq_incidencias_telegram_update` (`telegram_update_id`);

RENAME TABLE
  `whatsapp_conversaciones` TO `telegram_conversaciones`,
  `whatsapp_eventos` TO `telegram_eventos`;

ALTER TABLE `telegram_conversaciones`
  DROP INDEX `uq_whatsapp_conversacion_usuario`,
  DROP INDEX `uq_whatsapp_conversacion_telefono`,
  DROP INDEX `idx_whatsapp_conversacion_expiracion`,
  DROP FOREIGN KEY `fk_whatsapp_conversacion_usuario`,
  CHANGE COLUMN `telefono` `telegram_chat_id` bigint NOT NULL,
  ADD UNIQUE KEY `uq_telegram_conversacion_usuario` (`usuario_id`),
  ADD UNIQUE KEY `uq_telegram_conversacion_chat` (`telegram_chat_id`),
  ADD KEY `idx_telegram_conversacion_expiracion` (`fecha_expiracion`),
  ADD CONSTRAINT `fk_telegram_conversacion_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `telegram_eventos`
  DROP INDEX `uq_whatsapp_evento_message`,
  DROP INDEX `idx_whatsapp_evento_usuario`,
  DROP INDEX `idx_whatsapp_evento_incidencia`,
  DROP INDEX `idx_whatsapp_evento_fecha`,
  DROP FOREIGN KEY `fk_whatsapp_evento_usuario`,
  DROP FOREIGN KEY `fk_whatsapp_evento_incidencia`,
  CHANGE COLUMN `message_id` `telegram_update_id` bigint NOT NULL,
  CHANGE COLUMN `telefono` `telegram_chat_id` bigint DEFAULT NULL,
  ADD UNIQUE KEY `uq_telegram_evento_update` (`telegram_update_id`),
  ADD KEY `idx_telegram_evento_usuario` (`usuario_id`),
  ADD KEY `idx_telegram_evento_incidencia` (`incidencia_id`),
  ADD KEY `idx_telegram_evento_fecha` (`fecha_creacion`),
  ADD CONSTRAINT `fk_telegram_evento_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_telegram_evento_incidencia`
    FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
