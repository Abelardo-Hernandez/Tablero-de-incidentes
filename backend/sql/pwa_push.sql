CREATE TABLE IF NOT EXISTS push_suscripciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    unidad_negocio_id INT NOT NULL,
    area_id INT NULL,
    endpoint VARCHAR(500) NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    user_agent VARCHAR(500) NULL,
    activo TINYINT NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_push_endpoint (endpoint),
    KEY idx_push_usuario (usuario_id),
    KEY idx_push_unidad_area (unidad_negocio_id, area_id, activo),
    CONSTRAINT fk_push_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_push_unidad
        FOREIGN KEY (unidad_negocio_id)
        REFERENCES unidades_negocio(id),
    CONSTRAINT fk_push_area
        FOREIGN KEY (area_id)
        REFERENCES areas(id)
        ON DELETE SET NULL
);
