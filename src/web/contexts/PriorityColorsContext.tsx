import React, { createContext, useCallback, useContext } from 'react';
import { type BacklogConfig } from '../../types';
import { getPriorityColorClasses } from '../utils/priority-colors';

const PriorityColorsContext = createContext<BacklogConfig['priorityColors']>(undefined);

/** The badge and card-border classes of a priority, colored as `priority_colors` says. */
export const usePriorityColorClasses = () => {
	const priorityColors = useContext(PriorityColorsContext);
	return useCallback((priority?: string) => getPriorityColorClasses(priority, { priorityColors }), [priorityColors]);
};

interface PriorityColorsProviderProps {
	priorityColors: BacklogConfig['priorityColors'];
	children: React.ReactNode;
}

export const PriorityColorsProvider: React.FC<PriorityColorsProviderProps> = ({ priorityColors, children }) => (
	<PriorityColorsContext.Provider value={priorityColors}>{children}</PriorityColorsContext.Provider>
);
