package com.reporteloya.backend.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

public class DotenvInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        try {
            Path projectRoot = Paths.get("").toAbsolutePath();
            Dotenv dotenv = Dotenv.configure()
                    .directory(projectRoot.toString())
                    .load();

            Map<String, Object> properties = new HashMap<>();
            
            dotenv.entries().forEach(entry -> {
                String key = entry.getKey();
                String value = entry.getValue();
                properties.put(key, value);
                System.setProperty(key, value);
            });

            applicationContext.getEnvironment()
                    .getPropertySources()
                    .addFirst(new MapPropertySource("dotenv", properties));

            System.out.println("[DOTENV] Variables de entorno cargadas correctamente desde .env");
        } catch (Exception e) {
            System.err.println("[DOTENV] Error al cargar .env: " + e.getMessage());
        }
    }
}
