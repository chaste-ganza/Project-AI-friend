import os
import re
from collections.abc import AsyncGenerator

import groq

PAL_SYSTEM_PROMPT = """You are PAL, a warm but direct AI speech coach. You observe the user's speech and give honest, helpful feedback. Your personality: you are calm, encouraging but never fake, occasionally dry-humoured, and always specific — you never say "great job" without saying exactly what was great. You respond in 1 to 2 sentences maximum. You never lecture. If the user is rambling, you gently interrupt. If they are doing well, you say so briefly. You are their coach, not their friend — you want them to improve, not feel comfortable staying the same."""

# Sentence boundary: ., !, or ? followed by whitespace or end-of-string.
# Deliberately simple — no abbreviation handling for v1.
_SENTENCE_END = re.compile(r'(?<=[.!?])\s+|(?<=[.!?])$')

# Client is created lazily so that load_dotenv() in main.py always runs first.
_client: groq.AsyncGroq | None = None


def get_client() -> groq.AsyncGroq:
    global _client
    if _client is None:
        _client = groq.AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


def _build_messages(transcript: str, history: list) -> list:
    # History items are dicts shaped like {"role": "user" | "assistant", "content": text}.
    return [
        {"role": "system", "content": PAL_SYSTEM_PROMPT},
        *history,
        {"role": "user", "content": transcript},
    ]


# Non-streaming path — kept for /respond rollback endpoint.
async def get_pal_response(transcript: str, history: list) -> str:
    try:
        response = await get_client().chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=_build_messages(transcript, history),
            max_tokens=150,
            temperature=0.7,
        )
        reply = response.choices[0].message.content.strip()
        print(f"PAL reply: {reply}")
        return reply
    except Exception as error:
        print(f"Groq error: {error}")
        return "I didn't catch that — try again."


# Streaming path — yields complete sentences as they are assembled from tokens.
# Each yielded value is a stripped sentence string.
# The final yield is always the full assembled reply (so callers can store it).
async def stream_pal_sentences(
    transcript: str, history: list
) -> AsyncGenerator[tuple[str, bool], None]:
    """Yields (sentence, is_final_full_reply) tuples.

    Normal sentence yields: (sentence_text, False)
    Final yield after stream ends: (full_reply_text, True)
    """
    messages = _build_messages(transcript, history)
    buffer = ""
    full_reply = ""

    try:
        stream = await get_client().chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,
            max_tokens=150,
            temperature=0.7,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta is None:
                continue

            buffer += delta
            full_reply += delta

            # Emit every complete sentence found in the buffer so far.
            parts = _SENTENCE_END.split(buffer)
            # parts[-1] is the incomplete tail (may be empty string at true end).
            for sentence in parts[:-1]:
                sentence = sentence.strip()
                if sentence:
                    yield sentence, False
            buffer = parts[-1]

        # Flush any remaining text that didn't end with punctuation.
        remainder = buffer.strip()
        if remainder:
            yield remainder, False

        # Final yield delivers the full assembled reply for session storage.
        yield full_reply.strip(), True

    except Exception as error:
        print(f"Groq streaming error: {error}")
        fallback = "I didn't catch that — try again."
        yield fallback, False
        yield fallback, True
