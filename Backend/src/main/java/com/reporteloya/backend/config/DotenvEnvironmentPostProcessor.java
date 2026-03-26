package com.reporteloya.backend.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        try {
            Path projectRoot = Paths.get("").toAbsolutePath();
            System.out.println("[DOTENV] Buscando .env en: " + projectRoot.toString());
            
            Dotenv dotenv = Dotenv.configure()
                    .directory(projectRoot.toString())
                    .load();

            Map<String, Object> properties = new HashMap<>();

            dotenv.entries().forEach(entry -> {
                String key = entry.getKey();
                String value = entry.getValue();
                properties.put(key, value);
                System.setProperty(key, value);
                System.out.println("[DOTENV] Cargada variable: " + key + "=" + value);
            });

            environment.getPropertySources()
                    .addFirst(new MapPropertySource("dotenv", properties));

            System.out.println("[DOTENV] Variables de entorno cargadas correctamente desde .env");
        } catch (Exception e) {
            System.err.println("[DOTENV] Error al cargar .env: " + e.getMessage());
            e.printStackTrace();
        }
    }
}