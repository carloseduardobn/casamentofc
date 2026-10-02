"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABEL = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  nao_confirmado: "Não vai",
};

function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [guests, setGuests] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [newDepName, setNewDepName] = useState("");
  const [editingDepId, setEditingDepId] = useState(null);
  const [editDepDraft, setEditDepDraft] = useState({});

  const [eventDraft, setEventDraft] = useState(null);
  const [savingEvent, setSavingEvent] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [guestsRes, eventRes] = await Promise.all([
        fetch("/api/admin/guests"),
        fetch("/api/rsvp/event"),
      ]);
      if (guestsRes.status === 401) {
        router.push("/admin/login");
        return;
      }
      const guestsData = await guestsRes.json();
      const eventData = await eventRes.json();
      setGuests(guestsData.guests || []);
      setEvent(eventData);
      setEventDraft({
        eventName: eventData.eventName || "",
        eventDate: toInputDateTime(eventData.eventDate),
        deadlineDate: toInputDateTime(eventData.deadlineDate),
      });
    } catch {
      setError("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const people = guests.flatMap((g) => [g, ...g.dependents]);
    const total = people.length;
    const confirmado = people.filter((p) => p.status === "confirmado").length;
    const nao = people.filter((p) => p.status === "nao_confirmado").length;
    const pendente = people.filter((p) => p.status === "pendente").length;
    return { total, confirmado, nao, pendente };
  }, [guests]);

  const visibleGuests = useMemo(() => {
    return guests.filter((g) => {
      const groupStatuses = [g.status, ...g.dependents.map((d) => d.status)];
      if (filter !== "todos" && !groupStatuses.includes(filter)) return false;
      if (search) {
        const term = search.toLowerCase();
        const nameMatch =
          g.name.toLowerCase().includes(term) ||
          g.dependents.some((d) => d.name.toLowerCase().includes(term));
        if (!nameMatch) return false;
      }
      return true;
    });
  }, [guests, filter, search]);

  function refreshGuestInState(updatedGuest) {
    setGuests((prev) =>
      prev.map((g) => (g.id === updatedGuest.id ? { ...g, ...updatedGuest } : g))
    );
  }

  async function handleAddGuest(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError("");
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível adicionar o convidado.");
        return;
      }
      setGuests((prev) =>
        [...prev, data.guest].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName("");
      setNotice(`"${data.guest.name}" foi adicionado à lista.`);
    } catch {
      setError("Erro de conexão ao adicionar convidado.");
    }
  }

  function startEdit(guest) {
    setEditingId(guest.id);
    setEditDraft({ name: guest.name, status: guest.status, notes: guest.notes || "" });
    setNotice("");
  }

  async function saveEdit(id) {
    setError("");
    try {
      const res = await fetch(`/api/admin/guests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar as alterações.");
        return;
      }
      refreshGuestInState(data.guest);
      setEditingId(null);
      setNotice(`Dados de "${data.guest.name}" atualizados.`);
    } catch {
      setError("Erro de conexão ao salvar.");
    }
  }

  async function handleDelete(guest) {
    const warning =
      guest.dependents.length > 0
        ? `Remover "${guest.name}" também vai remover ${guest.dependents.length} pessoa(s) associada(s). Continuar?`
        : `Remover "${guest.name}" da lista de convidados?`;
    if (!confirm(warning)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/guests/${guest.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Não foi possível remover o convidado.");
        return;
      }
      setGuests((prev) => prev.filter((g) => g.id !== guest.id));
      setNotice(`"${guest.name}" foi removido da lista.`);
    } catch {
      setError("Erro de conexão ao remover.");
    }
  }

  async function handleAddDependent(e, guestId) {
    e.preventDefault();
    const name = newDepName.trim();
    if (!name) return;
    setError("");
    try {
      const res = await fetch("/api/admin/dependents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível adicionar a pessoa associada.");
        return;
      }
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guestId
            ? { ...g, dependents: [...g.dependents, data.dependent].sort((a, b) => a.name.localeCompare(b.name)) }
            : g
        )
      );
      setNewDepName("");
      setNotice(`"${data.dependent.name}" foi associado(a) à lista.`);
    } catch {
      setError("Erro de conexão ao adicionar pessoa associada.");
    }
  }

  function startEditDep(dep) {
    setEditingDepId(dep.id);
    setEditDepDraft({ name: dep.name, status: dep.status });
  }

  async function saveEditDep(dep) {
    setError("");
    try {
      const res = await fetch(`/api/admin/dependents/${dep.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDepDraft),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar a pessoa associada.");
        return;
      }
      setGuests((prev) =>
        prev.map((g) =>
          g.id === dep.guest_id
            ? {
                ...g,
                dependents: g.dependents.map((d) =>
                  d.id === dep.id ? data.dependent : d
                ),
              }
            : g
        )
      );
      setEditingDepId(null);
      setNotice(`Dados de "${data.dependent.name}" atualizados.`);
    } catch {
      setError("Erro de conexão ao salvar.");
    }
  }

  async function handleDeleteDependent(dep) {
    if (!confirm(`Remover "${dep.name}" da lista de associados?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/dependents/${dep.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Não foi possível remover.");
        return;
      }
      setGuests((prev) =>
        prev.map((g) =>
          g.id === dep.guest_id
            ? { ...g, dependents: g.dependents.filter((d) => d.id !== dep.id) }
            : g
        )
      );
      setNotice(`"${dep.name}" foi removido(a).`);
    } catch {
      setError("Erro de conexão ao remover.");
    }
  }

  async function handleSaveEvent(e) {
    e.preventDefault();
    setSavingEvent(true);
    setError("");
    try {
      const res = await fetch("/api/admin/event", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: eventDraft.eventName,
          eventDate: eventDraft.eventDate || null,
          deadlineDate: eventDraft.deadlineDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar o evento.");
        return;
      }
      setEvent(data);
      setNotice("Dados do evento atualizados.");
    } catch {
      setError("Erro de conexão ao salvar o evento.");
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1>Painel de confirmações</h1>
        <button className="btn btn-secondary" onClick={handleLogout} type="button">
          Sair
        </button>
      </header>

      <main className="admin-main">
        <div role="status" aria-live="polite">
          {notice && <p className="help-text">{notice}</p>}
          {error && <p className="error-text">{error}</p>}
        </div>

        {loading ? (
          <p>Carregando dados...</p>
        ) : (
          <>
            <section className="stat-grid" aria-label="Resumo das confirmações, por pessoa">
              <div className="stat-card">
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">Pessoas no total</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.confirmado}</span>
                <span className="stat-label">Confirmados</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.nao}</span>
                <span className="stat-label">Não vão</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.pendente}</span>
                <span className="stat-label">Pendentes</span>
              </div>
            </section>

            <section className="card" aria-labelledby="event-settings-title">
              <h2 id="event-settings-title">Dados do evento</h2>
              <form onSubmit={handleSaveEvent} noValidate>
                <div className="form-row">
                  <div className="form-group">
                    <label className="field-label" htmlFor="event-name">
                      Nome do evento
                    </label>
                    <input
                      id="event-name"
                      className="text-input"
                      type="text"
                      value={eventDraft?.eventName || ""}
                      onChange={(e) =>
                        setEventDraft((d) => ({ ...d, eventName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label" htmlFor="event-date">
                      Data do evento
                    </label>
                    <input
                      id="event-date"
                      className="text-input"
                      type="datetime-local"
                      value={eventDraft?.eventDate || ""}
                      onChange={(e) =>
                        setEventDraft((d) => ({ ...d, eventDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label" htmlFor="deadline-date">
                      Prazo para confirmar
                    </label>
                    <input
                      id="deadline-date"
                      className="text-input"
                      type="datetime-local"
                      value={eventDraft?.deadlineDate || ""}
                      onChange={(e) =>
                        setEventDraft((d) => ({ ...d, deadlineDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <button className="btn btn-primary" type="submit" disabled={savingEvent}>
                  {savingEvent ? "Salvando..." : "Salvar dados do evento"}
                </button>
              </form>
            </section>

            <section className="card" aria-labelledby="add-guest-title">
              <h2 id="add-guest-title">Adicionar convidado titular</h2>
              <p className="help-text">
                Cadastre aqui a pessoa que vai fazer a confirmação. Cônjuge,
                filhos ou acompanhantes podem ser associados a ela depois, na
                lista abaixo.
              </p>
              <form onSubmit={handleAddGuest} className="form-row" noValidate>
                <div className="form-group">
                  <label className="field-label" htmlFor="new-guest-name">
                    Nome completo
                  </label>
                  <input
                    id="new-guest-name"
                    className="text-input"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" type="submit">
                  Adicionar
                </button>
              </form>
            </section>

            <section className="card" aria-labelledby="guests-title">
              <h2 id="guests-title">Lista de convidados</h2>

              <div className="form-row">
                <div className="form-group">
                  <label className="field-label" htmlFor="filter-status">
                    Filtrar por status
                  </label>
                  <select
                    id="filter-status"
                    className="text-input"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="confirmado">Confirmados</option>
                    <option value="nao_confirmado">Não vão</option>
                    <option value="pendente">Pendentes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="search-name">
                    Buscar por nome (titular ou associado)
                  </label>
                  <input
                    id="search-name"
                    className="text-input"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-wrap">
                <table className="guests-table">
                  <caption className="sr-only">
                    Lista de convidados titulares, com status, pessoas
                    associadas e ações
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">Status</th>
                      <th scope="col">Associados</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleGuests.length === 0 && (
                      <tr>
                        <td colSpan={4}>Nenhum convidado encontrado.</td>
                      </tr>
                    )}
                    {visibleGuests.map((guest) => {
                      const isEditing = editingId === guest.id;
                      const isExpanded = expandedId === guest.id;
                      return (
                        <Fragment key={guest.id}>
                          <tr>
                            <td>
                              {isEditing ? (
                                <>
                                  <label className="sr-only" htmlFor={`edit-name-${guest.id}`}>
                                    Nome de {guest.name}
                                  </label>
                                  <input
                                    id={`edit-name-${guest.id}`}
                                    className="text-input"
                                    type="text"
                                    value={editDraft.name}
                                    onChange={(e) =>
                                      setEditDraft((d) => ({ ...d, name: e.target.value }))
                                    }
                                  />
                                </>
                              ) : (
                                guest.name
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <>
                                  <label className="sr-only" htmlFor={`edit-status-${guest.id}`}>
                                    Status de {guest.name}
                                  </label>
                                  <select
                                    id={`edit-status-${guest.id}`}
                                    className="text-input"
                                    value={editDraft.status}
                                    onChange={(e) =>
                                      setEditDraft((d) => ({ ...d, status: e.target.value }))
                                    }
                                  >
                                    <option value="pendente">Pendente</option>
                                    <option value="confirmado">Confirmado</option>
                                    <option value="nao_confirmado">Não vai</option>
                                  </select>
                                </>
                              ) : (
                                <span className={`badge badge-${guest.status}`}>
                                  {STATUS_LABEL[guest.status]}
                                </span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                aria-expanded={isExpanded}
                                onClick={() => {
                                  setExpandedId(isExpanded ? null : guest.id);
                                  setNewDepName("");
                                }}
                              >
                                {guest.dependents.length}{" "}
                                {guest.dependents.length === 1 ? "pessoa" : "pessoas"}{" "}
                                {isExpanded ? "▲" : "▼"}
                              </button>
                            </td>
                            <td>
                              {isEditing ? (
                                <div className="row-actions">
                                  <button className="btn btn-primary" type="button" onClick={() => saveEdit(guest.id)}>
                                    Salvar
                                  </button>
                                  <button className="btn btn-secondary" type="button" onClick={() => setEditingId(null)}>
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="row-actions">
                                  <button className="btn btn-secondary" type="button" onClick={() => startEdit(guest)}>
                                    Editar<span className="sr-only"> {guest.name}</span>
                                  </button>
                                  <button className="btn btn-danger" type="button" onClick={() => handleDelete(guest)}>
                                    Remover<span className="sr-only"> {guest.name}</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={4}>
                                <div className="dependents-admin-box">
                                  {guest.dependents.length === 0 && (
                                    <p className="help-text" style={{ margin: "0 0 0.75rem" }}>
                                      Nenhuma pessoa associada a {guest.name} ainda.
                                    </p>
                                  )}
                                  {guest.dependents.length > 0 && (
                                    <ul className="dep-admin-list">
                                      {guest.dependents.map((dep) => (
                                        <li key={dep.id} className="dep-admin-row">
                                          {editingDepId === dep.id ? (
                                            <>
                                              <label className="sr-only" htmlFor={`dep-name-${dep.id}`}>
                                                Nome da pessoa associada
                                              </label>
                                              <input
                                                id={`dep-name-${dep.id}`}
                                                className="text-input"
                                                type="text"
                                                value={editDepDraft.name}
                                                onChange={(e) =>
                                                  setEditDepDraft((d) => ({ ...d, name: e.target.value }))
                                                }
                                              />
                                              <label className="sr-only" htmlFor={`dep-status-${dep.id}`}>
                                                Status da pessoa associada
                                              </label>
                                              <select
                                                id={`dep-status-${dep.id}`}
                                                className="text-input"
                                                value={editDepDraft.status}
                                                onChange={(e) =>
                                                  setEditDepDraft((d) => ({ ...d, status: e.target.value }))
                                                }
                                              >
                                                <option value="pendente">Pendente</option>
                                                <option value="confirmado">Confirmado</option>
                                                <option value="nao_confirmado">Não vai</option>
                                              </select>
                                              <div className="row-actions">
                                                <button className="btn btn-primary btn-small" type="button" onClick={() => saveEditDep(dep)}>
                                                  Salvar
                                                </button>
                                                <button className="btn btn-secondary btn-small" type="button" onClick={() => setEditingDepId(null)}>
                                                  Cancelar
                                                </button>
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <span className="dep-admin-name">{dep.name}</span>
                                              <span className={`badge badge-${dep.status}`}>
                                                {STATUS_LABEL[dep.status]}
                                              </span>
                                              <div className="row-actions">
                                                <button className="btn btn-secondary btn-small" type="button" onClick={() => startEditDep(dep)}>
                                                  Editar<span className="sr-only"> {dep.name}</span>
                                                </button>
                                                <button className="btn btn-danger btn-small" type="button" onClick={() => handleDeleteDependent(dep)}>
                                                  Remover<span className="sr-only"> {dep.name}</span>
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  <form
                                    onSubmit={(e) => handleAddDependent(e, guest.id)}
                                    className="form-row"
                                    style={{ marginTop: "0.75rem", marginBottom: 0 }}
                                    noValidate
                                  >
                                    <div className="form-group">
                                      <label className="field-label" htmlFor={`new-dep-${guest.id}`}>
                                        Associar pessoa a {guest.name}
                                      </label>
                                      <input
                                        id={`new-dep-${guest.id}`}
                                        className="text-input"
                                        type="text"
                                        placeholder="Nome do cônjuge, filho(a) etc."
                                        value={newDepName}
                                        onChange={(e) => setNewDepName(e.target.value)}
                                      />
                                    </div>
                                    <button className="btn btn-primary btn-small" type="submit">
                                      Associar
                                    </button>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
