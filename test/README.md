
Un sistem conversațional de recomandare de cărți, cu interfață modernă și protecție la limbaj ofensator.


- Recomandă cărți pe baza cererii utilizatorului, folosind AI (OpenAI GPT).
- Rezumate scurte pentru fiecare carte, citite din fișierul `book_summaries.txt`.
- Interfață React cu input vocal (speech-to-text), playback audio și buton de stop.
- Generare copertă de carte cu DALL-E (OpenAI).
- Filtru pentru cuvinte urâte: răspunde politicos dacă utilizatorul folosește limbaj ofensator.

### 1. Backend (Flask)
```powershell
cd test
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python backend.py
```

### 2. Frontend (React)
```powershell
cd test/frontend
npm install
npm start
```


- `book_summaries.txt`: Rezumate scurte pentru fiecare carte (format deja inclus).
- `.env`: Cheia OpenAI API (`OPENAI_API_KEY=...`).

## Utilizare
- Introduceți o cerere de carte sau vorbiți folosind microfonul.
- Primiți recomandare, rezumat scurt și puteți asculta audio.
- Generați copertă de carte cu un click.
- Dacă folosiți cuvinte urâte, sistemul vă va cere să vorbiți politicos.

## Tehnologii folosite
- **Frontend:** React, Web Speech API, SpeechSynthesis API, Axios
- **Backend:** Flask, ChromaDB, OpenAI GPT, DALL-E, langdetect

