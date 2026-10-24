import type { BacklogConfig } from "../../types/index.ts";
import { getPriorityColor, type PriorityColor } from "../../utils/priority-config.ts";

type PriorityColorClasses = { badge: string; border: string; icon: string };

/** Tailwind classes per priority color, written out in full so the build keeps them. */
const PRIORITY_COLOR_CLASSES: Record<PriorityColor | "none", PriorityColorClasses> = {
	red: {
		badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
		border: "border-l-red-500 dark:border-l-red-400",
		icon: "text-red-500",
	},
	orange: {
		badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
		border: "border-l-orange-500 dark:border-l-orange-400",
		icon: "text-orange-500",
	},
	yellow: {
		badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
		border: "border-l-yellow-500 dark:border-l-yellow-400",
		icon: "text-yellow-500",
	},
	green: {
		badge: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
		border: "border-l-green-500 dark:border-l-green-400",
		icon: "text-green-500",
	},
	teal: {
		badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
		border: "border-l-teal-500 dark:border-l-teal-400",
		icon: "text-teal-500",
	},
	blue: {
		badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
		border: "border-l-blue-500 dark:border-l-blue-400",
		icon: "text-blue-500",
	},
	purple: {
		badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
		border: "border-l-purple-500 dark:border-l-purple-400",
		icon: "text-purple-500",
	},
	pink: {
		badge: "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200",
		border: "border-l-pink-500 dark:border-l-pink-400",
		icon: "text-pink-500",
	},
	gray: {
		badge: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
		border: "border-l-gray-500 dark:border-l-gray-400",
		icon: "text-gray-500",
	},
	none: {
		badge: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
		border: "border-l-gray-300 dark:border-l-gray-600",
		icon: "text-gray-400",
	},
};

/** The badge, card-border and icon classes of a priority, gray when it has no color. */
export function getPriorityColorClasses(
	priority: string | null | undefined,
	config?: Pick<BacklogConfig, "priorityColors"> | null,
): PriorityColorClasses {
	return PRIORITY_COLOR_CLASSES[getPriorityColor(priority, config) ?? "none"];
}
