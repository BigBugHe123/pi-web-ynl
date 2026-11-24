"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import {
  ConfigButton,
  ConfigDetail,
  ConfigDetailStack,
  ConfigDetailTitle,
  ConfigFooter,
  ConfigSaveTarget,
  ConfigSidebar,
  ConfigSidebarGroupLabel,
  ConfigSidebarItem,
  ConfigSidebarList,
  ConfigSidebarText,
  ConfigSplitView,
} from "./SettingsUi";

type Kind = "system" | "append_system" | "agents";
type Scope = "global" | "project";

export function PromptFilesConfig({ cwd }: { cwd: string | null }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<Kind>("system");
  const [scope, setScope] = useState<Scope>(cwd ? "project" : "global");
  const [content, setContent] = useState("");
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const params = useMemo(() => new URLSearchParams({ kind, scope, ...(scope === "project" && cwd ? { cwd } : {}) }), [cwd, kind, scope]);

  useEffect(() => {
    if (!cwd && scope === "project") setScope("global");
  }, [cwd, scope]);

  useEffect(() => {
    if (scope === "project" && !cwd) return;
    const controller = new AbortController();
    setLoading(true);
    setStatus("");
    void fetch(`/api/prompts?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const data = await response.json() as { content?: string; exists?: boolean; error?: string };
        if (!response.ok) throw new Error(data.error || response.statusText);
        setContent(data.content ?? ""); setExists(data.exists === true);
      })
      .catch(error => { if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : String(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [params, scope, cwd]);

  async function save() {
    setSaving(true); setStatus("");
    try {
      const response = await fetch(`/api/prompts?${params}`, { method: "PUT", headers: { "content-type": "text/plain; charset=utf-8" }, body: content });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || response.statusText);
      setExists(true); setStatus(t("prompts.saved"));
    } catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
    finally { setSaving(false); }
  }

  async function remove() {
    setSaving(true); setStatus("");
    try {
      const response = await fetch(`/api/prompts?${params}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || response.statusText);
      setContent(""); setExists(false); setStatus(t("prompts.deleted"));
    } catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
    finally { setSaving(false); }
  }

  const filename = kind === "system" ? "SYSTEM.md" : kind === "append_system" ? "APPEND_SYSTEM.md" : "AGENTS.md";
  const path = scope === "global"
    ? `~/.pi/agent/${filename}`
    : `${cwd ?? "<project>"}/${kind === "agents" ? filename : `.pi/${filename}`}`;

  return <ConfigSplitView>
    <ConfigSidebar>
      <ConfigSidebarList>
        <div className="config-sidebar-group">
          <ConfigSidebarGroupLabel>{t("prompts.title")}</ConfigSidebarGroupLabel>
          {(["system", "append_system", "agents"] as const).map(value => {
            const label = value === "system" ? "SYSTEM.md" : value === "append_system" ? "APPEND_SYSTEM.md" : "AGENTS.md";
            return <ConfigSidebarItem key={value} active={kind === value} onClick={() => setKind(value)}>
              <ConfigSidebarText className="is-grow">{label}</ConfigSidebarText>
            </ConfigSidebarItem>;
          })}
        </div>
      </ConfigSidebarList>
    </ConfigSidebar>
    <ConfigDetail>
      <ConfigDetailStack className="is-full-height">
        <div className="prompts-detail-heading">
          <ConfigDetailTitle>{filename}</ConfigDetailTitle>
          <ConfigSaveTarget value={scope} label={t("config.saveTo")} options={(["global", "project"] as const).map(value => ({ value, label: t(`prompts.scope.${value}`), disabled: saving || (value === "project" && !cwd) }))} path={path} onChange={setScope} />
          {kind === "agents" && scope === "project" && <p className="settings-general-description">{t("prompts.agentsRootOnly")}</p>}
        </div>
        <textarea aria-label={filename} value={content} disabled={loading || saving || (scope === "project" && !cwd)} onChange={event => setContent(event.target.value)} spellCheck={false} className="prompts-editor" />
        <p className="settings-general-description prompts-help">{t("prompts.emptyFallback")}</p>
        <ConfigFooter status={<span role="status">{status || (loading ? t("prompts.loading") : !exists ? t("prompts.notCreated") : "")}</span>}>
          <ConfigButton variant="danger" onClick={() => void remove()} disabled={loading || saving || !exists}>{t("prompts.delete")}</ConfigButton>
          <ConfigButton onClick={() => void save()} disabled={loading || saving || (scope === "project" && !cwd)}>{saving ? t("prompts.saving") : t("prompts.save")}</ConfigButton>
        </ConfigFooter>
      </ConfigDetailStack>
    </ConfigDetail>
  </ConfigSplitView>;
}
