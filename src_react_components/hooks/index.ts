// React Hooks for Modern UI State Management
import { useState, useCallback, useEffect, useMemo } from 'react';
import { RaindropCollection, RaindropItem } from '../types';

// Hook for managing collection tree state
export function useCollectionTree(collections: RaindropCollection[]) {
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    const [selectedCollection, setSelectedCollection] = useState<RaindropCollection | null>(null);

    // Build hierarchy map
    const hierarchyMap = useMemo(() => {
        const map = new Map<number, RaindropCollection[]>();
        collections.forEach(collection => {
            const parentId = collection.parent?.$id || 0;
            if (!map.has(parentId)) {
                map.set(parentId, []);
            }
            map.get(parentId)!.push(collection);
        });
        return map;
    }, [collections]);

    const toggleExpanded = useCallback((collectionId: number) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(collectionId)) {
                next.delete(collectionId);
            } else {
                next.add(collectionId);
            }
            return next;
        });
    }, []);

    const isExpanded = useCallback((collectionId: number) => {
        return expandedNodes.has(collectionId);
    }, [expandedNodes]);

    const selectCollection = useCallback((collection: RaindropCollection) => {
        setSelectedCollection(collection);
    }, []);

    return {
        hierarchyMap,
        expandedNodes,
        selectedCollection,
        toggleExpanded,
        isExpanded,
        selectCollection
    };
}

// Hook for managing search and filtering
export function useSearch<T>(
    items: T[],
    searchFields: (keyof T)[],
    initialTerm: string = ''
) {
    const [searchTerm, setSearchTerm] = useState(initialTerm);
    const [debouncedTerm, setDebouncedTerm] = useState(initialTerm);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const filteredItems = useMemo(() => {
        if (!debouncedTerm) return items;

        const term = debouncedTerm.toLowerCase();
        return items.filter(item =>
            searchFields.some(field => {
                const value = item[field];
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(term);
                }
                if (Array.isArray(value)) {
                    return value.some(v => 
                        typeof v === 'string' && v.toLowerCase().includes(term)
                    );
                }
                return false;
            })
        );
    }, [items, searchFields, debouncedTerm]);

    return {
        searchTerm,
        setSearchTerm,
        filteredItems
    };
}

// Hook for managing item selection and modal state
export function useItemSelection(items: RaindropItem[]) {
    const [selectedItem, setSelectedItem] = useState<RaindropItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const selectItem = useCallback((item: RaindropItem) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        // Delay clearing the item to allow for exit animation
        setTimeout(() => setSelectedItem(null), 300);
    }, []);

    const selectNext = useCallback(() => {
        if (!selectedItem || items.length === 0) return;
        
        const currentIndex = items.findIndex(item => item._id === selectedItem._id);
        const nextIndex = (currentIndex + 1) % items.length;
        setSelectedItem(items[nextIndex]);
    }, [selectedItem, items]);

    const selectPrevious = useCallback(() => {
        if (!selectedItem || items.length === 0) return;
        
        const currentIndex = items.findIndex(item => item._id === selectedItem._id);
        const previousIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        setSelectedItem(items[previousIndex]);
    }, [selectedItem, items]);

    return {
        selectedItem,
        isModalOpen,
        selectItem,
        closeModal,
        selectNext,
        selectPrevious
    };
}

// Hook for managing layout and view preferences
export function useViewPreferences(initialLayout: 'grid' | 'list' | 'card' = 'card') {
    const [layout, setLayout] = useState(initialLayout);
    const [sortBy, setSortBy] = useState<'created' | 'title' | 'updated'>('created');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const sortedItems = useCallback(<T extends RaindropItem>(items: T[]): T[] => {
        return [...items].sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'updated':
                    comparison = new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime();
                    break;
                case 'created':
                default:
                    comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
                    break;
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }, [sortBy, sortOrder]);

    return {
        layout,
        setLayout,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        sortedItems
    };
}

// Hook for managing async operations with loading states
export function useAsyncOperation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async <T>(
        operation: () => Promise<T>,
        onSuccess?: (result: T) => void,
        onError?: (error: Error) => void
    ): Promise<T | null> => {
        setLoading(true);
        setError(null);

        try {
            const result = await operation();
            onSuccess?.(result);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            onError?.(err instanceof Error ? err : new Error(errorMessage));
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        loading,
        error,
        execute,
        clearError
    };
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
    items: any[],
    onSelect?: (item: any, index: number) => void,
    onEscape?: () => void
) {
    const [focusedIndex, setFocusedIndex] = useState(-1);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setFocusedIndex(prev => 
                        prev < items.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (focusedIndex >= 0 && focusedIndex < items.length) {
                        onSelect?.(items[focusedIndex], focusedIndex);
                    }
                    break;
                case 'Escape':
                    event.preventDefault();
                    onEscape?.();
                    setFocusedIndex(-1);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [items, focusedIndex, onSelect, onEscape]);

    return {
        focusedIndex,
        setFocusedIndex
    };
}
