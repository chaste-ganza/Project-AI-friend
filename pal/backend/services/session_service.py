MAX_TURNS = 10
MAX_MESSAGES = MAX_TURNS * 2

conversation_history = []


# Keeps the in-memory session limited to the last 10 user/PAL turns.
def _trim_history():
    while len(conversation_history) > MAX_MESSAGES:
        conversation_history.pop(0)


# Adds the user's latest transcript to the current in-memory session.
def add_user_turn(text):
    conversation_history.append({"role": "user", "content": text})
    _trim_history()


# Adds PAL's latest reply to the current in-memory session.
def add_pal_turn(text):
    conversation_history.append({"role": "assistant", "content": text})
    _trim_history()


# Returns the full conversation history for the current backend session.
def get_history():
    return conversation_history


# Clears the current in-memory conversation session.
def clear_session():
    conversation_history.clear()
