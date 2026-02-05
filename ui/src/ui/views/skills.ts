import { html, nothing } from "lit";

import { clampText } from "../format";
import type { SkillStatusEntry, SkillStatusReport } from "../types";
import type { SkillMessageMap } from "../controllers/skills";

export type SkillsProps = {
  loading: boolean;
  report: SkillStatusReport | null;
  error: string | null;
  filter: string;
  edits: Record<string, string>;
  busyKey: string | null;
  messages: SkillMessageMap;
  onFilterChange: (next: string) => void;
  onRefresh: () => void;
  onToggle: (skillKey: string, enabled: boolean) => void;
  onEdit: (skillKey: string, value: string) => void;
  onSaveKey: (skillKey: string) => void;
  onInstall: (skillKey: string, name: string, installId: string) => void;
};

export function renderSkills(props: SkillsProps) {
  const skills = props.report?.skills ?? [];
  const filter = props.filter.trim().toLowerCase();
  const filtered = filter
    ? skills.filter((skill) =>
      [skill.name, skill.description, skill.source]
        .join(" ")
        .toLowerCase()
        .includes(filter),
    )
    : skills;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">Skills</div>
          <div class="card-sub">Bundled, managed, and workspace skills.</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field" style="flex: 1;">
          <span>Filter</span>
          <input
            .value=${props.filter}
            @input=${(e: Event) =>
      props.onFilterChange((e.target as HTMLInputElement).value)}
            placeholder="Search skills"
          />
        </label>
        <div class="muted">${filtered.length} shown</div>
      </div>

      ${props.report?.envStatus
      ? html`
            <div class="chip-row" style="margin-top: 12px; gap: 8px;">
              <span class="muted">System Environment:</span>
              ${Object.entries(props.report.envStatus).map(
        ([name, ok]) => html`
                  <span class="chip ${ok ? "chip-ok" : "chip-warn"}">
                    ${name}
                  </span>
                `,
      )}
            </div>
          `
      : nothing}

      <div class="row" style="margin-top: 16px; align-items: flex-end; gap: 12px;">
        <label class="field" style="flex: 1;">
          <span>Quick Install (npm or system)</span>
          <input
            id="quick-install-input"
            placeholder="e.g. axios or php"
            @keydown=${(e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const input = document.getElementById("quick-install-input") as HTMLInputElement;
        const val = input.value.trim();
        if (val) {
          props.onInstall("dynamic", val, val.includes(":") ? val : `system:${val}`);
          input.value = "";
        }
      }
    }}
          />
        </label>
        <button
          class="btn primary"
          ?disabled=${props.loading}
          @click=${() => {
      const input = document.getElementById("quick-install-input") as HTMLInputElement;
      const val = input.value.trim();
      if (val) {
        // If no prefix, default to system (or node if it looks like one?)
        const installId = val.includes(":") ? val : `system:${val}`;
        props.onInstall("dynamic", val, installId);
        input.value = "";
      }
    }}
        >
          Install
        </button>
      </div>

      ${props.error
      ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
      : nothing}

      ${filtered.length === 0
      ? html`<div class="muted" style="margin-top: 16px;">No skills found.</div>`
      : html`
            <div class="list" style="margin-top: 16px;">
              ${filtered.map((skill) => renderSkill(skill, props))}
            </div>
          `}
    </section>
  `;
}

function renderSkill(skill: SkillStatusEntry, props: SkillsProps) {
  const busy = props.busyKey === skill.skillKey;
  const apiKey = props.edits[skill.skillKey] ?? "";
  const message = props.messages[skill.skillKey] ?? null;
  const canInstall =
    skill.install.length > 0 &&
    (skill.missing.bins.length > 0 ||
      skill.missing.dependencies.length > 0 ||
      skill.missing.languages.length > 0);
  const missing = [
    ...skill.missing.bins.map((b) => `bin:${b}`),
    ...skill.missing.dependencies.map((d) => `npm:${d}`),
    ...skill.missing.languages.map((l) => `lang:${l}`),
    ...skill.missing.env.map((e) => `env:${e}`),
    ...skill.missing.config.map((c) => `config:${c}`),
    ...skill.missing.os.map((o) => `os:${o}`),
  ];
  const reasons: string[] = [];
  if (skill.disabled) reasons.push("disabled");
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">
          ${skill.emoji ? `${skill.emoji} ` : ""}${skill.name}
        </div>
        <div class="list-sub">${clampText(skill.description, 140)}</div>
        <div class="chip-row" style="margin-top: 6px;">
          <span class="chip">${skill.source}</span>
          ${skill.disabled ? html`<span class="chip chip-warn">disabled</span>` : nothing}
        </div>
        ${missing.length > 0
      ? html`
              <div class="muted" style="margin-top: 6px;">
                Missing: ${missing.join(", ")}
              </div>
            `
      : nothing}
        ${reasons.length > 0
      ? html`
              <div class="muted" style="margin-top: 6px;">
                Reason: ${reasons.join(", ")}
              </div>
            `
      : nothing}
      </div>
      <div class="list-meta">
        <div class="row" style="justify-content: flex-end; flex-wrap: wrap; gap: 8px;">
          <button
            class="btn"
            ?disabled=${busy}
            @click=${() => props.onToggle(skill.skillKey, skill.disabled)}
          >
            ${skill.disabled ? "Enable" : "Disable"}
          </button>
          ${canInstall
      ? skill.install.map(
        (opt) => html`
                    <button
                      class="btn primary"
                      ?disabled=${busy}
                      @click=${() =>
            props.onInstall(skill.skillKey, skill.name, opt.id)}
                    >
                      ${busy ? "Installing…" : opt.label}
                    </button>
                  `,
      )
      : nothing}
        </div>
        ${message
      ? html`<div
              class="muted"
              style="margin-top: 8px; color: ${message.kind === "error"
          ? "var(--danger-color, #d14343)"
          : "var(--success-color, #0a7f5a)"
        };"
            >
              ${message.message}
            </div>`
      : nothing}
        ${skill.primaryEnv
      ? html`
              <div class="field" style="margin-top: 10px;">
                <span>API key</span>
                <input
                  type="password"
                  .value=${apiKey}
                  @input=${(e: Event) =>
          props.onEdit(skill.skillKey, (e.target as HTMLInputElement).value)}
                />
              </div>
              <button
                class="btn primary"
                style="margin-top: 8px;"
                ?disabled=${busy}
                @click=${() => props.onSaveKey(skill.skillKey)}
              >
                Save key
              </button>
            `
      : nothing}
      </div>
    </div>
  `;
}
