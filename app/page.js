"use client";

import { useEffect, useState } from "react";

const STATUS_LABEL = {
  pendente: "pendente",
  confirmado: "confirmado",
  nao_confirmado: "não vai",
};

function formatDate(value) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function groupSummary(people) {
  if (people.length === 0) return "";
  const allConfirmed = people.every((p) => p.status === "confirmado");
  const allDeclined = people.every((p) => p.status === "nao_confirmado");
  const anyPending = people.some((p) => p.status === "pendente");

  if (allConfirmed) {
    return people.length === 1
      ? "Presença confirmada. Agradecemos a resposta!"
      : "Excelente! Todas as pessoas do grupo foram confirmadas.";
  }
  if (allDeclined) {
    return people.length === 1
      ? "Você informou que não poderá comparecer."
      : "Registramos que ninguém do grupo poderá comparecer.";
  }
  if (!anyPending) {
    const confirmados = people.filter((p) => p.status === "confirmado");
    const naoVao = people.filter((p) => p.status === "nao_confirmado");
    return `Respostas registradas: ${confirmados
      .map((p) => p.name)
      .join(", ") || "ninguém"} confirmado(s); ${
      naoVao.map((p) => p.name).join(", ") || "ninguém"
    } não vai.`;
  }
  const pendentes = people.filter((p) => p.status === "pendente");
  return `Ainda falta responder por: ${pendentes.map((p) => p.name).join(", ")}.`;
}

export default function RsvpPage() {
  const [event, setEvent] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [matches, setMatches] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    fetch("/api/rsvp/event")
      .then((r) => r.json())
      .then(setEvent)
      .catch(() => setEvent({}));
  }, []);

  const deadlinePassed =
    event?.deadlineDate && new Date(event.deadlineDate) < new Date();

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setStatusMsg("");
    setSelected(null);
    const term = name.trim();
    if (!term) {
      setError("Digite seu nome para continuar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/rsvp/search?name=${encodeURIComponent(term)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível buscar agora.");
        setMatches(null);
        return;
      }
      if (data.matches.length === 0) {
        setMatches([]);
        setStatusMsg(
          "Nome não encontrado na lista de convidados. Verifique a grafia ou fale com quem organizou o evento."
        );
      } else if (data.matches.length === 1) {
        setMatches(data.matches);
        setSelected(data.matches[0]);
      } else {
        setMatches(data.matches);
        setStatusMsg(
          `Encontramos ${data.matches.length} nomes parecidos. Selecione o seu na lista abaixo.`
        );
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function updatePersonInSelected(target, updated) {
    setSelected((prev) => {
      if (!prev) return prev;
      if (target === "guest") {
        return { ...prev, status: updated.status, responded_at: updated.responded_at };
      }
      return {
        ...prev,
        dependents: prev.dependents.map((d) =>
          d.id === updated.id ? { ...d, status: updated.status } : d
        ),
      };
    });
  }

  async function handleRespondOne(target, id, status) {
    setError("");
    setBusyId(id);
    try {
      const res = await fetch("/api/rsvp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível registrar a resposta.");
        return;
      }
      updatePersonInSelected(target, data.person);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRespondAll(status) {
    if (!selected) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/rsvp/confirm-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: selected.id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível registrar as respostas.");
        return;
      }
      setSelected((prev) => ({
        ...prev,
        status: data.guest.status,
        dependents: prev.dependents.map((d) => {
          const match = data.dependents.find((u) => u.id === d.id);
          return match ? { ...d, status: match.status } : d;
        }),
      }));
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const eventDateText = formatDate(event?.eventDate);
  const deadlineText = formatDate(event?.deadlineDate);

  const groupPeople = selected
    ? [{ id: selected.id, name: selected.name, status: selected.status, target: "guest" }].concat(
        selected.dependents.map((d) => ({ ...d, target: "dependent" }))
      )
    : [];

  return (
    <main className="invite-page">
      <div className="invite-card">
        <p className="invite-eyebrow">Confirmação de presença</p>
        <h1 className="invite-title">{event?.eventName || "Carregando..."}</h1>
        <p className="invite-meta">
          {eventDateText && <>Data do evento: {eventDateText}. </>}
          {deadlineText && (
            <>
              Prazo para confirmar: {deadlineText}
              {deadlinePassed ? " (encerrado)" : "."}
            </>
          )}
        </p>

        {!selected && (
          <form onSubmit={handleSearch} noValidate>
            <label className="field-label" htmlFor="guest-name">
              Digite seu nome completo
            </label>
            <input
              id="guest-name"
              className="text-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-describedby="search-help"
            />
            <p id="search-help" className="help-text">
              Vamos verificar se seu nome está na lista de convidados.
            </p>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Buscando..." : "Buscar meu nome"}
            </button>
          </form>
        )}

        <div role="status" aria-live="polite">
          {error && <p className="error-text">{error}</p>}

          {matches && matches.length === 0 && (
            <div className="result-box status-not-found">
              <p style={{ margin: 0 }}>{statusMsg}</p>
            </div>
          )}

          {matches && matches.length > 1 && !selected && (
            <ul className="guest-list">
              {matches.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setSelected(m)}>
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <div className="result-box" style={{ marginTop: "1.25rem" }}>
              {/* Titular */}
              <div className="person-row">
                <div>
                  <p className="person-name">{selected.name}</p>
                  <span className={`badge badge-${selected.status}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>
                {!deadlinePassed && (
                  <div className="btn-row btn-row-compact">
                    <button
                      className="btn btn-confirm btn-small"
                      type="button"
                      disabled={busyId === selected.id || loading}
                      onClick={() => handleRespondOne("guest", selected.id, "confirmado")}
                    >
                      Confirmar
                    </button>
                    <button
                      className="btn btn-decline btn-small"
                      type="button"
                      disabled={busyId === selected.id || loading}
                      onClick={() =>
                        handleRespondOne("guest", selected.id, "nao_confirmado")
                      }
                    >
                      Não vai
                    </button>
                  </div>
                )}
              </div>

              {selected.dependents.length > 0 && (
                <>
                  <p className="dependents-intro">
                    Deseja confirmar também estas pessoas associadas a você?
                  </p>
                  <ul className="dependents-list">
                    {selected.dependents.map((dep) => (
                      <li key={dep.id} className="person-row">
                        <div>
                          <p className="person-name">{dep.name}</p>
                          <span className={`badge badge-${dep.status}`}>
                            {STATUS_LABEL[dep.status]}
                          </span>
                        </div>
                        {!deadlinePassed && (
                          <div className="btn-row btn-row-compact">
                            <button
                              className="btn btn-confirm btn-small"
                              type="button"
                              disabled={busyId === dep.id || loading}
                              onClick={() =>
                                handleRespondOne("dependent", dep.id, "confirmado")
                              }
                            >
                              Confirmar
                            </button>
                            <button
                              className="btn btn-decline btn-small"
                              type="button"
                              disabled={busyId === dep.id || loading}
                              onClick={() =>
                                handleRespondOne("dependent", dep.id, "nao_confirmado")
                              }
                            >
                              Não vai
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {!deadlinePassed && (
                    <div className="btn-row" style={{ marginTop: "1rem" }}>
                      <button
                        className="btn btn-confirm"
                        type="button"
                        disabled={loading}
                        onClick={() => handleRespondAll("confirmado")}
                      >
                        Confirmar todo o grupo
                      </button>
                      <button
                        className="btn btn-decline"
                        type="button"
                        disabled={loading}
                        onClick={() => handleRespondAll("nao_confirmado")}
                      >
                        Nenhum poderá ir
                      </button>
                    </div>
                  )}
                </>
              )}

              {deadlinePassed && (
                <p className="help-text" style={{ marginTop: "1rem" }}>
                  O prazo para confirmar presença já encerrou. Fale com quem
                  organizou o evento se precisar alterar uma resposta.
                </p>
              )}

              <p className="summary-text" aria-live="polite">
                {groupSummary(groupPeople)}
              </p>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: "1rem", width: "100%" }}
                onClick={() => {
                  setSelected(null);
                  setMatches(null);
                  setName("");
                  setStatusMsg("");
                }}
              >
                Buscar outro nome
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
