// Modern React-powered RaindropView with MDX support
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { ModernDashboard } from './components/ModernDashboard';
import { RaindropCollection, RaindropItem } from './types';
import type { IRaindropToObsidian } from './main';

export const RAINDROP_VIEW_TYPE = 'raindrop-modern-view';

export class ModernRaindropView extends ItemView {
    plugin: IRaindropToObsidian;
    private collections: RaindropCollection[] = [];
    private currentItems: RaindropItem[] = [];
    private reactRoot: ReactDOM.Root | null = null;
    private loading = false;

    constructor(leaf: WorkspaceLeaf, plugin: IRaindropToObsidian) {
        super(leaf);
        this.plugin = plugin;
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
        this.contentEl.addClass('raindrop-modern-dashboard');
        
        // Load the modern styles
        this.loadModernStyles();
        
        this.renderReactApp();
    }

    async onClose() {
        if (this.reactRoot) {
            this.reactRoot.unmount();
            this.reactRoot = null;
        }
    }

    private loadModernStyles() {
        // Check if modern styles are already loaded
        if (document.getElementById('raindrop-modern-styles')) {
            return;
        }

        // Create and inject the modern styles
        const styleEl = document.createElement('link');
        styleEl.id = 'raindrop-modern-styles';
        styleEl.rel = 'stylesheet';
        styleEl.href = 'app://obsidian.md/styles_modern.css';
        document.head.appendChild(styleEl);

        // Fallback: inject critical CSS directly if file loading fails
        styleEl.onerror = () => {
            const fallbackStyles = document.createElement('style');
            fallbackStyles.id = 'raindrop-modern-styles-fallback';
            fallbackStyles.textContent = `
                .raindrop-modern-dashboard {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: var(--background-primary);
                    font-family: var(--font-interface);
                }
                
                .raindrop-modern-dashboard * {
                    box-sizing: border-box;
                }
                
                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    font-size: var(--font-ui-medium);
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 200ms ease;
                    border: 1px solid transparent;
                }
                
                .btn-primary {
                    background: var(--interactive-accent);
                    color: var(--text-on-accent);
                }
                
                .btn-primary:hover {
                    background: var(--interactive-accent-hover);
                }
                
                .loading-spinner {
                    width: 2rem;
                    height: 2rem;
                    border: 2px solid var(--background-modifier-border);
                    border-radius: 50%;
                    border-top-color: var(--interactive-accent);
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(fallbackStyles);
        };
    }

    private renderReactApp() {
        // Create React root if it doesn't exist
        if (!this.reactRoot) {
            this.reactRoot = ReactDOM.createRoot(this.contentEl);
        }

        // Render the modern dashboard
        this.reactRoot.render(
            React.createElement(ModernDashboard, {
                collections: this.collections,
                items: this.currentItems,
                settings: this.plugin.settings,
                loading: this.loading,
                onLoadCollection: this.handleLoadCollection.bind(this),
                onAddToVault: this.handleAddToVault.bind(this),
                onRefresh: this.handleRefresh.bind(this),
                onOpenSettings: this.handleOpenSettings.bind(this)
            })
        );
    }

    private async handleLoadCollection(collectionId: number): Promise<void> {
        this.loading = true;
        this.renderReactApp();

        try {
            this.currentItems = await this.plugin.fetchCollectionItems(collectionId);
        } catch (error) {
            console.error('Error loading collection items:', error);
            new Notice('Failed to load collection items', 5000);
            this.currentItems = [];
        } finally {
            this.loading = false;
            this.renderReactApp();
        }
    }

    private async handleAddToVault(item: RaindropItem): Promise<void> {
        try {
            await this.plugin.createRaindropNote({
                title: item.title,
                url: item.link,
                excerpt: item.excerpt || '',
                cover: item.cover || '',
                tags: item.tags ? [...item.tags] : [],
                note: item.note || '',
                collectionId: item.collection?.$id || 0,
                collectionName: item.collection?.title || 'Unsorted'
            });
            new Notice(`Added "${item.title}" to vault`, 3000);
        } catch (error) {
            console.error('Error adding item to vault:', error);
            new Notice('Failed to add item to vault', 5000);
            throw error;
        }
    }

    private async handleRefresh(): Promise<void> {
        this.loading = true;
        this.renderReactApp();

        try {
            // Refresh collections
            this.collections = await this.plugin.fetchAllUserCollections();
            
            // If there's a currently selected collection, refresh its items too
            // This would require tracking the current collection ID, which we can add later
            
        } catch (error) {
            console.error('Error refreshing data:', error);
            new Notice('Failed to refresh data', 5000);
        } finally {
            this.loading = false;
            this.renderReactApp();
        }
    }

    private handleOpenSettings(): void {
        // Open the plugin settings tab
        (this.app as any).setting.open();
        (this.app as any).setting.openTabById(this.plugin.manifest.id);
    }

    // Public methods for external access
    public async refreshCollections(): Promise<void> {
        try {
            this.collections = await this.plugin.fetchAllUserCollections();
            this.renderReactApp();
        } catch (error) {
            console.error('Error refreshing collections:', error);
            new Notice('Failed to refresh collections', 5000);
        }
    }

    public updateItems(items: RaindropItem[]): void {
        this.currentItems = items;
        this.renderReactApp();
    }

    public setLoading(loading: boolean): void {
        this.loading = loading;
        this.renderReactApp();
    }
}
