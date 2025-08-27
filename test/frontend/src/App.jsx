import React, { useState, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  // Eliminat setDetailedSummary, nu mai e folosit
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // Speech recognition logic
  const handleSpeech = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Recunoașterea vocală nu este suportată în acest browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    // Detectează automat limba inputului (ro sau en)
    let lang = 'ro-RO';
    if (query && /^[a-zA-Z0-9 .,?!'"-]+$/.test(query)) {
      lang = 'en-US';
    }
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setListening(false);
      };
      recognitionRef.current.onerror = () => {
        setListening(false);
      };
      recognitionRef.current.onend = () => {
        setListening(false);
      };
    }
    recognitionRef.current.lang = lang;
    setListening(true);
    recognitionRef.current.start();
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRecommendation(null);
  // eliminat setDetailedSummary
    setImageUrl("");
    try {
      // 1. Recomandare
      const recRes = await axios.post("http://localhost:5000/recommend", { query });
      setRecommendation(recRes.data);

      // 2. Rezumat detaliat
  // const sumRes = await axios.post("http://localhost:5000/summary", { title: recRes.data.title });
  // eliminat setDetailedSummary

      // 3. Imagine (opțional, doar dacă vrei automat)
      // const imgRes = await axios.post("http://localhost:5000/image", {
      //   title: recRes.data.title,
      //   summary: recRes.data.short_summary,
      //   lang: recRes.data.lang,
      // });
      // setImageUrl(imgRes.data.image_url);
    } catch (err) {
      alert("Eroare la backend: " + err.message);
    }
    setLoading(false);
  };

  const handleImage = async () => {
    if (!recommendation) return;
    setImageUrl("");
    setLoading(true);
    try {
      const imgRes = await axios.post("http://localhost:5000/image", {
        title: recommendation.title,
        summary: recommendation.short_summary,
        lang: recommendation.lang,
      });
      setImageUrl(imgRes.data.image_url);
    } catch (err) {
      alert("Eroare la generarea imaginii: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="app-container">
      <h2>📚 AI Book Librarian</h2>
      <form onSubmit={handleAsk} style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ce fel de carte cauți?"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !query}>
          Caută
        </button>
        <button
          type="button"
          onClick={handleSpeech}
          disabled={loading || listening}
          style={{ marginLeft: 8, background: listening ? '#2563eb' : '#3182ce', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: '1.2rem', color: '#fff', cursor: listening ? 'not-allowed' : 'pointer' }}
          aria-label="Înregistrează mesaj vocal"
        >
          <span role="img" aria-label="microfon">🎤</span>
        </button>
      </form>
      {listening && <p style={{ color: '#2563eb', textAlign: 'center' }}>Ascultă... Vorbește acum!</p>}

      {loading && <p>Se procesează...</p>}

      {recommendation && (
        <div className="recommendation-card">
          <h3>Recomandare: {recommendation.title}</h3>
          <p><b>Rezumat scurt:</b> {recommendation.short_summary}</p>
          <div style={{ display: 'flex', gap: '12px', margin: '12px 0' }}>
            <button
              type="button"
              onClick={() => {
                const synth = window.speechSynthesis;
                synth.cancel(); // Oprește orice audio anterior
                const text = recommendation.short_summary;
                const utter = new window.SpeechSynthesisUtterance(text);
                utter.lang = recommendation.lang === 'ro' ? 'ro-RO' : (recommendation.lang === 'en' ? 'en-US' : recommendation.lang);
                // Selectează o voce feminină, naturală dacă există
                const voices = synth.getVoices();
                const preferred = voices.find(v => v.lang === utter.lang && v.name.toLowerCase().includes('female'))
                  || voices.find(v => v.lang === utter.lang && v.name.toLowerCase().includes('natural'))
                  || voices.find(v => v.lang === utter.lang && v.gender === 'female')
                  || voices.find(v => v.lang === utter.lang);
                if (preferred) utter.voice = preferred;
                utter.rate = 1;
                utter.pitch = 1.1;
                synth.speak(utter);
              }}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '1.2rem', cursor: 'pointer' }}
              aria-label="Ascultă rezumatul"
            >
              <span role="img" aria-label="audio">🔊</span> Ascultă rezumatul
            </button>
            <button
              type="button"
              onClick={() => window.speechSynthesis.cancel()}
              style={{ background: '#b6c6d7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '1.2rem', cursor: 'pointer' }}
              aria-label="Oprește audio"
            >
              <span role="img" aria-label="stop">⏹️</span> Stop
            </button>
          </div>
          <button onClick={handleImage} disabled={loading || imageUrl}>
            Generează imagine copertă
          </button>
          {imageUrl && (
            <img src={imageUrl} alt="Book cover" className="cover-image" />
          )}
        </div>
      )}
    </div>
  );
}

export default App;