package com.reporteloya.backend;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.sendgrid.SendGridAutoConfiguration;

@SpringBootApplication(scanBasePackages = "com.reporteloya.backend", exclude = SendGridAutoConfiguration.class)
public class BackendApplication {

    static {
        try {
            Dotenv dotenv = Dotenv.configure().load();
            dotenv.entries().forEach(entry -> {
                System.setProperty(entry.getKey(), entry.getValue());
            });
            System.out.println("[INIT] Variables de entorno cargadas desde .env");
        } catch (Exception e) {
            System.err.println("[INIT] Advertencia: No se pudo cargar .env - " + e.getMessage());
        }
    }

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}