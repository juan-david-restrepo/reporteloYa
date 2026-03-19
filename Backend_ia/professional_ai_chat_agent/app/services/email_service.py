import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


class EmailService:

    def __init__(self):
        self.api_key = os.getenv("SENDGRID_API_KEY")
        self.from_email = os.getenv("EMAIL_FROM")

    def send_email(self, to_email: str, subject: str, content: str):

        message = Mail(
            from_email=self.from_email,
            to_emails=to_email,
            subject=subject,
            html_content=content
        )

        try:
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            return {
                "status": "sent",
                "status_code": response.status_code
            }

        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }