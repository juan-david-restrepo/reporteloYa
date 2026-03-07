package com.reporteloya.backend.service;

import java.io.File;
import java.io.IOException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;

import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;

@Service
public class FileStorageService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.base-url}")
    private String baseUrl;

    @PostConstruct
    public void init() {
        System.out.println("UPLOAD DIR ES: " + uploadDir);
    }

    private static final List<String> TIPOS_PERMITIDOS = List.of(
            "image/jpeg",
            "image/png",
            "image/webp");

    public String guardarArchivo(MultipartFile file, Long reporteId) throws IOException {

        if (file.isEmpty()) {
            throw new RuntimeException("Archivo vacío");
        }

        if (!TIPOS_PERMITIDOS.contains(file.getContentType())) {
            throw new RuntimeException("Tipo de archivo no permitido");
        }

        // 🔥 Construcción segura de ruta
        File carpetaReporte = new File(uploadDir, String.valueOf(reporteId));

        if (!carpetaReporte.exists()) {
            boolean creada = carpetaReporte.mkdirs();
            if (!creada) {
                throw new IOException("No se pudo crear la carpeta del reporte");
            }
        }

        String original = Objects.requireNonNull(file.getOriginalFilename());
        String extension = original.substring(original.lastIndexOf("."));

        String nombreSeguro = UUID.randomUUID() + extension;

        File destino = new File(carpetaReporte, nombreSeguro);

        file.transferTo(destino);

        return baseUrl + "/uploads/" + reporteId + "/" + nombreSeguro;
    }

}
