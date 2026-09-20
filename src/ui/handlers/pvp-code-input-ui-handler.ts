import { type PvpTeamSummary, pvpApi } from "#api/pvp-api";
import { loggedInUser } from "#app/account";
import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { decodePvpTeam, encodePvpTeam, isPvpVictory, validatePvpRun } from "#data/pvp-team";
import { Button } from "#enums/buttons";
import type { RunEntry } from "#types/save-data";
import { UiHandler } from "#ui/ui-handler";

/** Native text controls keep long codes selectable and usable on phones as well as desktop. */
export class PvPCodeInputUiHandler extends UiHandler {
  private panel: HTMLDivElement;
  private body: HTMLDivElement;
  private notice: HTMLParagraphElement;
  private local: RunEntry[] = [];
  private own: PvpTeamSummary[] = [];
  private opponents: PvpTeamSummary[] = [];
  private selected = "";
  private nickname = "";
  private registeredName = "";
  private busy = false;
  private generation = 0;

  override setup(): void {
    document.querySelector(".pvp-lobby")?.remove();
    this.panel = document.createElement("div");
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-label", "异步 PVP");
    this.panel.style.cssText =
      "display:none;position:fixed;inset:3%;z-index:10000;background:#182431;color:#fff;padding:16px;overflow:auto;border:2px solid #aac4d8;border-radius:10px;font:16px sans-serif;box-sizing:border-box;";
    const style = document.createElement("style");
    style.textContent =
      ".pvp-lobby button,.pvp-lobby select,.pvp-lobby input,.pvp-lobby textarea{font:inherit;margin:4px;padding:8px;max-width:100%;box-sizing:border-box}.pvp-lobby button{cursor:pointer}.pvp-lobby textarea{display:block;width:98%;min-height:90px}.pvp-lobby article{border-top:1px solid #637589;padding:8px 0}.pvp-lobby p{white-space:pre-wrap;overflow-wrap:anywhere}.pvp-lobby h2{font-size:20px}";
    this.panel.className = "pvp-lobby";
    this.panel.append(style);
    this.notice = document.createElement("p");
    this.notice.setAttribute("role", "status");
    this.body = document.createElement("div");
    this.panel.append(this.notice, this.body);
    this.panel.addEventListener("keydown", e => {
      e.stopPropagation();
    });
    this.panel.addEventListener("keyup", e => {
      e.stopPropagation();
    });
    document.body.append(this.panel);
  }

  override show(args: unknown[]): boolean {
    super.show(args);
    this.panel.style.display = "block";
    this.nickname = localStorage.getItem(this.nicknameKey()) ?? "";
    this.registeredName = "";
    this.selected = "";
    this.local = [];
    this.own = [];
    this.opponents = [];
    this.render();
    this.notice.textContent = "正在读取通关记录……";
    const generation = ++this.generation;
    void this.load(args[0] as RunEntry | undefined, generation);
    return true;
  }

  private nicknameKey(): string {
    return `pvp-nickname:${loggedInUser?.username ?? globalScene.gameData.trainerId}`;
  }

  private async load(initial: RunEntry | undefined, generation: number): Promise<void> {
    try {
      const history = await globalScene.gameData.getRunHistoryData();
      if (generation !== this.generation) {
        return;
      }
      this.local = Object.values(history)
        .filter(isPvpVictory)
        .sort((a, b) => b.entry.timestamp - a.entry.timestamp);
      const index = initial ? this.local.findIndex(r => r.entry.timestamp === initial.entry.timestamp) : 0;
      this.selected = this.local.length > 0 ? `local:${Math.max(0, index)}` : "";
      this.render();
      this.notice.textContent = "";
      await this.refresh();
      if (!initial && this.own.length > 0) {
        this.selected = `own:${this.own[0].id}`;
        this.render();
      }
    } catch (error) {
      this.showError(error);
    }
  }

  private async refresh(): Promise<void> {
    const generation = this.generation;
    const [mine, list] = await Promise.all([pvpApi.mine(), pvpApi.list()]);
    if (generation !== this.generation) {
      return;
    }
    this.own = mine.teams;
    this.registeredName = mine.playerName;
    this.nickname = mine.playerName || this.nickname;
    this.opponents = list;
    if (!this.selected && this.own.length > 0) {
      this.selected = `own:${this.own[0].id}`;
    }
    this.render();
  }

  private button(parent: HTMLElement, label: string, action: () => void | Promise<void>): void {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.onclick = () => {
      if (this.busy) {
        return;
      }
      this.busy = true;
      button.disabled = true;
      Promise.resolve()
        .then(action)
        .catch(error => this.showError(error))
        .finally(() => {
          this.busy = false;
          button.disabled = false;
        });
    };
    parent.append(button);
  }

  private text(parent: HTMLElement, value: string, tag = "p"): HTMLElement {
    const element = document.createElement(tag);
    element.textContent = value;
    parent.append(element);
    return element;
  }

  private teamLabel(team: PvpTeamSummary): string {
    return `${team.own ? "自己的队伍 · " : ""}${team.playerName} · ${team.name || "通关队伍"}\n${team.party
      .map(p => {
        const name = (id: number) => {
          try {
            return speciesDataRegistry.getSpecies(id).name;
          } catch {
            return `#${id}`;
          }
        };
        return `${name(p.species)}${p.fusionSpecies ? `＋${name(p.fusionSpecies)}` : ""} Lv.${p.level}`;
      })
      .join("、")}`;
  }

  private render(): void {
    const generation = this.generation;
    this.body.replaceChildren();
    this.text(this.body, "异步 PVP", "h2");
    this.text(this.body, "对手由最强 AI 操作。保留等级、融合、配招和道具；双方满状态开战，不影响原存档。");
    this.button(this.body, "返回", () => {
      globalScene.ui.revertMode();
    });
    this.button(this.body, "刷新公共队伍", () => this.refresh());
    const nameLabel = this.text(this.body, "昵称（首次上传时登记，最多 20 字）", "label");
    const name = document.createElement("input");
    name.maxLength = 20;
    name.value = this.nickname;
    name.readOnly = !!this.registeredName;
    name.oninput = () => {
      this.nickname = name.value;
    };
    nameLabel.append(name);
    const selectLabel = this.text(this.body, "己方阵容：", "label");
    const select = document.createElement("select");
    for (const team of this.own) {
      select.add(new Option(`已上传 · ${this.teamLabel(team).replace("\n", " · ")}`, `own:${team.id}`));
    }
    this.local.forEach((run, i) =>
      select.add(
        new Option(
          `本地 · ${run.entry.name || new Date(run.entry.timestamp).toLocaleString()} · ${run.entry.party.length} 只`,
          `local:${i}`,
        ),
      ),
    );
    select.value = this.selected;
    select.onchange = () => {
      this.selected = select.value;
    };
    selectLabel.append(select);
    if (this.local.length === 0) {
      this.text(this.body, "没有本地经典通关记录。上传、分享或分享码挑战需要先通关经典模式。");
    }
    this.button(this.body, "上传所选本地通关记录", async () => {
      const run = this.getLocal();
      validatePvpRun(run);
      if (!this.nickname.trim()) {
        throw new Error("请先填写昵称。");
      }
      const team = await pvpApi.upload(run, this.nickname.trim());
      localStorage.setItem(this.nicknameKey(), team.playerName);
      this.selected = `own:${team.id}`;
      await this.refresh();
      this.notice.textContent = "上传成功，可在公共队伍中挑战，也可选为己方阵容。";
    });
    this.button(this.body, "生成分享码", async () => {
      const run = await this.getSelected(false);
      const code = encodePvpTeam(run, this.nickname || "训练家");
      const output = document.createElement("textarea");
      output.readOnly = true;
      output.value = code;
      output.setAttribute("aria-label", "完整分享码");
      this.body.prepend(output);
      output.focus();
      output.select();
      try {
        await navigator.clipboard.writeText(code);
        this.notice.textContent = "完整分享码已复制。";
      } catch {
        this.notice.textContent = "未能自动复制，请长按或全选上方完整分享码复制。";
      }
    });
    this.text(this.body, "分享码挑战（己方选择本地通关记录）", "h2");
    const code = document.createElement("textarea");
    code.placeholder = "在这里粘贴完整分享码";
    code.setAttribute("aria-label", "对手分享码");
    this.body.append(code);
    this.button(this.body, "挑战分享码队伍", async () => {
      const opponent = decodePvpTeam(code.value);
      await this.startBattle(this.getLocal(), opponent.runEntry, opponent.playerName);
    });
    this.text(this.body, `我的上传（${this.own.length}/5）`, "h2");
    for (const team of this.own) {
      const row = this.text(this.body, this.teamLabel(team), "article");
      this.button(row, "删除此上传", async () => {
        await pvpApi.remove(team.id);
        if (this.selected === `own:${team.id}`) {
          this.selected = this.local.length > 0 ? "local:0" : "";
        }
        await this.refresh();
        this.notice.textContent = "已删除上传，本地通关记录保留。";
      });
    }
    this.text(this.body, "公共队伍（可挑战他人或自己）", "h2");
    for (const team of this.opponents) {
      const row = this.text(this.body, this.teamLabel(team), "article");
      this.button(row, "挑战", async () => {
        const player = await this.getSelected(true);
        const opponent = await pvpApi.get(team.id);
        if (!this.active || generation !== this.generation) {
          return;
        }
        await this.startBattle(player, opponent.runEntry, opponent.playerName);
      });
    }
    if (this.opponents.length > 0 && this.opponents.length % 20 === 0) {
      this.button(this.body, "加载更多队伍", async () => {
        const more = await pvpApi.list(this.opponents.at(-1)!.id);
        this.opponents.push(...more);
        this.render();
        if (more.length === 0) {
          this.notice.textContent = "已经显示所有队伍。";
        }
      });
    }
  }

  private getLocal(): RunEntry {
    if (!this.selected.startsWith("local:")) {
      throw new Error("请在己方阵容中选择一条本地经典通关记录。");
    }
    return validatePvpRun(this.local[Number(this.selected.slice(6))]);
  }

  private async getSelected(requireUploaded: boolean): Promise<RunEntry> {
    if (this.selected.startsWith("own:")) {
      return validatePvpRun((await pvpApi.get(this.selected.slice(4))).runEntry);
    }
    if (requireUploaded) {
      throw new Error("挑战公共队伍时，请选择自己的已上传阵容，或先上传所选本地记录。");
    }
    return this.getLocal();
  }

  private async startBattle(playerRun: RunEntry, opponentRun: RunEntry, opponentName: string): Promise<void> {
    validatePvpRun(playerRun);
    validatePvpRun(opponentRun);
    const phase = globalScene.phaseManager.getCurrentPhase();
    if (!phase.is("TitlePhase")) {
      throw new Error("请先返回标题画面，再从“队伍挑战”进入 PVP。");
    }
    phase.startPvpBattle(playerRun, opponentRun, opponentName);
  }

  private showError(error: unknown): void {
    this.notice.textContent =
      error instanceof TypeError
        ? "无法读取共享队伍，请检查网络或稍后重试；也可使用分享码挑战。"
        : error instanceof Error
          ? error.message
          : "操作失败，请稍后重试。";
  }

  override processInput(button: Button): boolean {
    if (button === Button.CANCEL && !this.panel.contains(document.activeElement)) {
      globalScene.ui.revertMode();
    }
    return true;
  }

  override clear(): void {
    super.clear();
    this.generation++;
    this.panel.style.display = "none";
    if (this.panel.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
  }

  override destroy(): void {
    this.panel?.remove();
  }
}
