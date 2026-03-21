import chromadb
from sentence_transformers import SentenceTransformer

# Load embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

client = chromadb.Client()
collection = client.get_or_create_collection("study_memory")


# 🔹 Convert text → vector
def embed(text):
    return model.encode(text).tolist()


# 🔹 Store memory
def store_memory(user_id, chat_id, text):
    collection.add(
        documents=[text],
        embeddings=[embed(text)],
        metadatas=[{
            "user_id": user_id,
            "chat_id": chat_id
        }],
        ids=[f"{user_id}_{chat_id}_{hash(text)}"]
    )


# 🔹 Retrieve similar memory
def get_similar_memory(user_id, query, n=5):
    results = collection.query(
        query_embeddings=[embed(query)],
        n_results=n
    )

    if not results["documents"]:
        return []

    return results["documents"][0]