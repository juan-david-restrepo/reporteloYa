from app.core.brain import Brain


class Agent:

    def __init__(self, db):
        self.brain = Brain(db)

    def chat(self, user, message="", conversation_id=None):
        return self.brain.process(
            user=user,
            message=message or "",
            conversation_id=conversation_id
        )