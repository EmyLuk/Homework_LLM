from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import openai
import chromadb
import json
from langdetect import detect, LangDetectException


load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("books")


def load_book_summaries_txt(path):
    summaries = {}
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    title = None
    summary_lines = []
    for line in lines:
        line = line.strip()
        if line.startswith('## Title:'):
            if title and summary_lines:
                summaries[title] = ' '.join(summary_lines).strip()
            title = line.replace('## Title:', '').strip()
            summary_lines = []
        elif line:
            summary_lines.append(line)
    if title and summary_lines:
        summaries[title] = ' '.join(summary_lines).strip()
    return summaries

book_summaries_dict = load_book_summaries_txt('book_summaries.txt')

def get_summary_by_title(title: str) -> str:
    return book_summaries_dict.get(title, None)

def get_embedding(text):
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def gpt_translate(text, target_lang):
    if not text.strip():
        return text
    if target_lang == "en":
        prompt = f"Translate the following text to English, keeping the meaning and style: {text}"
    elif target_lang == "ro":
        prompt = f"Tradu acest text în limba română, păstrând sensul și stilul: {text}"
    else:
        prompt = f"Translate the following text to {target_lang}, keeping the meaning and style: {text}"
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()

def retrieve_book(query, lang=None):
    embedding = get_embedding(query)
    result = collection.query(query_embeddings=[embedding], n_results=1)
    title = result["metadatas"][0][0]["title"]
    summary = result["documents"][0][0]
    if lang and lang != "en":
        summary = gpt_translate(summary, lang)
    return title, summary

def detect_language(text):
    try:
        lang = detect(text)
        return lang
    except LangDetectException:
        return "en"

def is_offensive(text):
    bad_words = [
        "fuck", "shit", "bitch", "asshole", "idiot", "moron", "stupid",
        "prost", "bou", "cretin", "nesimtit", "dumb", "you are dumb"
    ]
    text_lower = text.lower()
    return any(bad_word in text_lower for bad_word in bad_words)


app = Flask(__name__)
CORS(app)


@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json
    user_input = data.get("query", "")
    lang = detect_language(user_input)

    
    if is_offensive(user_input):
        polite_reply = {
            "ro": "Te rog să folosești un limbaj adecvat. Sunt aici ca să te ajut cu recomandări de cărți.",
            "en": "Please use appropriate language. I'm here to help you find great books.",
            "fr": "Merci d’utiliser un langage approprié. Je suis là pour vous aider à trouver des livres.",
        }.get(lang, "Please use appropriate language.")

        return jsonify({
            "title": None,
            "short_summary": None,
            "lang": lang,
            "gpt_reply": polite_reply,
            "history": [
                {"role": "user", "content": user_input},
                {"role": "assistant", "content": polite_reply}
            ]
        })

    
    history = data.get("history", [])
    messages = history.copy() if isinstance(history, list) else []
    messages.append({"role": "user", "content": user_input})

   
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )
    gpt_reply = response.choices[0].message.content.strip()

   
    title, short_summary = retrieve_book(user_input, lang)

   
    messages.append({"role": "assistant", "content": gpt_reply})

    return jsonify({
        "title": title,
        "short_summary": short_summary,
        "lang": lang,
        "gpt_reply": gpt_reply,
        "history": messages
    })


@app.route("/summary", methods=["POST"])
def summary():
    data = request.json
    title = data.get("title", "")
    lang = data.get("lang", "en")
    summary = get_summary_by_title(title)
    if summary is None:
        summary = "No summary available."
    elif lang != "en":
        summary = gpt_translate(summary, lang)
    return jsonify({"summary": summary})


@app.route("/image", methods=["POST"])
def image():
    data = request.json
    title = data.get("title", "")
    summary = data.get("summary", "")
    lang = data.get("lang", "en")

    if lang == "ro":
        prompt = f"Copertă de carte ilustrativă pentru '{title}'. Temă: {summary[:100]}... Stil artistic, atractiv, fără text."
    else:
        prompt = f"Book cover illustration for '{title}'. Theme: {summary[:100]}... Artistic, attractive, no text."

    response = openai.images.generate(
        model="dall-e-3",
        prompt=prompt,
        n=1,
        size="1024x1024"
    )
    image_url = response.data[0].url
    return jsonify({"image_url": image_url})

if __name__ == "__main__":
    app.run(debug=True)
