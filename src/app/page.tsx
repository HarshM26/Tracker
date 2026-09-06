"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import styles from "./tasks.module.css";
import type { Account, Task } from "@/lib/types";

const PALETTE = ["#007AFF", "#34C759", "#FF9500", "#AF52DE", "#FF2D55", "#5AC8FA", "#5856D6"];

function colorFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function relDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const CHECK_SVG = (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5L6.2 11.7L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PLUS_SVG = (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const SEND_SVG = (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TRAY_SVG = (
  <svg viewBox="0 0 24 24" fill="none">
    <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 11H8L9.5 13.5H14.5L16 11H21" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export default function TasksPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [filter, setFilter] = useState<string>("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [justCheckedId, setJustCheckedId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState(todayStr());
  const [addSummary, setAddSummary] = useState("");
  const [addAssignee, setAddAssignee] = useState<string>("");

  const [identityOpen, setIdentityOpen] = useState(false);

  const accountsByUsername = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.username, a])),
    [accounts]
  );
  const nameFor = (username: string) => accountsByUsername[username]?.displayName ?? username;

  async function loadAll() {
    const [meRes, tasksRes] = await Promise.all([fetch("/api/me"), fetch("/api/tasks")]);
    if (meRes.status === 401 || tasksRes.status === 401) {
      router.push("/login");
      return;
    }
    const meData = await meRes.json();
    const tasksData = await tasksRes.json();
    setMe(meData.me);
    setAccounts(meData.accounts);
    setTasks(tasksData.tasks);
    setAddAssignee(meData.me?.username || meData.accounts[0]?.username || "");
    setLoading(false);
  }

  useEffect(() => {
    // Standard fetch-on-mount: loadAll() awaits before calling setState,
    // so this isn't the synchronous-setState pattern the rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshTasks() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks((await res.json()).tasks);
  }

  async function toggleTask(task: Task) {
    const nextCompleted = !task.completed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t)));
    if (nextCompleted) {
      setJustCheckedId(task.id);
      setTimeout(() => setJustCheckedId(null), 320);
    }
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: nextCompleted }),
    });
  }

  async function submitComment(taskId: string) {
    const body = (commentDrafts[taskId] || "").trim();
    if (!body) return;
    setCommentDrafts((prev) => ({ ...prev, [taskId]: "" }));
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    await refreshTasks();
  }

  async function submitAddTask() {
    const summary = addSummary.trim();
    if (!summary || !addAssignee) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: addDate, assignedTo: addAssignee, summary }),
    });
    setAddSummary("");
    setAddOpen(false);
    await refreshTasks();
  }

  async function clearAll() {
    if (!confirm("Clear every entry in the shared log? This can't be undone.")) return;
    await fetch("/api/tasks", { method: "DELETE" });
    await refreshTasks();
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (loading || !me) {
    return (
      <div className={styles.page}>
        <div className={styles.app}>
          <div style={{ padding: "80px 20px", textAlign: "center", color: "var(--label-2)", fontSize: 15 }}>
            Loading…
          </div>
        </div>
      </div>
    );
  }

  const visible = tasks.filter((t) => {
    if (filter !== "all" && t.assignedTo !== filter) return false;
    if (hideCompleted && t.completed) return false;
    return true;
  });
  const groups = (() => {
    const byDate: Record<string, Task[]> = {};
    visible.forEach((t) => {
      (byDate[t.startDate] = byDate[t.startDate] || []).push(t);
    });
    return Object.keys(byDate)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({ date, items: byDate[date] }));
  })();

  return (
    <div className={styles.page}>
      <div className={styles.app}>
        <div className={styles.navbar}>
          <button
            className={styles.navAvatar}
            style={{ background: colorFor(me.username) }}
            onClick={() => setIdentityOpen(true)}
          >
            {initials(me.displayName)}
          </button>
          <div className={styles.navTitle}>Tasks</div>
          <button className={styles.navAdd} onClick={() => setAddOpen(true)}>
            {PLUS_SVG}
          </button>
        </div>

        <div className={styles.scroll}>
          <h1 className={styles.largeTitle}>Tasks</h1>

          <div className={styles.segmented}>
            <button
              className={`${styles.segment} ${filter === "all" ? styles.segmentActive : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            {accounts.map((a) => (
              <button
                key={a.username}
                className={`${styles.segment} ${filter === a.username ? styles.segmentActive : ""}`}
                onClick={() => setFilter(a.username)}
              >
                {a.displayName}
              </button>
            ))}
          </div>

          <div className={styles.controlsRow}>
            <span className={styles.controlLabel}>Hide completed</span>
            <button
              className={styles.iosSwitch}
              data-on={hideCompleted}
              onClick={() => setHideCompleted((v) => !v)}
            >
              <span className={styles.knob} />
            </button>
          </div>

          {groups.length === 0 ? (
            <div className={styles.emptyState}>
              {TRAY_SVG}
              <p>No tasks yet — tap + to add one.</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.date}>
                <div className={styles.sectionHeader}>{relDate(g.date)}</div>
                <div className={styles.listCard}>
                  {g.items.map((t) => {
                    const expanded = expandedId === t.id;
                    const c = colorFor(t.assignedTo);
                    return (
                      <div className={styles.row} key={t.id}>
                        <div className={styles.taskRow}>
                          <button
                            className={`${styles.check} ${t.completed ? styles.checkChecked : ""} ${
                              justCheckedId === t.id ? styles.checkPop : ""
                            }`}
                            onClick={() => toggleTask(t)}
                          >
                            {CHECK_SVG}
                          </button>
                          <div className={styles.taskMain} onClick={() => setExpandedId(expanded ? null : t.id)}>
                            <div className={`${styles.taskSummary} ${t.completed ? styles.taskSummaryDone : ""}`}>
                              {t.summary}
                            </div>
                            <div className={styles.taskMeta}>
                              {t.comments.length ? `${t.comments.length} note${t.comments.length === 1 ? "" : "s"}` : "No notes"}
                            </div>
                          </div>
                          <div className={styles.taskSide} onClick={() => setExpandedId(expanded ? null : t.id)}>
                            <div className={styles.avatar} style={{ background: c }}>
                              {initials(nameFor(t.assignedTo))}
                            </div>
                            <div className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ""}`}>›</div>
                          </div>
                        </div>

                        {expanded && (
                          <div className={styles.thread}>
                            <div className={styles.threadInner}>
                              {t.comments.length === 0 ? (
                                <div className={styles.emptyThread}>No notes yet.</div>
                              ) : (
                                t.comments.map((cm) => (
                                  <div className={styles.bubbleRow} key={cm.id}>
                                    <div className={styles.bubbleWho}>{cm.author}</div>
                                    <span className={styles.bubble}>{cm.body}</span>
                                    <span className={styles.bubbleWhen}>{fmtTime(cm.createdAt)}</span>
                                  </div>
                                ))
                              )}
                              <div className={styles.compose}>
                                <input
                                  type="text"
                                  placeholder="Add a note…"
                                  autoComplete="off"
                                  value={commentDrafts[t.id] || ""}
                                  onChange={(e) =>
                                    setCommentDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") submitComment(t.id);
                                  }}
                                />
                                <button
                                  className={`${styles.send} ${
                                    (commentDrafts[t.id] || "").trim() ? styles.sendReady : ""
                                  }`}
                                  onClick={() => submitComment(t.id)}
                                >
                                  {SEND_SVG}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div className={styles.clearRow}>
            <button className={`${styles.textLink} ${styles.textLinkDanger}`} onClick={clearAll}>
              Clear All Entries
            </button>
          </div>
        </div>
      </div>

      {/* Add task sheet */}
      <div className={styles.overlay} data-open={addOpen} onClick={(e) => e.target === e.currentTarget && setAddOpen(false)}>
        <div className={styles.sheet}>
          <div className={styles.sheetHandle} />
          <div className={styles.sheetHeader}>
            <button className={styles.textLink} onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <div className={styles.sheetTitle}>New Task</div>
            <button className={`${styles.textLink} ${styles.textLinkBold}`} onClick={submitAddTask}>
              Add
            </button>
          </div>
          <div className={styles.formGroup}>
            <div className={styles.formRow}>
              <label>Date</label>
              <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label>Assign to</label>
              <div className={styles.avatarPicker}>
                {accounts.map((a) => (
                  <button
                    key={a.username}
                    type="button"
                    className={`${styles.avatarPick} ${addAssignee === a.username ? styles.avatarPickSelected : ""}`}
                    style={
                      {
                        background: colorFor(a.username),
                        "--pick-color": colorFor(a.username),
                      } as CSSProperties
                    }
                    onClick={() => setAddAssignee(a.username)}
                  >
                    {initials(a.displayName)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.formGroup}>
            <div className={`${styles.formRow} ${styles.formRowColumn}`}>
              <label>Description</label>
              <input
                type="text"
                placeholder="What needs doing?"
                autoComplete="off"
                value={addSummary}
                onChange={(e) => setAddSummary(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Identity popover */}
      <div
        className={`${styles.overlay} ${styles.overlayCenter}`}
        data-open={identityOpen}
        onClick={(e) => e.target === e.currentTarget && setIdentityOpen(false)}
      >
        <div className={styles.popover}>
          <div className={styles.popoverTitle}>{me.displayName}</div>
          <button className={styles.popoverRow} style={{ color: "var(--red)" }} onClick={logout}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
