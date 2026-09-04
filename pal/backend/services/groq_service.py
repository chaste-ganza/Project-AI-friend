import os

import groq

PAL_SYSTEM_PROMPT = """You are PAL, a warm but direct AI speech coach. You observe the user's speech and give honest, helpful feedback. Your personality: you are calm, encouraging but never fake, occasionally dry-humoured, and always specific — you never say "great job" without saying exactly what was great. You respond in 1 to 2 sentences maximum. You never lecture. If the user is rambling, you gently interrupt. If they are doing well, you say so briefly. You are their coach, not their friend — you want them to improve, not feel comfortable staying the same."""

# Client is created lazily so that load_dotenv() in main.py always runs first.
_client: groq.AsyncGroq | None = None


def get_client() -> groq.AsyncGroq:
    global _client
    if _client is None:
        _client = groq.AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


# Builds messages as system prompt, previous history, then the latest user transcript.
async def get_pal_response(transcript: str, history: list) -> str:
    # History items are dicts shaped like {"role": "user" | "assistant", "content": text}.
    messages = [
        {"role": "system", "content": PAL_SYSTEM_PROMPT},
        *history,
        {"role": "user", "content": transcript},
    ]

    try:
        response = await get_client().chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,
            max_tokens=150,
            temperature=0.7,
        )
        reply = response.choices[0].message.content.strip()
        print(f"PAL reply: {reply}")
        return reply
    except Exception as error:
        print(f"Groq error: {error}")
        return "I didn't catch that — try again."
