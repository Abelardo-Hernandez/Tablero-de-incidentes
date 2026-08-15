-- Ejecutar una sola vez en instalaciones existentes.
USE `tablero_incidentes`;

ALTER TABLE `incidencias`
  MODIFY COLUMN `estado`
  enum('nueva','asignada','en_proceso','pendiente_confirmacion','resuelta','cerrada','cancelada')
  NOT NULL DEFAULT 'nueva';
