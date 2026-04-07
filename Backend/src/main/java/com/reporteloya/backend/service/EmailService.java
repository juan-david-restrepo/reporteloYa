package com.reporteloya.backend.service;

import com.sendgrid.*;
import com.sendgrid.helpers.mail.objects.Email;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Personalization;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final SendGrid sendGrid; // Bean de SendGrid que configuraremos

    public void enviarCorreoRecuperacion(String destinatario, String enlace) {
        // Remitente
        Email from = new Email("reporteloy@gmail.com", "RepórteloYa"); // si verificaste gmail

        // Asunto
        String subject = "Recupera tu contraseña - RepórteloYa";

        // Destinatario
        Email to = new Email(destinatario);

        // Contenido HTML
        String contenidoHtml = """
                <div style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
                    <div style="max-width:600px; margin:auto; background:white; padding:30px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <div style="text-align:center; margin-bottom:20px;">
                        <img src="https://res.cloudinary.com/drsvslvlg/image/upload/f_auto,q_auto/LogoNuevo2_cepyj6" alt="Repórtelo Ya" style="width:120px; height:auto; display:block; margin:auto;">
                    </div>
                        <h2 style="color:#2563eb; text-align:center;">Recuperación de contraseña - Repórtelo Ya</h2>
                        <p>Hola,</p>
                        <p>Hemos recibido una solicitud para restablecer la contraseña asociada a su cuenta en Repórtelo Ya.</p>
                        <br>
                        <p>Para continuar con el proceso, haga clic en el siguiente botón:</p>
                        <div style="text-align:center; margin:30px 0;">
                            <a href="%s"
                               style="background-color:#2563eb; color:white; padding:12px 25px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">
                               Restablecer contraseña
                            </a>
                        </div>
                        <p style="font-size:14px; color:#555;">Tenga en cuenta que este enlace expirará en 15 minutos por motivos de seguridad.</p>
                        <hr style="margin:25px 0;">
                        <p style="font-size:12px; color:#888;">Si usted no solicitó este cambio, puede ignorar este mensaje y su contraseña permanecerá sin modificaciones.</p>
                        <br>
                        <p style="font-size:12px; color:#888;">Atentamente,<br>
                        El equipo de Repórtelo Ya</p>
                        <p style="font-size:12px; color:#888;">© 2026 Repórtelo Ya</p>
                    </div>
                </div>
                """.formatted(enlace);

        Content content = new Content("text/html", contenidoHtml);

        // Crear el mail
        com.sendgrid.helpers.mail.Mail mail = new com.sendgrid.helpers.mail.Mail();
        mail.setFrom(from);
        mail.setSubject(subject);
        mail.addContent(content);

        // Personalización (para el destinatario)
        Personalization personalization = new Personalization();
        personalization.addTo(to);
        mail.addPersonalization(personalization);

        // Enviar correo
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sendGrid.api(request);

            if (response.getStatusCode() >= 400) {
                throw new RuntimeException("Error enviando correo: " + response.getBody());
            }
        } catch (IOException ex) {
            throw new RuntimeException("Error enviando correo de recuperación", ex);
        }
    }

    public void enviarCorreoVerificacion(String destinatario, String enlace) {
        Email from = new Email("reporteloy@gmail.com", "RepórteloYa");

        String subject = "Verifica tu correo electrónico - RepórteloYa";

        Email to = new Email(destinatario);

        String contenidoHtml = """
                <div style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
                    <div style="max-width:600px; margin:auto; background:white; padding:30px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <div style="text-align:center; margin-bottom:20px;">
                        <img src="https://res.cloudinary.com/drsvslvlg/image/upload/f_auto,q_auto/LogoNuevo2_cepyj6" alt="Repórtelo Ya" style="width:120px; height:auto; display:block; margin:auto;">
                    </div>
                        <h2 style="color:#2563eb; text-align:center;">Verifica tu correo electrónico</h2>
                        <p>Hola,</p>
                        <p>Gracias por registrarte en Repórtelo Ya. Para completar tu registro, por favor verifica tu correo electrónico haciendo clic en el botón de abajo:</p>
                        <div style="text-align:center; margin:30px 0;">
                            <a href="%s"
                               style="background-color:#2563eb; color:white; padding:12px 25px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">
                               Verificar correo electrónico
                            </a>
                        </div>
                        <p style="font-size:14px; color:#555;">Este enlace expirará en 15 minutos por motivos de seguridad.</p>
                        <hr style="margin:25px 0;">
                        <p style="font-size:12px; color:#888;">Si no creaste una cuenta en Repórtelo Ya, puedes ignorar este mensaje.</p>
                        <br>
                        <p style="font-size:12px; color:#888;">Atentamente,<br>
                        El equipo de Repórtelo Ya</p>
                        <p style="font-size:12px; color:#888;">© 2026 Repórtelo Ya</p>
                    </div>
                </div>
                """.formatted(enlace);

        Content content = new Content("text/html", contenidoHtml);

        com.sendgrid.helpers.mail.Mail mail = new com.sendgrid.helpers.mail.Mail();
        mail.setFrom(from);
        mail.setSubject(subject);
        mail.addContent(content);

        Personalization personalization = new Personalization();
        personalization.addTo(to);
        mail.addPersonalization(personalization);

        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sendGrid.api(request);

            if (response.getStatusCode() >= 400) {
                throw new RuntimeException("Error enviando correo: " + response.getBody());
            }
        } catch (IOException ex) {
            throw new RuntimeException("Error enviando correo de verificación", ex);
        }
    }
}