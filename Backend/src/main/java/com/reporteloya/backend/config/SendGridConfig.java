package com.reporteloya.backend.config;

import com.sendgrid.SendGrid;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SendGridConfig {

    @Bean
    public SendGrid sendGrid() {
        Dotenv dotenv = Dotenv.configure().load();
        String apiKey = dotenv.get("SENDGRID_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("SENDGRID_API_KEY no configurada en el archivo .env");
        }
        return new SendGrid(apiKey);
    }

    @Bean
    public String sendgridFromEmail() {
        Dotenv dotenv = Dotenv.configure().load();
        return dotenv.get("SENDGRID_FROM_EMAIL", "reporteloyaa@gmail.com");
    }

    @Bean
    public String sendgridFromName() {
        return "RepórteloYa";
    }

}