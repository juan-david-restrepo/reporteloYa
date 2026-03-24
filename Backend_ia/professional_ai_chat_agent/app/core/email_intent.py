import re


def detect_email_request(message: str):

    email_pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"

    email_match = re.search(email_pattern, message)

    if not email_match:
        return None

    email = email_match.group()

    if "correo" in message.lower() or "email" in message.lower() or "envia" in message.lower():

        return {
            "to": email
        }

    return None