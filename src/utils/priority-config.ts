import { PRIORITY_COLORS, type PriorityColor } from "../constants/index.ts";
import type { BacklogConfig } from "../types/index.ts";

export const DEFAULT_PRIORITY_OPTIONS = [
	{ label: "High", value: "high" },
	{ label: "Medium", value: "medium" },
	{ label: "Low", value: "low" },
] as const;

export type PriorityOption = {
	label: string;
	value: string;
};

export function normalizePriorityValue(value: string | null | undefined): string | undefined {
	const normalized = String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
	return normalized.length > 0 ? normalized : undefined;
}

export function getPriorityOptions(
	configOrPriorities?: Pick<BacklogConfig, "priorities"> | readonly string[] | null,
): PriorityOption[] {
	const configuredPriorities: readonly string[] = Array.isArray(configOrPriorities)
		? configOrPriorities
		: ((configOrPriorities as Pick<BacklogConfig, "priorities"> | null | undefined)?.priorities ?? []);
	const options: PriorityOption[] = [];
	const seen = new Set<string>();

	for (const entry of configuredPriorities) {
		const label = String(entry ?? "")
			.trim()
			.replace(/\s+/g, " ");
		const value = normalizePriorityValue(label);
		if (!value || seen.has(value)) {
			continue;
		}
		seen.add(value);
		options.push({ label, value });
	}

	return options.length > 0 ? options : DEFAULT_PRIORITY_OPTIONS.map((option) => ({ ...option }));
}

export function getPriorityValues(
	configOrPriorities?: Pick<BacklogConfig, "priorities"> | readonly string[] | null,
): string[] {
	return getPriorityOptions(configOrPriorities).map((option) => option.value);
}

export function getPriorityLabels(
	configOrPriorities?: Pick<BacklogConfig, "priorities"> | readonly string[] | null,
): string[] {
	return getPriorityOptions(configOrPriorities).map((option) => option.label);
}

export function resolvePriorityValue(
	value: string | null | undefined,
	configOrPriorities?: Pick<BacklogConfig, "priorities"> | readonly string[] | null,
): string | undefined {
	const normalized = normalizePriorityValue(value);
	if (!normalized) {
		return undefined;
	}
	const allowed = new Set(getPriorityValues(configOrPriorities));
	return allowed.has(normalized) ? normalized : undefined;
}

export function formatPriorityLabel(
	value: string | null | undefined,
	configOrPriorities?: Pick<BacklogConfig, "priorities"> | readonly string[] | null,
): string {
	const normalized = normalizePriorityValue(value);
	if (!normalized) {
		return "";
	}
	const configured = getPriorityOptions(configOrPriorities).find((option) => option.value === normalized);
	if (configured) {
		return configured.label;
	}
	return normalized
		.split(" ")
		.map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ""))
		.join(" ");
}

export function getPriorityRank(
	value: string | null | undefined,
	configOrPriorities?: Pick<BacklogConfig, "priorities"> | readonly string[] | null,
): number {
	const normalized = normalizePriorityValue(value);
	if (!normalized) {
		return 0;
	}
	const values = getPriorityValues(configOrPriorities);
	const index = values.indexOf(normalized);
	return index === -1 ? 0 : values.length - index;
}

export function formatValidPriorityValues(
	configOrPriorities?: Pick<BacklogConfig, "priorities"> | readonly string[] | null,
): string {
	return getPriorityLabels(configOrPriorities).join(", ");
}

/** Colors of the default priorities, kept for projects that do not set `priority_colors`. */
const DEFAULT_PRIORITY_COLORS: Record<string, PriorityColor> = { high: "red", medium: "yellow", low: "green" };

function isPriorityColor(value: string): value is PriorityColor {
	return (PRIORITY_COLORS as readonly string[]).includes(value);
}

/** The color of a priority: the configured one, else the default for high, medium and low, else none. */
export function getPriorityColor(
	value: string | null | undefined,
	config?: Pick<BacklogConfig, "priorityColors"> | null,
): PriorityColor | undefined {
	const normalized = normalizePriorityValue(value);
	if (!normalized) {
		return undefined;
	}
	const configured = config?.priorityColors;
	if (configured && Object.hasOwn(configured, normalized)) {
		return configured[normalized];
	}
	return Object.hasOwn(DEFAULT_PRIORITY_COLORS, normalized) ? DEFAULT_PRIORITY_COLORS[normalized] : undefined;
}

/**
 * Validate a priority-to-color mapping, normalizing names and colors. Returns the problem instead of
 * guessing when a color is unknown or one priority is listed twice. Names need not be configured: an
 * entry left behind by a renamed priority colors nothing, and must not stop Backlog.
 */
export function resolvePriorityColors(
	mapping: Record<string, unknown>,
): { colors: Record<string, PriorityColor> } | { error: string } {
	const colors: Record<string, PriorityColor> = {};
	for (const [priority, rawColor] of Object.entries(mapping)) {
		const name = normalizePriorityValue(priority);
		if (!name) continue;
		const color = String(rawColor ?? "")
			.trim()
			.toLowerCase();
		if (!color) {
			return { error: `"${priority}" has no color; use one of: ${PRIORITY_COLORS.join(", ")}` };
		}
		if (!isPriorityColor(color)) {
			return { error: `"${color}" is not a color for "${priority}"; use one of: ${PRIORITY_COLORS.join(", ")}` };
		}
		if (Object.hasOwn(colors, name)) {
			return { error: `"${priority}" is listed more than once` };
		}
		colors[name] = color;
	}
	return { colors };
}
