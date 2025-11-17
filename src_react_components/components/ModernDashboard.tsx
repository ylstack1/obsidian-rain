// Modern Dashboard Component
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Grid, List, Settings, Plus, Filter, Download, RefreshCw, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';
import { CollectionTree } from './CollectionTree';
import { RaindropItemCard } from './RaindropItemCard';
import { ItemDetailModal } from './ItemDetailModal';
import { RaindropItem, RaindropCollection, MakeItRainSettings } from '../types';

interface ModernDashboardProps {
  collections: RaindropCollection[];
  items: RaindropItem[];
  settings: MakeItRainSettings;
  onLoadCollection: (collectionId: number) => Promise<void>;
  onAddToVault: (item: RaindropItem) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenSettings: () => void;
  loading?: boolean;
}

type ViewLayout = 'grid' | 'list' | 'card';
type SortOption = 'created' | 'title' | 'updated';

export const ModernDashboard: React.FC<ModernDashboardProps> = ({
  collections,
  items,
  settings,
  onLoadCollection,
  onAddToVault,
  onRefresh,
  onOpenSettings,
  loading = false,
}) => {
  const [activeCollection, setActiveCollection] = useState<RaindropCollection | null>(null);
  const [selectedItem, setSelectedItem] = useState<RaindropItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [layout, setLayout] = useState<ViewLayout>('card');
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'updated':
          return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
        case 'created':
        default:
          return new Date(b.created).getTime() - new Date(a.created).getTime();
      }
    });

    return filtered;
  }, [items, searchTerm, sortBy]);

  const handleSelectCollection = useCallback(async (collection: RaindropCollection) => {
    setActiveCollection(collection);
    await onLoadCollection(collection._id);
  }, [onLoadCollection]);

  const handleSelectItem = useCallback((item: RaindropItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedItem(null), 300); // Delay to allow animation
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const layoutIcons = {
    grid: LayoutGrid,
    list: List,
    card: Grid,
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Raindrop Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage your bookmarks with style
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={clsx(
                'p-2 rounded-md border border-border hover:bg-accent transition-colors',
                isRefreshing && 'animate-spin'
              )}
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
            
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-md border border-border hover:bg-accent transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Layout Controls */}
          <div className="flex items-center gap-1 border border-border rounded-md p-1">
            {(['grid', 'card', 'list'] as ViewLayout[]).map((layoutOption) => {
              const IconComponent = layoutIcons[layoutOption];
              return (
                <button
                  key={layoutOption}
                  onClick={() => setLayout(layoutOption)}
                  className={clsx(
                    'p-1.5 rounded transition-colors',
                    layout === layoutOption
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                  )}
                  title={`${layoutOption} view`}
                >
                  <IconComponent size={16} />
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="created">Sort by Created</option>
            <option value="updated">Sort by Updated</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-border bg-card/30">
          <CollectionTree
            collections={collections}
            activeCollectionId={activeCollection?._id || null}
            onSelectCollection={handleSelectCollection}
            enableAnimations={settings.enableAnimations}
            searchTerm=""
          />
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="mx-auto mb-4 animate-spin" size={32} />
                <p className="text-muted-foreground">Loading bookmarks...</p>
              </div>
            </div>
          ) : filteredAndSortedItems.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <Search className="mx-auto mb-4 text-muted-foreground/50" size={48} />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm ? 'No bookmarks found' : 'No bookmarks to display'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms or filters'
                    : activeCollection 
                      ? 'This collection appears to be empty'
                      : 'Select a collection from the sidebar to view bookmarks'
                  }
                </p>
                {!activeCollection && (
                  <button
                    onClick={() => collections[0] && handleSelectCollection(collections[0])}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/80 transition-colors"
                  >
                    Browse Collections
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              {/* Collection Header */}
              {activeCollection && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    {activeCollection.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {filteredAndSortedItems.length} bookmark{filteredAndSortedItems.length !== 1 ? 's' : ''}
                    {searchTerm && ` matching "${searchTerm}"`}
                  </p>
                </div>
              )}

              {/* Items Grid/List */}
              <motion.div
                layout
                className={clsx(
                  'gap-4',
                  layout === 'grid' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                  layout === 'card' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                  layout === 'list' && 'flex flex-col'
                )}
              >
                <AnimatePresence mode="popLayout">
                  {filteredAndSortedItems.map((item) => (
                    <RaindropItemCard
                      key={item._id}
                      item={item}
                      layout={layout}
                      onSelect={handleSelectItem}
                      onAddToVault={onAddToVault}
                      enableAnimations={settings.enableAnimations}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </main>
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddToVault={onAddToVault}
        enableAnimations={settings.enableAnimations}
      />
    </div>
  );
};
