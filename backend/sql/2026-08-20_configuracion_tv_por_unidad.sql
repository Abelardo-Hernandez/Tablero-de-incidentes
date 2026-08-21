CREATE TABLE `configuracion_tv_unidad` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unidad_negocio_id` int NOT NULL,
  `mostrar_videos` tinyint(1) NOT NULL DEFAULT 1,
  `ruta_videos` varchar(500) DEFAULT NULL,
  `mostrar_cerradas` tinyint(1) NOT NULL DEFAULT 0,
  `refresco_segundos` int unsigned NOT NULL DEFAULT 30,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_configuracion_tv_unidad` (`unidad_negocio_id`),
  CONSTRAINT `fk_configuracion_tv_unidad`
    FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `configuracion_tv_unidad` (
  `unidad_negocio_id`, `mostrar_videos`, `ruta_videos`,
  `mostrar_cerradas`, `refresco_segundos`
)
SELECT
  un.id,
  COALESCE((SELECT valor IN ('true', '1') FROM configuracion WHERE clave = 'mostrar_videos_tv'), 1),
  NULLIF((SELECT valor FROM configuracion WHERE clave = 'ruta_videos'), ''),
  COALESCE((SELECT valor IN ('true', '1') FROM configuracion WHERE clave = 'mostrar_cerradas_tv'), 0),
  COALESCE((SELECT CAST(valor AS UNSIGNED) FROM configuracion WHERE clave = 'actualizacion_tablero_segundos'), 30)
FROM unidades_negocio un;

ALTER TABLE `videos`
  ADD COLUMN `unidad_negocio_id` int DEFAULT NULL AFTER `id`,
  ADD KEY `idx_videos_unidad_activo_orden` (`unidad_negocio_id`, `activo`, `orden`),
  ADD CONSTRAINT `fk_videos_unidad`
    FOREIGN KEY (`unidad_negocio_id`) REFERENCES `unidades_negocio` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE videos
SET unidad_negocio_id = (SELECT MIN(id) FROM unidades_negocio)
WHERE unidad_negocio_id IS NULL;

ALTER TABLE `videos`
  MODIFY COLUMN `unidad_negocio_id` int NOT NULL;
