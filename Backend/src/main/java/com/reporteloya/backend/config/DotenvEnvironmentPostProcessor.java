package com.reporteloya.backend.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String DOTENV_PATH = "C:/Users/Aprendiz/Desktop/ReporteloYa/reporteloYa/Backend";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        try {
            Dotenv dotenv = Dotenv.configure()
                    .ignoreIfMissing()
                    .directory(DOTENV_PATH)
                    .load();

            Map<String, Object> properties = new HashMap<>();

            dotenv.entries().forEach(entry -> {
                String key = entry.getKey();
                String value = entry.getValue();
                properties.put(key, value);
                System.setProperty(key, value);
                System.out.println("[DOTENV] Cargada variable: " + key);
            });

            environment.getPropertySources()
                    .addFirst(new MapPropertySource("dotenv", properties));

            System.out.println("[DOTENV] Variables de entorno cargadas correctamente desde .env");
        } catch (Exception e) {
            System.out.println("[DOTENV] No se pudo cargar .env: " + e.getMessage());
        }
    }
}