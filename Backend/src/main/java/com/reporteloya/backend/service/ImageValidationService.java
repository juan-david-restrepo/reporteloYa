package com.reporteloya.backend.service;

import com.google.cloud.vision.v1.*;
import com.google.protobuf.ByteString;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;

@Service
public class ImageValidationService {

    public boolean esImagenDeTransito(MultipartFile file) {

        try {

            System.out.println("=== INICIANDO VALIDACIÓN ===");

            // 🔐 Cargar credenciales desde resources
            InputStream credentialsStream = getClass()
                    .getClassLoader()
                    .getResourceAsStream("google-credentials.json");

            if (credentialsStream == null) {
                System.out.println("❌ NO SE ENCONTRÓ EL ARCHIVO DE CREDENCIALES");
                return false;
            }

            ImageAnnotatorSettings settings = ImageAnnotatorSettings.newBuilder()
                    .setCredentialsProvider(() ->
                            com.google.auth.oauth2.ServiceAccountCredentials
                                    .fromStream(credentialsStream))
                    .build();

            try (ImageAnnotatorClient vision =
                         ImageAnnotatorClient.create(settings)) {

                System.out.println("✅ CLIENTE DE VISION CREADO");

                ByteString imgBytes =
                        ByteString.readFrom(file.getInputStream());

                Image img = Image.newBuilder()
                        .setContent(imgBytes)
                        .build();

                Feature feat = Feature.newBuilder()
                        .setType(Feature.Type.LABEL_DETECTION)
                        .build();

                AnnotateImageRequest request =
                        AnnotateImageRequest.newBuilder()
                                .addFeatures(feat)
                                .setImage(img)
                                .build();

                BatchAnnotateImagesResponse response =
                        vision.batchAnnotateImages(List.of(request));

                List<EntityAnnotation> labels =
                        response.getResponses(0).getLabelAnnotationsList();

                System.out.println("📌 LABELS DETECTADOS:");

                for (EntityAnnotation label : labels) {

                    String descripcion = label.getDescription().toLowerCase();
                    float score = label.getScore();

                    System.out.println("LABEL: " + descripcion + " | SCORE: " + score);

                    // 🎯 Palabras clave de tránsito
                    if (score > 0.6 &&
                            (descripcion.contains("car") ||
                             descripcion.contains("vehicle") ||
                             descripcion.contains("road") ||
                             descripcion.contains("traffic") ||
                             descripcion.contains("street") ||
                             descripcion.contains("transport"))) {

                        System.out.println("✅ IMAGEN RELACIONADA CON TRÁNSITO");
                        return true;
                    }
                }

                System.out.println("❌ NO SE DETECTÓ CONTENIDO DE TRÁNSITO");
                return false;
            }

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}