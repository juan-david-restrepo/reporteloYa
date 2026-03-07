package com.reporteloya.backend.config;

import com.sendgrid.SendGrid;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class SendGridConfig {

    @Value("${spring.sendgrid.api-key}")
    private String apiKey;

    @Bean
    public SendGrid sendGrid() {
        return new SendGrid(apiKey);
    }

}