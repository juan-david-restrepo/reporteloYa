package com.reporteloya.backend.service;

import com.google.cloud.vision.v1.*;
import com.google.protobuf.ByteString;
import com.reporteloya.backend.dto.ImageValidationResult;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ImageValidationService {

    private static final double MIN_SCORE = 0.5;

    public ImageValidationResult validarImagen(MultipartFile file, String tipoInfraccion) {
        ImageValidationResult result = new ImageValidationResult();
        result.setTipoInfraccion(tipoInfraccion);

        try {
            System.out.println("=== INICIANDO VALIDACIÓN DETALLADA ===");
            System.out.println("Tipo de infracción: " + tipoInfraccion);

            InputStream credentialsStream = getClass()
                    .getClassLoader()
                    .getResourceAsStream("google-credentials.json");

            if (credentialsStream == null) {
                System.out.println("ERROR: No se encontró el archivo de credenciales");
                result.setValida(false);
                result.setMotivoRechazo("Error de configuración: no se encontraron credenciales");
                return result;
            }

            ImageAnnotatorSettings settings = ImageAnnotatorSettings.newBuilder()
                    .setCredentialsProvider(() ->
                            com.google.auth.oauth2.ServiceAccountCredentials
                                    .fromStream(credentialsStream))
                    .build();

            try (ImageAnnotatorClient vision = ImageAnnotatorClient.create(settings)) {
                System.out.println("CLIENTE DE VISION CREADO");

                ByteString imgBytes = ByteString.readFrom(file.getInputStream());
                Image img = Image.newBuilder().setContent(imgBytes).build();

                // Ejecutar múltiples features en paralelo
                List<AnnotateImageRequest> requests = new ArrayList<>();

                // LABEL_DETECTION para objetos y contextos
                requests.add(AnnotateImageRequest.newBuilder()
                        .addFeatures(Feature.newBuilder().setType(Feature.Type.LABEL_DETECTION).build())
                        .setImage(img)
                        .build());

                // OBJECT_DETECTION para vehículos específicos
                requests.add(AnnotateImageRequest.newBuilder()
                        .addFeatures(Feature.newBuilder().setType(Feature.Type.OBJECT_LOCALIZATION).build())
                        .setImage(img)
                        .build());

                // TEXT_DETECTION para leer placas
                requests.add(AnnotateImageRequest.newBuilder()
                        .addFeatures(Feature.newBuilder().setType(Feature.Type.TEXT_DETECTION).build())
                        .setImage(img)
                        .build());

                // LOGO_DETECTION para logos de transporte
                requests.add(AnnotateImageRequest.newBuilder()
                        .addFeatures(Feature.newBuilder().setType(Feature.Type.LOGO_DETECTION).build())
                        .setImage(img)
                        .build());

                BatchAnnotateImagesResponse response = vision.batchAnnotateImages(requests);

                // Procesar Labels
                List<EntityAnnotation> labels = response.getResponses(0).getLabelAnnotationsList();
                System.out.println("=== LABELS DETECTADOS ===");
                for (EntityAnnotation label : labels) {
                    String desc = label.getDescription().toLowerCase();
                    float score = label.getScore();
                    System.out.println("  - " + desc + " (score: " + score + ")");
                    result.getLabelsDetectados().add(label.getDescription());

                    if (score > MIN_SCORE) {
                        // Detectar vehículos
                        if (esVehiculo(desc)) {
                            result.setTieneVehiculo(true);
                        }
                        // Detectar carreteras
                        if (esCarretera(desc)) {
                            result.setTieneCarretera(true);
                        }
                        // Detectar motos
                        if (esMoto(desc)) {
                            result.setTieneMoto(true);
                        }
                        // Detectar señales de tránsito
                        if (esSenalTrafico(desc)) {
                            result.setTieneSenalesTrafico(true);
                        }
                        // Detectar semáforo específico
                        if (esSemaforo(desc)) {
                            result.setTieneSemaforo(true);
                        }
                        // Detectar señales verticales/postes
                        if (esSenalVertical(desc)) {
                            result.setTieneSenalVertical(true);
                        }
                        // Detectar parqueadero
                        if (esParqueadero(desc)) {
                            result.setTieneParqueadero(true);
                        }
                    }
                }

                // Procesar Objetos (Object Localization)
                List<LocalizedObjectAnnotation> objects = response.getResponses(1).getLocalizedObjectAnnotationsList();
                System.out.println("=== OBJETOS DETECTADOS ===");
                for (LocalizedObjectAnnotation obj : objects) {
                    String name = obj.getName().toLowerCase();
                    float score = obj.getScore();
                    System.out.println("  - " + name + " (score: " + score + ")");
                    result.getLabelsDetectados().add(obj.getName());

                    if (score > MIN_SCORE) {
                        if (esVehiculo(name)) {
                            result.setTieneVehiculo(true);
                        }
                        if (esMoto(name)) {
                            result.setTieneMoto(true);
                        }
                    }
                }

                // Procesar Texto (placas)
                AnnotateImageResponse textResponse = response.getResponses(2);
                if (textResponse.hasFullTextAnnotation()) {
                    String textoCompleto = textResponse.getFullTextAnnotation().getText();
                    System.out.println("=== TEXTO DETECTADO ===");
                    System.out.println(textoCompleto);

                    // Buscar patrones de placas colombianas
                    List<String> placasEncontradas = buscarPlacasColombia(textoCompleto);
                    if (!placasEncontradas.isEmpty()) {
                        result.setTienePlacaColombia(true);
                        result.setPlacaDetectada(placasEncontradas.get(0));
                        System.out.println("PLACA COLOMBIANA DETECTADA: " + result.getPlacaDetectada());
                    }
                }

                // Procesar Logos
                List<EntityAnnotation> logos = response.getResponses(3).getLogoAnnotationsList();
                System.out.println("=== LOGOS DETECTADOS ===");
                for (EntityAnnotation logo : logos) {
                    System.out.println("  - " + logo.getDescription());
                    result.getLabelsDetectados().add(logo.getDescription());
                }

                // DETERMINAR SI ES VÁLIDA
                boolean esValida = determinarValidez(result);
                result.setValida(esValida);

                if (!esValida) {
                    result.setMotivoRechazo(generarMotivoRechazo(result));
                }

                System.out.println("=== RESULTADO FINAL ===");
                System.out.println("Válida: " + esValida);
                System.out.println("Vehículo: " + result.isTieneVehiculo());
                System.out.println("Placa Colombia: " + result.isTienePlacaColombia());
                System.out.println("Carretera: " + result.isTieneCarretera());
                System.out.println("Moto: " + result.isTieneMoto());
                System.out.println("Motivo rechazo: " + result.getMotivoRechazo());

                return result;
            }

        } catch (Exception e) {
            e.printStackTrace();
            result.setValida(false);
            result.setMotivoRechazo("Error al procesar imagen: " + e.getMessage());
            return result;
        }
    }

    private boolean esVehiculo(String desc) {
        return desc.contains("car") ||
               desc.contains("vehicle") ||
               desc.contains("automobile") ||
               desc.contains("truck") ||
               desc.contains("bus") ||
               desc.contains("taxi") ||
               desc.contains("sedan") ||
               desc.contains("suv") ||
               desc.contains("van") ||
               desc.contains(" pickup");
    }

    private boolean esCarretera(String desc) {
        return desc.contains("road") ||
               desc.contains("highway") ||
               desc.contains("street") ||
               desc.contains("asphalt") ||
               desc.contains("lane") ||
               desc.contains("pavement") ||
               desc.contains("intersection") ||
               desc.contains("crosswalk") ||
               desc.contains("sidewalk") ||
               desc.contains(" curb");
    }

    private boolean esMoto(String desc) {
        return desc.contains("motorcycle") ||
               desc.contains("motorbike") ||
               desc.contains("scooter") ||
               desc.contains("moped") ||
               desc.contains("motor bike") ||
               desc.contains("motocicleta") ||
               desc.contains("motor") ||
               desc.contains("helmet") ||
               desc.contains("rider");
    }

    private boolean esSenalTrafico(String desc) {
        return desc.contains("traffic sign") ||
               desc.contains("traffic light") ||
               desc.contains("stop sign") ||
               desc.contains("speed limit") ||
               desc.contains("traffic") ||
               desc.contains("signage") ||
               desc.contains("signal") ||
               desc.contains("street sign") ||
               desc.contains("road sign") ||
               desc.contains("semaphore");
    }

    private boolean esParqueadero(String desc) {
        return desc.contains("parking") ||
               desc.contains("parking lot") ||
               desc.contains("parking garage") ||
               desc.contains("garage") ||
               desc.contains("parked") ||
               desc.contains("park");
    }

    private boolean esSemaforo(String desc) {
        return desc.contains("traffic light") ||
               desc.contains("semaphore") ||
               desc.contains("traffic signal") ||
               desc.contains("stoplight") ||
               desc.contains("semaforo");
    }

    private boolean esSenalVertical(String desc) {
        return desc.contains("sign") ||
               desc.contains("signpost") ||
               desc.contains("street sign") ||
               desc.contains("road sign") ||
               desc.contains("pole") ||
               desc.contains("traffic sign") ||
               desc.contains("warning sign") ||
               desc.contains("informational sign") ||
               desc.contains("guide sign") ||
               desc.contains("regulatory sign");
    }

    private boolean determinarValidez(ImageValidationResult result) {
        String tipoInfraccion = result.getTipoInfraccion();
        
        // Si es "Semáforo dañado" - solo requiere semáforo o señal vertical
        if (tipoInfraccion != null && tipoInfraccion.toLowerCase().contains("semáforo")) {
            return result.isTieneSenalesTrafico() || result.isTieneSemaforo() || result.isTieneSenalVertical();
        }
        
        // Si es "Otros" - acepta cualquier elemento de tránsito (validación original)
        if (tipoInfraccion != null && tipoInfraccion.toLowerCase().equals("otros")) {
            return result.isTieneVehiculo() ||
                   result.isTienePlacaColombia() ||
                   result.isTieneCarretera() ||
                   result.isTieneMoto() ||
                   result.isTieneSenalesTrafico();
        }
        
        // Para "Accidente", "Vehículo mal estacionado", "Conducción peligrosa"
        // Requieren: vehículo O placa O carretera O moto O señal de tráfico
        return result.isTieneVehiculo() ||
               result.isTienePlacaColombia() ||
               result.isTieneCarretera() ||
               result.isTieneMoto() ||
               result.isTieneSenalesTrafico();
    }

    private List<String> buscarPlacasColombia(String texto) {
        List<String> placas = new ArrayList<>();
        
        // Patrón para placas de carros: 3 letras + 3 números (ABC-123)
        Pattern patronCarro = Pattern.compile("\\b[A-Z]{3}[-\\s]?[A-Z0-9]{3}\\b", Pattern.CASE_INSENSITIVE);
        Matcher matcherCarro = patronCarro.matcher(texto);
        while (matcherCarro.find()) {
            String placa = matcherCarro.group().toUpperCase().replace(" ", "-").replace("-", "-");
            if (esPlacaValidaColombia(placa)) {
                placas.add(placa);
            }
        }

        // Patrón para placas de motos: 3 letras + 3 números o 3 letras + 3 letras (ABC-123 o ABC-DEF)
        Pattern patronMoto = Pattern.compile("\\b([A-Z]{3}[-\\s][A-Z0-9]{3})\\b", Pattern.CASE_INSENSITIVE);
        Matcher matcherMoto = patronMoto.matcher(texto);
        while (matcherMoto.find()) {
            String placa = matcherMoto.group().toUpperCase().replace(" ", "-").replace("-", "-");
            if (esPlacaValidaColombia(placa)) {
                placas.add(placa);
            }
        }

        return placas;
    }

    private boolean esPlacaValidaColombia(String placa) {
        if (placa == null || placa.length() < 6) return false;
        
        String soloCaracteres = placa.replaceAll("[^A-Z0-9]", "");
        
        if (soloCaracteres.length() != 6) return false;
        
        // Primeros 3 caracteres deben ser letras (provincia)
        String letras = soloCaracteres.substring(0, 3);
        if (!letras.matches("[A-Z]{3}")) return false;
        
        // Últimos 3 pueden ser letras o números
        String numeros = soloCaracteres.substring(3);
        
        return true;
    }

    private String generarMotivoRechazo(ImageValidationResult result) {
        StringBuilder mensaje = new StringBuilder();
        String tipoInfraccion = result.getTipoInfraccion();
        boolean esSemaforo = tipoInfraccion != null && tipoInfraccion.toLowerCase().contains("semáforo");
        
        // Construir mensaje basado en el tipo de infracción
        if (esSemaforo) {
            // Mensaje específico para semáforo dañado
            mensaje.append("La imagen no fue aceptada para el tipo 'Semáforo dañado'.\n\n");
            
            if (result.isTieneSemaforo() || result.isTieneSenalVertical() || result.isTieneSenalesTrafico()) {
                mensaje.append("✓ Elementos detectados: ");
                if (result.isTieneSemaforo()) mensaje.append("semáforo, ");
                if (result.isTieneSenalVertical()) mensaje.append("señal vertical, ");
                if (result.isTieneSenalesTrafico()) mensaje.append("señal de tráfico, ");
                mensaje.setLength(mensaje.length() - 2);
                mensaje.append(".\n");
            } else {
                mensaje.append("✗ No se detectó ningún semáforo ni señal de tráfico.\n\n");
                mensaje.append("Para 'Semáforo dañado', sube una foto donde se vea el semáforo (rojo, amarillo, verde) o poste de señal.");
            }
        } else {
            // Mensaje general para otros tipos
            StringBuilder detectados = new StringBuilder();
            StringBuilder faltantes = new StringBuilder();
            
            if (result.isTieneVehiculo()) detectados.append("vehículo, ");
            else faltantes.append("vehículo, ");
            
            if (result.isTienePlacaColombia()) detectados.append("placa colombiana, ");
            else faltantes.append("placa, ");
            
            if (result.isTieneCarretera()) detectados.append("carretera/calle, ");
            else faltantes.append("carretera, ");
            
            if (result.isTieneMoto()) detectados.append("moto, ");
            else faltantes.append("moto, ");
            
            if (result.isTieneSenalesTrafico()) detectados.append("señal de tráfico, ");
            else faltantes.append("señal de tráfico, ");
            
            // Limpiar últimos caracteres
            if (detectados.length() > 0) {
                detectados.setLength(detectados.length() - 2);
            }
            if (faltantes.length() > 0) {
                faltantes.setLength(faltantes.length() - 2);
            }
            
            mensaje.append("La imagen no fue aceptada porque no contiene suficientes elementos de tránsito.\n\n");
            
            if (detectados.length() > 0) {
                mensaje.append("✓ Elementos detectados: ").append(detectados).append(".\n");
            }
            
            mensaje.append("✗ Faltante: ").append(faltantes).append(".\n\n");
            mensaje.append("Por favor, sube una foto donde se vea claramente ");
            
            // Sugerir según lo que falta
            if (!result.isTieneVehiculo() && !result.isTieneMoto() && !result.isTienePlacaColombia()) {
                mensaje.append("el vehículo o la placa del vehículo.");
            } else if (!result.isTieneCarretera()) {
                mensaje.append("la calle o carretera.");
            } else if (!result.isTieneSenalesTrafico()) {
                mensaje.append("la señal de tráfico o el semáforo.");
            } else {
                mensaje.append("al menos un elemento de tránsito (vehículo, placa, carretera, moto o señal).");
            }
        }
        
        return mensaje.toString();
    }

    // Método legacy para compatibilidad
    public boolean esImagenDeTransito(MultipartFile file) {
        ImageValidationResult result = validarImagen(file, null);
        return result.isValida();
    }
}