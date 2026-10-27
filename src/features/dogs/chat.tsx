"use client";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { Send, MessageCircle, LockKeyhole } from "lucide-react";
import { api } from "@/lib/client";
import type { ChatMessage, MatchProfile } from "./types";
export function Chat({
  match,
  userId,
}: {
  match: MatchProfile;
  userId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const result = await api<{ messages: ChatMessage[] }>(
          `/api/messages?matchId=${encodeURIComponent(match.id)}`,
        );
        if (alive) {
          setMessages(result.messages);
          setError("");
        }
      } catch (error) {
        if (alive) setError((error as Error).message);
      }
    };
    void refresh();
    const interval = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [match.id]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { message } = await api<{ message: ChatMessage }>("/api/messages", {
        method: "POST",
        body: JSON.stringify({ matchId: match.id, text }),
      });
      setMessages((previous) =>
        previous.some((item) => item.id === message.id)
          ? previous
          : [...previous, message],
      );
      setText("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="chat">
      <p className="chat-note">
        <LockKeyhole size={13} /> Esse papo é só entre os responsáveis pelo
        namorinho.
      </p>
      <div className="chat-messages" aria-live="polite">
        {!messages.length && (
          <div className="chat-empty">
            <MessageCircle size={35} />
            <h3>Deu namorinho. Mande um oizinho!</h3>
            <p>
              Que tal contar o jeitinho do seu cachorro? Conversem também sobre
              saúde e cuidados.
            </p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderId === userId ? "mine" : ""}`}
          >
            <p>{message.text}</p>
            <time>
              {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
        ))}
        <div ref={end} />
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={send} className="chat-compose">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Mande um oi pro humano do crush…"
          aria-label="Mensagem"
          maxLength={2000}
          required
        />
        <button
          className="primary-button"
          disabled={busy || !text.trim()}
          aria-label="Enviar mensagem"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
