import argparse
import os
from pathlib import Path

import chromadb
import requests


DEFAULT_CHROMA_PATH = Path(__file__).resolve().parents[2] / "GooglePlugin" / "chroma_db"
BATCH_SIZE = 100


def get_env(*names):
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return ""


def vector_literal(embedding):
    return "[" + ",".join(str(float(value)) for value in embedding) + "]"


def chunk_row(collection_name, item_id, document, metadata, embedding):
    safe_metadata = metadata or {}
    return {
        "source_collection": collection_name,
        "source_id": str(item_id),
        "book_title": safe_metadata.get("book_title"),
        "source_ref": safe_metadata.get("source_ref"),
        "chapter_num": str(safe_metadata.get("chapter_num")) if safe_metadata.get("chapter_num") is not None else None,
        "verse_num": str(safe_metadata.get("verse_num")) if safe_metadata.get("verse_num") is not None else None,
        "paragraph": str(safe_metadata.get("paragraph")) if safe_metadata.get("paragraph") is not None else None,
        "content_type": safe_metadata.get("type"),
        "text_content": (document or "").strip(),
        "source_url": safe_metadata.get("source_url"),
        "metadata": safe_metadata,
        "embedding": vector_literal(embedding),
    }


def post_batch(supabase_url, service_key, rows):
    if not rows:
        return

    response = requests.post(
        f"{supabase_url.rstrip('/')}/rest/v1/scripture_chunks?on_conflict=source_collection,source_id",
        headers={
            "apikey": service_key,
            "authorization": f"Bearer {service_key}",
            "content-type": "application/json",
            "prefer": "resolution=merge-duplicates",
        },
        json=rows,
        timeout=60,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase import failed: {response.status_code} {response.text}")


def import_chroma_vectors(chroma_path, supabase_url, service_key):
    client = chromadb.PersistentClient(path=str(chroma_path))
    total = 0

    for collection in client.list_collections():
        count = collection.count()
        if count == 0:
            continue

        collection_name = collection.name
        print(f"Importing {count} rows from {collection_name}...")

        for offset in range(0, count, BATCH_SIZE):
            batch = collection.get(
                limit=BATCH_SIZE,
                offset=offset,
                include=["documents", "metadatas", "embeddings"],
            )
            rows = []
            for item_id, document, metadata, embedding in zip(
                batch.get("ids", []),
                batch.get("documents", []),
                batch.get("metadatas", []),
                batch.get("embeddings", []),
            ):
                if not document or embedding is None or len(embedding) == 0:
                    continue
                rows.append(chunk_row(collection_name, item_id, document, metadata, embedding))

            post_batch(supabase_url, service_key, rows)
            total += len(rows)
            print(f"  imported {min(offset + BATCH_SIZE, count)} / {count}")

    return total


def main():
    parser = argparse.ArgumentParser(description="Copy existing Chroma vectors into Supabase pgvector.")
    parser.add_argument("--chroma-path", default=str(DEFAULT_CHROMA_PATH))
    args = parser.parse_args()

    supabase_url = get_env("SUPABASE_URL", "VITE_SUPABASE_URL")
    service_key = get_env("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this import.")

    total = import_chroma_vectors(Path(args.chroma_path), supabase_url, service_key)
    print(f"Done. Imported {total} scripture chunks with existing embeddings.")


if __name__ == "__main__":
    main()
