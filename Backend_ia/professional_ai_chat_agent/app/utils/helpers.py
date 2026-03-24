from datetime import datetime
import pytz

def get_current_time(timezone="America/Bogota"):
    tz = pytz.timezone(timezone)
    return datetime.now(tz).isoformat()
