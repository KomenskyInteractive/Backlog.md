import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { type BacklogConfig } from '../../types';
import { formatCompactTaskId } from '../../utils/task-id';

type CompactTaskIdsConfig = Pick<BacklogConfig, 'compactTaskIds' | 'prefixes'> | null | undefined;

const CompactTaskIdsContext = createContext<CompactTaskIdsConfig>(undefined);

/** Formats a task ID for the board and the task list, as `compact_task_ids` says. */
export const useCompactTaskId = () => {
	const config = useContext(CompactTaskIdsContext);
	return useCallback((taskId: string) => formatCompactTaskId(taskId, config), [config]);
};

interface CompactTaskIdsProviderProps {
	config: CompactTaskIdsConfig;
	children: React.ReactNode;
}

export const CompactTaskIdsProvider: React.FC<CompactTaskIdsProviderProps> = ({ config, children }) => {
	// Keyed on the two values it uses, so an unrelated config reload does not re-render every card.
	const compactTaskIds = config?.compactTaskIds;
	const taskPrefix = config?.prefixes?.task;
	const value = useMemo(
		() => ({ compactTaskIds, prefixes: taskPrefix ? { task: taskPrefix } : undefined }),
		[compactTaskIds, taskPrefix],
	);
	return <CompactTaskIdsContext.Provider value={value}>{children}</CompactTaskIdsContext.Provider>;
};
