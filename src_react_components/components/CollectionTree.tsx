// Modern Collection Tree Component
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Hash, Search, Filter } from 'lucide-react';
import clsx from 'clsx';
import { RaindropCollection } from '../types';

interface CollectionTreeProps {
  collections: RaindropCollection[];
  activeCollectionId: number | null;
  onSelectCollection: (collection: RaindropCollection) => void;
  enableAnimations?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

interface TreeNodeProps {
  collection: RaindropCollection;
  children: RaindropCollection[];
  level: number;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: (id: number) => void;
  onSelect: (collection: RaindropCollection) => void;
  enableAnimations: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  collection,
  children,
  level,
  isActive,
  isExpanded,
  onToggle,
  onSelect,
  enableAnimations,
}) => {
  const hasChildren = children.length > 0;
  const IconComponent = hasChildren ? (isExpanded ? FolderOpen : Folder) : Hash;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(collection._id);
    }
  }, [hasChildren, onToggle, collection._id]);

  const handleSelect = useCallback(() => {
    onSelect(collection);
  }, [onSelect, collection]);

  const nodeVariants = enableAnimations ? {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 },
  } : {};

  const getCollectionColor = (color?: string) => {
    if (!color) return 'text-muted-foreground';
    return `text-[${color}]`;
  };

  return (
    <motion.div
      variants={nodeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="select-none"
    >
      <div
        className={clsx(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-150',
          'hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-accent text-accent-foreground shadow-sm',
          !isActive && 'text-foreground'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="flex-shrink-0 p-0.5 rounded hover:bg-accent-foreground/10 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        )}

        {/* Collection Icon */}
        <div className={clsx(
          'flex-shrink-0',
          collection.color ? getCollectionColor(collection.color) : 'text-muted-foreground'
        )}>
          <IconComponent size={16} />
        </div>

        {/* Collection Name and Count */}
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <span className="text-sm font-medium truncate">
            {collection.title}
          </span>
          {collection.count !== undefined && collection.count > 0 && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
              {collection.count}
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: enableAnimations ? 0.2 : 0 }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <TreeNodeContainer
                key={child._id}
                collection={child}
                level={level + 1}
                {...{ onToggle, onSelect, enableAnimations, isActive: isActive }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Container to handle the tree structure recursively
const TreeNodeContainer: React.FC<{
  collection: RaindropCollection;
  level: number;
  onToggle: (id: number) => void;
  onSelect: (collection: RaindropCollection) => void;
  enableAnimations: boolean;
  isActive: boolean;
}> = (props) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const handleToggle = useCallback((id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <TreeNode
      {...props}
      children={[]} // Simplified for now - would need proper hierarchy
      isExpanded={expandedNodes.has(props.collection._id)}
      onToggle={handleToggle}
    />
  );
};

export const CollectionTree: React.FC<CollectionTreeProps> = ({
  collections,
  activeCollectionId,
  onSelectCollection,
  enableAnimations = true,
  searchTerm = '',
  onSearchChange,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Build hierarchy map
  const { rootCollections, hierarchyMap } = useMemo(() => {
    const map = new Map<number, RaindropCollection[]>();
    const roots: RaindropCollection[] = [];

    collections.forEach(collection => {
      const parentId = collection.parent?.$id;
      if (parentId) {
        if (!map.has(parentId)) {
          map.set(parentId, []);
        }
        map.get(parentId)!.push(collection);
      } else {
        roots.push(collection);
      }
    });

    return { rootCollections: roots, hierarchyMap: map };
  }, [collections]);

  // Filter collections based on search
  const filteredCollections = useMemo(() => {
    if (!localSearchTerm) return rootCollections;
    
    return collections.filter(collection =>
      collection.title.toLowerCase().includes(localSearchTerm.toLowerCase())
    );
  }, [rootCollections, collections, localSearchTerm]);

  const handleToggle = useCallback((id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setLocalSearchTerm(term);
    onSearchChange?.(term);
  }, [onSearchChange]);

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-lg">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">Collections</h2>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search collections..."
            value={localSearchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <motion.div
          initial={enableAnimations ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          className="space-y-1"
        >
          {filteredCollections.map((collection) => (
            <TreeNode
              key={collection._id}
              collection={collection}
              children={hierarchyMap.get(collection._id) || []}
              level={0}
              isActive={collection._id === activeCollectionId}
              isExpanded={expandedNodes.has(collection._id)}
              onToggle={handleToggle}
              onSelect={onSelectCollection}
              enableAnimations={enableAnimations}
            />
          ))}
        </motion.div>

        {filteredCollections.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No collections found</p>
            {localSearchTerm && (
              <p className="text-xs mt-1">Try a different search term</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
