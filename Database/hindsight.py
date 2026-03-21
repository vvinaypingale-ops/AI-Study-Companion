from vector_db import get_similar_memory
from crud import get_weak_topics


def build_prompt(db, user_id, chat_id, user_input):

    # 🔹 Semantic memory
    similar_memory = get_similar_memory(user_id, user_input)

    # 🔹 Weak topics
    weak_topics = get_weak_topics(db, user_id)

    prompt = f"""
You are an AI Study Companion.

User weak topics:
{weak_topics}

Relevant past knowledge:
{similar_memory}

User question:
{user_input}

Instructions:
- If topic is weak → explain simply
- Give examples
- Be clear and short
"""

    return prompt