import { ItemView, WorkspaceLeaf, TFile, TFolder, Notice, setIcon, setTooltip } from 'obsidian';
import { RaindropItemDetail } from './RaindropItemDetail';
import type { IRaindropToObsidian } from './main';
import { RaindropCollection, RaindropItem } from './types';

export const RAINDROP_VIEW_TYPE = 'raindrop-view';

export class RaindropView extends ItemView {
    plugin: IRaindropToObsidian;
    private collections: RaindropCollection[] = [];
    private collectionMap: Map<number, RaindropCollection> = new Map();
    private collectionHierarchy: Map<number, number[]> = new Map(); // parentId -> childrenIds
    private itemsByCollection: Map<number, RaindropItem[]> = new Map();
    private activeCollectionId: number | null = null;
    private activeItem: RaindropItem | null = null;
    private treeContainer: HTMLElement;
    private searchInput: HTMLInputElement | null = null;
    private filteredItems: RaindropItem[] = [];
    private currentTab: 'list' | 'preview' = 'list';
    private tabsContainer: HTMLElement;
    private listTabContent: HTMLElement;
    private previewTabContent: HTMLElement;
    private itemDetailView: RaindropItemDetail;
    contentEl: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: IRaindropToObsidian) {
        super(leaf);
        this.plugin = plugin;
        this.contentEl = this.containerEl.children[1] as HTMLElement;
        this.contentEl.addClass('raindrop-dashboard');
    }

    getViewType() {
        return RAINDROP_VIEW_TYPE;
    }

    getDisplayText() {
        return 'Raindrop Dashboard';
    }

    getIcon() {
        return 'cloud-download';
    }

    async onOpen() {
        this.contentEl.empty();
        this.renderDashboard();
    }

    async onClose() {
        // Clean up any event listeners if necessary
    }

    private handleSearch() {
        if (!this.searchInput || !this.activeCollectionId) return;
        
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        const items = this.itemsByCollection.get(this.activeCollectionId) || [];
        
        if (!searchTerm) {
            this.filteredItems = items;
        } else {
            this.filteredItems = items.filter(item => 
                item.title.toLowerCase().includes(searchTerm) ||
                item.excerpt?.toLowerCase().includes(searchTerm) ||
                item.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }
        
        // Re-render the item list with filtered results
        const itemsListContainer = document.getElementById('raindrop-items-list');
        if (itemsListContainer) {
            this.renderItemList(this.filteredItems, itemsListContainer);
        }
    }

    private switchTab(tab: 'list' | 'preview') {
        this.currentTab = tab;
        
        // Update tab buttons
        const tabBtns = this.tabsContainer.parentElement?.querySelectorAll('.raindrop-tab-btn');
        tabBtns?.forEach((btn: any) => btn.removeClass('active'));
        
        if (tab === 'list') {
            (this.tabsContainer.parentElement?.querySelector('.raindrop-tab-btn:nth-child(1)') as any)?.addClass('active');
        } else {
            (this.tabsContainer.parentElement?.querySelector('.raindrop-tab-btn:nth-child(2)') as any)?.addClass('active');
        }
        
        // Update tab content
        this.listTabContent.removeClass('active');
        this.previewTabContent.removeClass('active');
        
        if (tab === 'list') {
            this.listTabContent.addClass('active');
        } else {
            this.previewTabContent.addClass('active');
        }
    }

    private async renderDashboard() {
        this.contentEl.empty();
        
        // Header with Title and Global Actions
        const header = this.contentEl.createDiv({ cls: 'raindrop-header' });
        header.createEl('h1', { text: 'RainSidian Dashboard' });

        const actions = header.createDiv({ cls: 'raindrop-actions' });
        
        // Search Bar
        const searchBar = actions.createDiv({ cls: 'raindrop-search-bar' });
        const searchInput = searchBar.createEl('input', { 
            type: 'text', 
            placeholder: 'Search bookmarks...',
            cls: 'search-input'
        }) as HTMLInputElement;
        setIcon(searchBar.createSpan({ cls: 'search-icon' }), 'search');
        
        // Store search input for filtering
        this.searchInput = searchInput;
        searchInput.addEventListener('input', () => this.handleSearch());

        // Add New Button
        const addButton = actions.createEl('button', { text: 'Add New', cls: 'mod-cta' });
        setIcon(addButton, 'plus');
        addButton.onclick = async () => {
            (this.plugin.app as any).commands.executeCommandById('raindrop-to-obsidian:add-new-bookmark');
        };

        // Main Content: Tab-based Layout
        const mainContent = this.contentEl.createDiv({ cls: 'raindrop-main-content' });
        
        // Tab Navigation
        const tabNav = mainContent.createDiv({ cls: 'raindrop-tab-nav' });
        
        const listTabBtn = tabNav.createEl('button', { text: 'Collections & List', cls: 'raindrop-tab-btn active' });
        listTabBtn.onclick = () => this.switchTab('list');
        
        const previewTabBtn = tabNav.createEl('button', { text: 'Preview', cls: 'raindrop-tab-btn' });
        previewTabBtn.onclick = () => this.switchTab('preview');

        // Tab Content Container
        this.tabsContainer = mainContent.createDiv({ cls: 'raindrop-tabs-container' });
        
        // Tab 1: Collections & List
        this.listTabContent = this.tabsContainer.createDiv({ cls: 'raindrop-tab-content active' });
        this.listTabContent.setAttr('data-tab', 'list');
        
        const listLayout = this.listTabContent.createDiv({ cls: 'raindrop-list-layout' });
        
        // Left: Collections Tree
        const collectionsPanel = listLayout.createDiv({ cls: 'raindrop-collections-panel' });
        collectionsPanel.createEl('h2', { text: 'Collections' });
        this.treeContainer = collectionsPanel.createDiv({ cls: 'raindrop-tree-container' });
        
        // Right: Items List
        const itemsPanel = listLayout.createDiv({ cls: 'raindrop-items-panel' });
        itemsPanel.createEl('h2', { text: 'Bookmarks' });
        const itemsListContainer = itemsPanel.createDiv({ cls: 'raindrop-items-list-container' });
        itemsListContainer.id = 'raindrop-items-list';
        
        // Tab 2: Preview/Details
        this.previewTabContent = this.tabsContainer.createDiv({ cls: 'raindrop-tab-content' });
        this.previewTabContent.setAttr('data-tab', 'preview');
        this.itemDetailView = new RaindropItemDetail(this.previewTabContent, this.plugin);
        this.itemDetailView.clear();

        // Fetch and render collections
        await this.fetchAndRenderCollections(this.treeContainer, true);
    }

    private async fetchAndRenderCollections(container: HTMLElement, initialLoad: boolean = false) {
        if (!this.plugin.settings.apiToken) {
            container.createEl('p', { text: 'Please set your Raindrop API token in the plugin settings to view collections.', cls: 'mod-warning' });
            return;
        }

        container.empty();
        const loadingEl = container.createEl('p', { text: 'Loading collections...' });

        try {
            this.collections = await this.plugin.fetchAllUserCollections();
            loadingEl.remove();

            if (this.collections.length === 0) {
                container.createEl('p', { text: 'No collections found.' });
                return;
            }

            this.buildHierarchy();
            this.renderTree(container);
            
            // On initial load, fetch items for the first root collection
            if (initialLoad) {
                const rootCollections = this.collectionHierarchy.get(0) || [];
                if (rootCollections.length > 0) {
                    this.setActiveCollection(rootCollections[0]);
                }
            }

        } catch (error) {
            loadingEl.remove();
            container.createEl('p', { text: 'Error loading collections. Check console for details.', cls: 'mod-error' });
            console.error('Error fetching collections for view:', error);
        }
    }

    private buildHierarchy() {
        this.collectionMap.clear();
        this.collectionHierarchy.clear();

        // 1. Map all collections by ID
        this.collections.forEach(col => {
            this.collectionMap.set(col._id, col);
        });

        // 2. Build the hierarchy (parent -> children)
        this.collections.forEach(col => {
            const parentId = col.parent?.$id || 0; // Use 0 for root collections
            if (!this.collectionHierarchy.has(parentId)) {
                this.collectionHierarchy.set(parentId, []);
            }
            this.collectionHierarchy.get(parentId)?.push(col._id);
        });
    }

    private renderTree(container: HTMLElement) {
        container.empty(); // Clear previous tree
        const rootCollections = this.collectionHierarchy.get(0) || [];
        const treeEl = container.createEl('ul', { cls: 'tree-view-root' });
        
        rootCollections.forEach(colId => {
            this.renderCollectionNode(colId, treeEl);
        });
    }

    private async setActiveCollection(collectionId: number) {
        // Remove active class from previous active collection
        this.treeContainer.querySelectorAll('.tree-item-self.is-active').forEach((el: any) => el.removeClass('is-active'));

        this.activeCollectionId = collectionId;
        
        // Add active class to new active collection
        const newActiveEl = this.treeContainer.querySelector(`.tree-item-self[data-collection-id="${this.activeCollectionId}"]`);
        (newActiveEl as any)?.addClass('is-active');
        
        // Update the items list container
        const itemsListContainer = document.getElementById('raindrop-items-list');
        if (!itemsListContainer) return;
        
        itemsListContainer.empty();
        const loadingEl = itemsListContainer.createEl('p', { text: 'Fetching bookmarks...' });
        
        try {
            const items = await this.plugin.fetchCollectionItems(collectionId);
            this.itemsByCollection.set(collectionId, items);
            this.filteredItems = items;
            loadingEl.remove();
            this.renderItemList(items, itemsListContainer);
            
        } catch (error) {
            loadingEl.remove();
            itemsListContainer.createEl('p', { text: 'Error fetching bookmarks.', cls: 'mod-error' });
            console.error('Error fetching items for collection:', error);
        }
    }

    private showItemDetail(item: RaindropItem) {
        this.activeItem = item;
        this.itemDetailView.render(item);
        
        // Remove active class from all item cards
        const itemsListContainer = document.getElementById('raindrop-items-list');
        itemsListContainer?.querySelectorAll('.raindrop-item-card.is-active').forEach((el: any) => el.removeClass('is-active'));
        
        // Add active class to the selected item card
        const activeCard = itemsListContainer?.querySelector(`.raindrop-item-card[data-item-id="${item._id}"]`);
        (activeCard as any)?.addClass('is-active');
        
        // Auto-switch to preview tab
        this.switchTab('preview');
    }

    private renderItemList(items: RaindropItem[], container: HTMLElement) {
        container.empty(); // Clear the right panel before rendering the list
        container.createEl('h2', { text: 'Bookmarks' });

        if (items.length === 0) {
            container.createEl('p', { text: 'No bookmarks found in this collection.' });
            return;
        }

        const listEl = container.createDiv({ cls: 'raindrop-item-list' });

        items.forEach(item => {
            const itemEl = listEl.createDiv({ cls: 'raindrop-item-card' });
            itemEl.setAttr('data-item-id', item._id); // Add data attribute for selection
            
            // Icon
            const iconEl = itemEl.createSpan({ cls: 'raindrop-item-icon' });
            let iconName = 'link';
            switch (item.type) {
                case 'article': iconName = 'file-text'; break;
                case 'image': iconName = 'image'; break;
                case 'video': iconName = 'film'; break;
                case 'document': iconName = 'file'; break;
                case 'audio': iconName = 'volume-2'; break;
            }
            setIcon(iconEl, iconName);
            setTooltip(iconEl, item.type.charAt(0).toUpperCase() + item.type.slice(1));

            // Content Wrapper
            const contentWrapper = itemEl.createDiv({ cls: 'raindrop-item-content-wrapper' });

            // Title and Link
            const titleEl = contentWrapper.createDiv({ cls: 'raindrop-item-title' });
            titleEl.createEl('a', { text: item.title, href: item.link, attr: { target: '_blank' } });
            
            // Excerpt
            if (item.excerpt) {
                contentWrapper.createEl('p', { text: item.excerpt, cls: 'raindrop-item-excerpt' });
            }

            // Tags
            if (item.tags && item.tags.length > 0) {
                const tagsEl = contentWrapper.createDiv({ cls: 'raindrop-item-tags' });
                item.tags.forEach(tag => {
                    tagsEl.createSpan({ text: `#${tag}`, cls: 'raindrop-tag' });
                });
            }

            // Click handler for item detail view
            itemEl.onclick = (e) => {
                // Prevent opening link when clicking on the card
                if (e.target instanceof HTMLAnchorElement) return;
                this.showItemDetail(item);
            };
        });
    }

    private renderCollectionNode(collectionId: number, parentEl: HTMLElement) {
        const collection = this.collectionMap.get(collectionId);
        if (!collection) return;

        const li = parentEl.createEl('li', { cls: 'tree-item is-collapsed' }); // Start collapsed
        const itemDiv = li.createDiv({ cls: 'tree-item-self' });
        itemDiv.setAttr('data-collection-id', collectionId);
        
        // Icon
        const iconEl = itemDiv.createSpan({ cls: 'tree-item-icon collapse-icon' });
        setIcon(iconEl, 'folder');

        // Title
        itemDiv.createSpan({ text: collection.title, cls: 'tree-item-inner' });
        
        // Count
        itemDiv.createSpan({ text: ` (${collection.count || 0})`, cls: 'tree-item-extra' });

        // Set active class
        if (this.activeCollectionId === collectionId) {
            itemDiv.addClass('is-active');
        }

        // Children list
        const childrenEl = li.createEl('ul', { cls: 'tree-view-children' });
        
        // Click handler for collection selection
        itemDiv.onclick = (e) => {
            e.stopPropagation();
            this.setActiveCollection(collectionId);
            
            // Toggle logic for the folder icon
            li.toggleClass('is-collapsed', !li.hasClass('is-collapsed'));
            setIcon(iconEl, li.hasClass('is-collapsed') ? 'folder' : 'folder-open');
        };

        // Render sub-collections
        const subCollections = this.collectionHierarchy.get(collectionId) || [];
        subCollections.forEach(subColId => {
            this.renderCollectionNode(subColId, childrenEl);
        });

        // Render items in this collection (only if expanded)
        // We will not render items in the tree view for now, as it clutters the UI.
        // The items will be rendered in the right panel.
        // The tree view is purely for navigation.
    }
}
