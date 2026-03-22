from vector_db import get_similar_memory
from crud import get_weak_topics


def build_prompt(db, user_id, chat_id, user_input):

    similar_memory = get_similar_memory(user_id, user_input)

   
    weak_topics = get_weak_topics(db, user_id)

    weak_topics_str = ", ".join(weak_topics) if weak_topics else "None"

   
    memory_text = "\n".join(similar_memory[:3]) if similar_memory else "No relevant past memory"

    prompt = f"""
You are an AI Study Companion helping a student learn effectively.

User Weak Topics:
{weak_topics_str}

Relevant Past Context:
{memory_text}

User Question:
{user_input}

Instructions:
- If the question relates to weak topics, explain in a very simple way
- Use step-by-step explanations
- Give 1–2 clear examples
- Keep answers concise but helpful
- Avoid unnecessary complexity
"""

    return prompt
