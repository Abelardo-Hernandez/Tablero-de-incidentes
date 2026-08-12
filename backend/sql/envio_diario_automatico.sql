CREATE TABLE IF NOT EXISTS config_envio_diario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unidad_negocio_id INT NOT NULL,
    activo TINYINT NOT NULL DEFAULT 0,
    hora_envio TIME NOT NULL DEFAULT '17:00:00',
    fecha_ultimo_envio DATE NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_config_envio_diario_unidad (unidad_negocio_id),
    CONSTRAINT fk_config_envio_diario_unidad
        FOREIGN KEY (unidad_negocio_id)
        REFERENCES unidades_negocio(id)
);

CREATE TABLE IF NOT EXISTS config_envio_diario_destinatarios (
    config_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (config_id, usuario_id),
    KEY idx_envio_diario_destinatario_usuario (usuario_id),
    CONSTRAINT fk_envio_diario_destinatario_config
        FOREIGN KEY (config_id)
        REFERENCES config_envio_diario(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_envio_diario_destinatario_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);
