CREATE TABLE `telegram_vinculaciones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `token_hash` char(64) NOT NULL,
  `creado_por` int NOT NULL,
  `fecha_expiracion` datetime NOT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_telegram_vinculacion_usuario` (`usuario_id`),
  UNIQUE KEY `uq_telegram_vinculacion_token` (`token_hash`),
  KEY `idx_telegram_vinculacion_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_telegram_vinculacion_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_telegram_vinculacion_creador`
    FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
