import { describe, expect, it } from "bun:test";
import { FileSystem } from "../file-system/operations.ts";
import { BacklogServer } from "../server/index.ts";
import type { BacklogConfig } from "../types/index.ts";
import {
	getPriorityColor,
	PRIORITY_COLORS,
	type PriorityColor,
	resolvePriorityColors,
} from "../utils/priority-config.ts";
import { getPriorityColorClasses } from "../web/utils/priority-colors.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";

const priorities = ["Critical", "High", "Medium", "Low"];
const priorityColors: Record<string, PriorityColor> = {
	critical: "red",
	high: "orange",
	medium: "yellow",
	low: "green",
};

describe("priority colors", () => {
	describe("config.yml", () => {
		const parse = (content: string) =>
			new FileSystem(createUniqueTestDir("priority-colors-parse")).parseConfig(content);

		it("reads a block mapping, matching priority names case-insensitively", () => {
			const config = parse(
				'project_name: "P"\npriorities: ["Critical", "High"]\npriority_colors:\n  Critical: Red\n  "High": orange\n',
			);
			expect(config.priorityColors).toEqual({ critical: "red", high: "orange" });
		});

		it("reads a flow mapping", () => {
			expect(
				parse('project_name: "P"\npriorities: ["Very High"]\npriority_colors: {Very High: purple}\n').priorityColors,
			).toEqual({
				"very high": "purple",
			});
		});

		it("leaves colors unset when the key is absent or empty", () => {
			expect(parse('project_name: "P"\n').priorityColors).toBeUndefined();
			expect(parse('project_name: "P"\npriority_colors:\n').priorityColors).toBeUndefined();
		});

		it("refuses a color it does not know, naming the key and the valid colors", () => {
			const content = 'project_name: "P"\npriorities: ["Critical"]\npriority_colors:\n  Critical: crimson\n';
			expect(() => parse(content)).toThrow(/priority_colors/);
			expect(() => parse(content)).toThrow(/orange/);
		});

		it("keeps an entry for a priority that is not configured, so a renamed priority does not stop Backlog", () => {
			const content = 'project_name: "P"\npriorities: ["Urgent"]\npriority_colors:\n  Critical: red\n';
			expect(parse(content).priorityColors).toEqual({ critical: "red" });
			expect(getPriorityColor("urgent", parse(content))).toBeUndefined();
		});

		it("refuses the same priority listed twice in different letter case", () => {
			const content = 'project_name: "P"\npriorities: ["High"]\npriority_colors:\n  High: red\n  HIGH: blue\n';
			expect(() => parse(content)).toThrow(/HIGH/);
		});

		it("refuses a value that is not a mapping", () => {
			expect(() => parse('project_name: "P"\npriority_colors: [red, green]\n')).toThrow(/priority_colors/);
		});

		it("does not mistake the mapping's entries for top-level keys, before or after them", () => {
			const head = 'project_name: "P"\npriorities: ["date_format"]\n';
			const colors = "priority_colors:\n  date_format: red\n";
			for (const content of [
				`${head}${colors}date_format: dd/mm/yyyy\n`,
				`${head}date_format: dd/mm/yyyy\n${colors}`,
			]) {
				const config = parse(content);
				expect(config.dateFormat).toBe("dd/mm/yyyy");
				expect(config.priorityColors).toEqual({ date_format: "red" });
			}
		});

		it("survives a save, so the web settings page does not drop it", async () => {
			const testDir = createUniqueTestDir("priority-colors-round-trip");
			const filesystem = new FileSystem(testDir);
			try {
				await filesystem.ensureBacklogStructure();
				await filesystem.saveConfig({
					projectName: "Colors",
					statuses: ["To Do", "Done"],
					labels: [],
					priorities,
					priorityColors: { critical: "red", high: "orange" },
					dateFormat: "yyyy-mm-dd",
				});

				const reloaded = await new FileSystem(testDir).loadConfig();
				expect(reloaded?.priorityColors).toEqual({ critical: "red", high: "orange" });
			} finally {
				await safeCleanup(testDir);
			}
		});
	});

	describe("resolvePriorityColors", () => {
		it("normalizes names and colors of a valid mapping", () => {
			expect(resolvePriorityColors({ Critical: "Red", high: "orange" })).toEqual({
				colors: { critical: "red", high: "orange" },
			});
		});

		it("explains what is wrong with an invalid one, as the web settings save needs", () => {
			expect(resolvePriorityColors({ high: "crimson" })).toEqual({
				error: expect.stringContaining("crimson"),
			});
			expect(resolvePriorityColors({ high: "red\nauto_commit: true" })).toHaveProperty("error");
		});
	});

	describe("web settings save", () => {
		it("rejects an invalid color instead of writing a config Backlog cannot start with", async () => {
			const testDir = createUniqueTestDir("priority-colors-server");
			const filesystem = new FileSystem(testDir);
			const server = new BacklogServer(testDir);
			try {
				await filesystem.ensureBacklogStructure();
				const config: BacklogConfig = {
					projectName: "Colors",
					statuses: ["To Do", "Done"],
					labels: [],
					priorities,
					priorityColors: { critical: "red" },
					dateFormat: "yyyy-mm-dd",
				};
				await filesystem.saveConfig(config);
				await server.start(0, false);
				const put = (priorityColors: Record<string, string>) =>
					fetch(`http://127.0.0.1:${server.getPort()}/api/config`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ ...config, priorityColors }),
					});

				const rejected = await put({ critical: "crimson" });
				expect(rejected.status).toBe(400);
				expect((await new FileSystem(testDir).loadConfig())?.priorityColors).toEqual({ critical: "red" });

				const { priorities: _omitted, ...withoutPriorities } = config;
				const partial = await fetch(`http://127.0.0.1:${server.getPort()}/api/config`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...withoutPriorities, priorityColors: { critical: "red" } }),
				});
				expect(partial.status).toBe(200);

				expect((await put({ Critical: "Pink" })).status).toBe(200);
				expect((await new FileSystem(testDir).loadConfig())?.priorityColors).toEqual({ critical: "pink" });
			} finally {
				await server.stop();
				await safeCleanup(testDir);
			}
		});
	});

	describe("getPriorityColor", () => {
		it("uses the configured color, whatever the letter case of the priority", () => {
			expect(getPriorityColor("Critical", { priorityColors })).toBe("red");
			expect(getPriorityColor("HIGH", { priorityColors })).toBe("orange");
		});

		it("keeps the built-in colors for high, medium and low when they are not configured", () => {
			expect(getPriorityColor("high")).toBe("red");
			expect(getPriorityColor("medium", { priorityColors: { critical: "red" } })).toBe("yellow");
			expect(getPriorityColor("low")).toBe("green");
		});

		it("has no color for any other priority, or for none", () => {
			expect(getPriorityColor("critical")).toBeUndefined();
			expect(getPriorityColor(undefined, { priorityColors })).toBeUndefined();
		});
	});

	describe("web classes", () => {
		it("gives every color a badge and a card border in that color", () => {
			for (const color of PRIORITY_COLORS) {
				const classes = getPriorityColorClasses("p", { priorityColors: { p: color } });
				expect(classes.badge).toContain(`bg-${color}-`);
				expect(classes.border).toContain(`border-l-${color}-`);
			}
		});

		it("falls back to gray for a priority without a color", () => {
			const classes = getPriorityColorClasses("critical");
			expect(classes.badge).toContain("bg-gray-");
			expect(classes.border).toContain("border-l-gray-");
		});
	});
});
