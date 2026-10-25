import { describe, expect, it } from "bun:test";
import { $ } from "bun";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { FileSystem } from "../file-system/operations.ts";
import { Core } from "../index.ts";
import type { BacklogConfig, Task } from "../types/index.ts";
import { formatTaskListItem } from "../ui/board.ts";
import { formatTaskViewerListItem } from "../ui/task-viewer-with-search.ts";
import { formatCompactTaskId } from "../utils/task-id.ts";
import TaskCard from "../web/components/TaskCard.tsx";
import TaskList from "../web/components/TaskList.tsx";
import { CompactTaskIdsProvider } from "../web/contexts/CompactTaskIdsContext.tsx";
import { getTestCliPath } from "./test-cli.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

const task: Task = {
	id: "TASK-30",
	title: "Compact id task",
	status: "To Do",
	assignee: [],
	createdDate: "2026-10-25",
	labels: [],
	dependencies: [],
};

const on = { compactTaskIds: true };

/** Visible text of rendered markup: tags, and so attribute values, removed. */
const visibleText = (html: string) => html.replace(/<[^>]*>/g, " ");

describe("compact task IDs", () => {
	describe("formatCompactTaskId", () => {
		it("drops the project's task prefix when the setting is on", () => {
			expect(formatCompactTaskId("TASK-30", on)).toBe("30");
			expect(formatCompactTaskId("TASK-2.1", on)).toBe("2.1");
			expect(formatCompactTaskId("task-7", on)).toBe("7");
			expect(formatCompactTaskId("BACK-5", { compactTaskIds: true, prefixes: { task: "back" } })).toBe("5");
		});

		it("leaves drafts and other prefixes alone, so nothing else passes for a task", () => {
			expect(formatCompactTaskId("DRAFT-4", on)).toBe("DRAFT-4");
			expect(formatCompactTaskId("TASK-5", { compactTaskIds: true, prefixes: { task: "back" } })).toBe("TASK-5");
		});

		it("keeps the full ID when the setting is off or unset", () => {
			expect(formatCompactTaskId("TASK-30", { compactTaskIds: false })).toBe("TASK-30");
			expect(formatCompactTaskId("TASK-30", {})).toBe("TASK-30");
			expect(formatCompactTaskId("TASK-30", null)).toBe("TASK-30");
		});
	});

	describe("compact_task_ids in config.yml", () => {
		const parse = (content: string) => new FileSystem(createUniqueTestDir("compact-ids-parse")).parseConfig(content);

		it("reads true and false, and leaves it unset when absent", () => {
			expect(parse('project_name: "P"\ncompact_task_ids: true\n').compactTaskIds).toBe(true);
			expect(parse('project_name: "P"\ncompact_task_ids: false\n').compactTaskIds).toBe(false);
			expect(parse('project_name: "P"\n').compactTaskIds).toBeUndefined();
		});

		it("survives a save, so the web settings page does not drop it", async () => {
			const testDir = createUniqueTestDir("compact-ids-round-trip");
			try {
				const filesystem = new FileSystem(testDir);
				await filesystem.ensureBacklogStructure();
				const config: BacklogConfig = {
					projectName: "Ids",
					statuses: ["To Do", "Done"],
					labels: [],
					dateFormat: "yyyy-mm-dd",
					compactTaskIds: true,
				};
				await filesystem.saveConfig(config);
				expect((await new FileSystem(testDir).loadConfig())?.compactTaskIds).toBe(true);
			} finally {
				await safeCleanup(testDir);
			}
		});
	});

	describe("backlog config", () => {
		it("sets, gets and lists compactTaskIds, refusing a value that is not a boolean", async () => {
			const testDir = createUniqueTestDir("compact-ids-cli");
			const cli = getTestCliPath();
			try {
				await initializeTestProject(new Core(testDir), "Ids");
				await $`bun ${cli} config set compactTaskIds true`.cwd(testDir).quiet();
				expect((await $`bun ${cli} config get compactTaskIds`.cwd(testDir).text()).trim()).toBe("true");
				expect(await $`bun ${cli} config list`.cwd(testDir).text()).toContain("compactTaskIds: true");
				const rejected = await $`bun ${cli} config set compactTaskIds maybe`.cwd(testDir).nothrow().quiet();
				expect(rejected.exitCode).not.toBe(0);
				expect(await $`bun ${cli} config get --help`.cwd(testDir).text()).toContain("compactTaskIds");
				expect(await $`bun ${cli} config set --help`.cwd(testDir).text()).toContain("compactTaskIds");
			} finally {
				await safeCleanup(testDir);
			}
		});

		it("keeps full IDs in CLI output, which agents and scripts read", async () => {
			const testDir = createUniqueTestDir("compact-ids-cli-output");
			const cli = getTestCliPath();
			try {
				await initializeTestProject(new Core(testDir), "Ids");
				await $`bun ${cli} config set compactTaskIds true`.cwd(testDir).quiet();
				await $`bun ${cli} task create "Listed"`.cwd(testDir).quiet();
				expect(await $`bun ${cli} task list --plain`.cwd(testDir).text()).toMatch(/TASK-1\b/i);
			} finally {
				await safeCleanup(testDir);
			}
		});
	});

	describe("web board card", () => {
		const renderCard = (config?: { compactTaskIds?: boolean }) =>
			renderToString(
				<CompactTaskIdsProvider config={config}>
					<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />
				</CompactTaskIdsProvider>,
			);

		it("shows the number, with the full ID on hover and for screen readers", () => {
			const html = renderCard(on);
			expect(visibleText(html)).not.toContain("TASK-30");
			expect(visibleText(html)).toMatch(/\b30\b/);
			expect(html).toContain('title="TASK-30"');
			expect(html).toContain('aria-label="Open TASK-30: Compact id task"');
		});

		it("shows the full ID, without a tooltip repeating it, when the setting is off", () => {
			const html = renderCard();
			expect(visibleText(html)).toContain("TASK-30");
			expect(html).not.toContain('title="TASK-30"');
		});
	});

	describe("web task list", () => {
		const renderList = (config?: { compactTaskIds?: boolean }) =>
			renderToString(
				<MemoryRouter>
					<CompactTaskIdsProvider config={config}>
						<TaskList
							tasks={[task]}
							availableStatuses={["To Do", "Done"]}
							availableLabels={[]}
							availableMilestones={[]}
							milestoneEntities={[]}
							archivedMilestones={[]}
							onEditTask={() => {}}
							onNewTask={() => {}}
						/>
					</CompactTaskIdsProvider>
				</MemoryRouter>,
			);

		it("shows the number in the ID column, with the full ID on hover", () => {
			const html = renderList(on);
			expect(visibleText(html)).not.toContain("TASK-30");
			expect(html).toContain('title="TASK-30"');
		});

		it("shows the full ID, without a tooltip repeating it, when the setting is off", () => {
			const html = renderList();
			expect(visibleText(html)).toContain("TASK-30");
			expect(html).not.toContain('title="TASK-30"');
		});
	});

	describe("TUI board and task list", () => {
		it("shows the number on a board row when given the compact formatter", () => {
			const row = formatTaskListItem(task, false, undefined, undefined, undefined, (id) => formatCompactTaskId(id, on));
			expect(row).toContain("{bold}30{/bold}");
			expect(row).not.toContain("TASK-30");
		});

		it("shows the full ID by default", () => {
			expect(formatTaskListItem(task)).toContain("{bold}TASK-30{/bold}");
		});

		it("shows the number in the task list row too, and the full ID by default", () => {
			const row = formatTaskViewerListItem(task, undefined, undefined, undefined, undefined, (id) =>
				formatCompactTaskId(id, on),
			);
			expect(row).toContain("{bold}30{/bold}");
			expect(formatTaskViewerListItem(task)).toContain("{bold}TASK-30{/bold}");
		});
	});
});
