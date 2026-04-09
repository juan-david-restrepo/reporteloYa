-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: reportelo
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agentes`
--

DROP TABLE IF EXISTS `agentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agentes` (
  `id_usuario` bigint NOT NULL,
  `resumen_profesional1` varchar(40) DEFAULT NULL,
  `resumen_profesional2` varchar(40) DEFAULT NULL,
  `resumen_profesional3` varchar(40) DEFAULT NULL,
  `resumen_profesional4` varchar(40) DEFAULT NULL,
  `foto` varchar(1000) DEFAULT NULL,
  `documento` varchar(255) DEFAULT NULL,
  `estado` varchar(255) DEFAULT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `placa` varchar(255) DEFAULT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  CONSTRAINT `FKj4by0333ukk30wm7k8tdhbss0` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agentes`
--

LOCK TABLES `agentes` WRITE;
/*!40000 ALTER TABLE `agentes` DISABLE KEYS */;
INSERT INTO `agentes` VALUES (2,NULL,NULL,NULL,NULL,NULL,NULL,'disponible','Agente de Tránsito','AT-125','3001234567'),(3,NULL,NULL,NULL,NULL,NULL,NULL,'disponible','Juan David','AT-126','3229801122');
/*!40000 ALTER TABLE `agentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversaciones`
--

DROP TABLE IF EXISTS `conversaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversaciones` (
  `id_conversacion` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint NOT NULL,
  `titulo` varchar(255) DEFAULT NULL,
  `activa` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_conversacion`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `conversaciones_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversaciones`
--

LOCK TABLES `conversaciones` WRITE;
/*!40000 ALTER TABLE `conversaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `conversaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_verification_token`
--

DROP TABLE IF EXISTS `email_verification_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_verification_token` (
  `used` bit(1) NOT NULL,
  `expiration_date` datetime(6) NOT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint NOT NULL,
  `token` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKidu2ippaks8bn6vcsq62khvdu` (`token`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_verification_token`
--

LOCK TABLES `email_verification_token` WRITE;
/*!40000 ALTER TABLE `email_verification_token` DISABLE KEYS */;
INSERT INTO `email_verification_token` VALUES (_binary '','2026-04-07 18:41:21.875253',1,4,'090d2088-c390-445a-9b2c-f751ce071b7b','salgadomateo135@gmail.com'),(_binary '\0','2026-04-07 18:44:00.046816',2,5,'f255e9e4-8d01-437b-afe0-e7e63f017c1e','juanmateosalgado1305@gmail.com'),(_binary '\0','2026-04-07 20:14:42.867053',4,6,'e09f328c-2954-41dc-9e2c-22c40cb91d3b','davyz2006@gmail.com');
/*!40000 ALTER TABLE `email_verification_token` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estadistica_agente`
--

DROP TABLE IF EXISTS `estadistica_agente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estadistica_agente` (
  `anio` int DEFAULT NULL,
  `cantidad` int DEFAULT NULL,
  `dia_semana` int DEFAULT NULL,
  `hora_dia` int DEFAULT NULL,
  `mes` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id_agente` bigint DEFAULT NULL,
  `id_estadistica` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `etiqueta` varchar(255) DEFAULT NULL,
  `periodo` varchar(255) DEFAULT NULL,
  `tipo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_estadistica`),
  KEY `FKy9j8raguea91cll8x51a77j3` (`id_agente`),
  CONSTRAINT `FKy9j8raguea91cll8x51a77j3` FOREIGN KEY (`id_agente`) REFERENCES `agentes` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estadistica_agente`
--

LOCK TABLES `estadistica_agente` WRITE;
/*!40000 ALTER TABLE `estadistica_agente` DISABLE KEYS */;
/*!40000 ALTER TABLE `estadistica_agente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evidencia`
--

DROP TABLE IF EXISTS `evidencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evidencia` (
  `id_evidencia` bigint NOT NULL AUTO_INCREMENT,
  `reporte_id` bigint DEFAULT NULL,
  `archivo` varchar(255) DEFAULT NULL,
  `tipo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_evidencia`),
  KEY `FKh1rvp2ubhcmpws63ay5oo56x4` (`reporte_id`),
  CONSTRAINT `FKh1rvp2ubhcmpws63ay5oo56x4` FOREIGN KEY (`reporte_id`) REFERENCES `reporte` (`id_reporte`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evidencia`
--

LOCK TABLES `evidencia` WRITE;
/*!40000 ALTER TABLE `evidencia` DISABLE KEYS */;
/*!40000 ALTER TABLE `evidencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mensaje_soporte`
--

DROP TABLE IF EXISTS `mensaje_soporte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mensaje_soporte` (
  `es_admin` bit(1) NOT NULL,
  `leido` bit(1) NOT NULL,
  `emisor_id` bigint NOT NULL,
  `fecha_envio` datetime(6) NOT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ticket_id` bigint NOT NULL,
  `contenido` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKkxv4hjjef9v5q13g64ypdh5op` (`emisor_id`),
  KEY `FKqyre50vd69rswy51tksua5ats` (`ticket_id`),
  CONSTRAINT `FKkxv4hjjef9v5q13g64ypdh5op` FOREIGN KEY (`emisor_id`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `FKqyre50vd69rswy51tksua5ats` FOREIGN KEY (`ticket_id`) REFERENCES `ticket_soporte` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mensaje_soporte`
--

LOCK TABLES `mensaje_soporte` WRITE;
/*!40000 ALTER TABLE `mensaje_soporte` DISABLE KEYS */;
/*!40000 ALTER TABLE `mensaje_soporte` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mensajes_ia`
--

DROP TABLE IF EXISTS `mensajes_ia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mensajes_ia` (
  `id_mensaje` bigint NOT NULL AUTO_INCREMENT,
  `id_conversacion` bigint NOT NULL,
  `emisor` enum('usuario','ia') NOT NULL,
  `contenido` text NOT NULL,
  `tokens_usados` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mensaje`),
  KEY `id_conversacion` (`id_conversacion`),
  CONSTRAINT `mensajes_ia_ibfk_1` FOREIGN KEY (`id_conversacion`) REFERENCES `conversaciones` (`id_conversacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mensajes_ia`
--

LOCK TABLES `mensajes_ia` WRITE;
/*!40000 ALTER TABLE `mensajes_ia` DISABLE KEYS */;
/*!40000 ALTER TABLE `mensajes_ia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `leida` bit(1) NOT NULL,
  `agente_id` bigint DEFAULT NULL,
  `fecha_creacion` datetime(6) NOT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `id_referencia` bigint DEFAULT NULL,
  `usuario_id` bigint DEFAULT NULL,
  `tipo` varchar(20) NOT NULL,
  `mensaje` varchar(500) DEFAULT NULL,
  `datos_adicionales` varchar(2000) DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKflnh4uodnqlutseif33scmx0g` (`agente_id`),
  KEY `FK1mxbjb81ft61gwlh0kabubndc` (`usuario_id`),
  CONSTRAINT `FK1mxbjb81ft61gwlh0kabubndc` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `FKflnh4uodnqlutseif33scmx0g` FOREIGN KEY (`agente_id`) REFERENCES `agentes` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_token`
--

DROP TABLE IF EXISTS `password_reset_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_token` (
  `used` bit(1) NOT NULL,
  `expiration_date` datetime(6) NOT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint NOT NULL,
  `token` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKg0guo4k8krgpwuagos61oc06j` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_token`
--

LOCK TABLES `password_reset_token` WRITE;
/*!40000 ALTER TABLE `password_reset_token` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_token` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pregunta_frecuente`
--

DROP TABLE IF EXISTS `pregunta_frecuente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pregunta_frecuente` (
  `respondida` bit(1) NOT NULL,
  `fecha_pregunta` datetime(6) NOT NULL,
  `fecha_respuesta` datetime(6) DEFAULT NULL,
  `id_pregunta` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint DEFAULT NULL,
  `autor` varchar(100) NOT NULL,
  `respondido_por` varchar(100) DEFAULT NULL,
  `pregunta` varchar(300) NOT NULL,
  `respuesta` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id_pregunta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pregunta_frecuente`
--

LOCK TABLES `pregunta_frecuente` WRITE;
/*!40000 ALTER TABLE `pregunta_frecuente` DISABLE KEYS */;
/*!40000 ALTER TABLE `pregunta_frecuente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reporte`
--

DROP TABLE IF EXISTS `reporte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reporte` (
  `acompanado` bit(1) DEFAULT NULL,
  `fecha_incidente` date DEFAULT NULL,
  `hora_incidente` time(6) DEFAULT NULL,
  `latitud` double DEFAULT NULL,
  `longitud` double DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `fecha_aceptado` datetime(6) DEFAULT NULL,
  `fecha_finalizado` datetime(6) DEFAULT NULL,
  `fecha_rechazado` datetime(6) DEFAULT NULL,
  `id_agente` bigint DEFAULT NULL,
  `id_agente_companero` bigint DEFAULT NULL,
  `id_reporte` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `resumen_operativo` varchar(1000) DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `estado` varchar(255) DEFAULT NULL,
  `placa` varchar(255) DEFAULT NULL,
  `tipo_infraccion` varchar(255) DEFAULT NULL,
  `prioridad` enum('ALTA','BAJA','MEDIA') DEFAULT NULL,
  PRIMARY KEY (`id_reporte`),
  KEY `FK7984e2oth1egjl17ec47jlqfh` (`id_agente`),
  KEY `FKpvhr0xsi7f93iuphupptxxg15` (`id_agente_companero`),
  KEY `FKio8d9gliaf8u7iqy73e0j4a8s` (`id_usuario`),
  CONSTRAINT `FK7984e2oth1egjl17ec47jlqfh` FOREIGN KEY (`id_agente`) REFERENCES `agentes` (`id_usuario`),
  CONSTRAINT `FKio8d9gliaf8u7iqy73e0j4a8s` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `FKpvhr0xsi7f93iuphupptxxg15` FOREIGN KEY (`id_agente_companero`) REFERENCES `agentes` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reporte`
--

LOCK TABLES `reporte` WRITE;
/*!40000 ALTER TABLE `reporte` DISABLE KEYS */;
/*!40000 ALTER TABLE `reporte` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tareas`
--

DROP TABLE IF EXISTS `tareas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tareas` (
  `fecha_fin` datetime(6) DEFAULT NULL,
  `fecha_inicio` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `id_agente` bigint DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` varchar(255) DEFAULT NULL,
  `fecha` varchar(255) DEFAULT NULL,
  `hora` varchar(255) DEFAULT NULL,
  `prioridad` varchar(255) DEFAULT NULL,
  `resumen_operativo` varchar(255) DEFAULT NULL,
  `titulo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK2cy0jj38yofvglt2twgwi7edj` (`id_agente`),
  CONSTRAINT `FK2cy0jj38yofvglt2twgwi7edj` FOREIGN KEY (`id_agente`) REFERENCES `agentes` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tareas`
--

LOCK TABLES `tareas` WRITE;
/*!40000 ALTER TABLE `tareas` DISABLE KEYS */;
/*!40000 ALTER TABLE `tareas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_soporte`
--

DROP TABLE IF EXISTS `ticket_soporte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_soporte` (
  `fecha_actualizacion` datetime(6) NOT NULL,
  `fecha_cierre` datetime(6) DEFAULT NULL,
  `fecha_creacion` datetime(6) NOT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint NOT NULL,
  `descripcion` text NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `estado` enum('ABIERTO','CERRADO','EN_PROCESO') NOT NULL,
  `prioridad` enum('ALTA','BAJA','MEDIA') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKl1ir7xsljdp9p3dy3nuf65oe9` (`usuario_id`),
  CONSTRAINT `FKl1ir7xsljdp9p3dy3nuf65oe9` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_soporte`
--

LOCK TABLES `ticket_soporte` WRITE;
/*!40000 ALTER TABLE `ticket_soporte` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket_soporte` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `email_verificado` bit(1) NOT NULL,
  `id_usuario` bigint NOT NULL AUTO_INCREMENT,
  `correo` varchar(255) NOT NULL,
  `nombre_completo` varchar(255) NOT NULL,
  `numero_documento` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `tipo_documento` varchar(255) DEFAULT NULL,
  `role` enum('ADMIN','AGENTE','CIUDADANO') DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `UKcdmw5hxlfj78uf4997i3qyyw5` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (_binary '\0',1,'admin@admin.com','Administrador','0','$2a$10$wSGOABWseSTZqQVjcUNu8eezTN6vigyORQUrVGh./fegjhl/wF0R.','N/A','ADMIN'),(_binary '\0',2,'agente@transito.com','Agente de Tránsito','123456789','$2a$10$C0CR6QyygUaUZAGh1JE6yOREbLavi.QTMRU30kUJrPIL4aN5ItPJq','CC','AGENTE'),(_binary '\0',3,'agente@transito2.com','Juan David','1092456845','$2a$10$P/ATFRjd2JQHnowrmxlyROxTqtTS.GeGp/TYMQLb5icfAVzj9zKkO','CC','AGENTE'),(_binary '',4,'salgadomateo135@gmail.com','juan','1004917596','$2a$10$3CxbnUMZgZlAflXxw2LeU.D/b4UqOzUk1ffnrgn5GZaFubyHNCsEK','CC','CIUDADANO'),(_binary '\0',5,'juanmateosalgado1305@gmail.com','david','1004917588','$2a$10$H2PNqBgqTjOZbMIhpODMoepEYS8iegmr/UEsONGinNmoNbgyNWQqG','CC','CIUDADANO'),(_binary '\0',6,'davyz2006@gmail.com','jose','1092456989','$2a$10$05l/FL02cabOxSFMP6THC.MlKE4XCFVde3pBcBTHnpE3XN1ZgF0E.','CC','CIUDADANO');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `validaciones`
--

DROP TABLE IF EXISTS `validaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `validaciones` (
  `id_validacion` bigint NOT NULL AUTO_INCREMENT,
  `id_reporte` bigint NOT NULL,
  `id_agente` bigint NOT NULL,
  `estado` enum('aprobado','rechazado') NOT NULL,
  `comentario` text,
  `fecha_validacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_validacion`),
  KEY `id_reporte` (`id_reporte`),
  KEY `id_agente` (`id_agente`),
  CONSTRAINT `validaciones_ibfk_1` FOREIGN KEY (`id_reporte`) REFERENCES `reportes` (`id_reporte`) ON DELETE CASCADE,
  CONSTRAINT `validaciones_ibfk_2` FOREIGN KEY (`id_agente`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `validaciones`
--

LOCK TABLES `validaciones` WRITE;
/*!40000 ALTER TABLE `validaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `validaciones` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-08  9:09:49
