import { Notice, setIcon, setTooltip } from 'obsidian';
import { RaindropItem, RaindropCollection } from './types';
import type { IRaindropToObsidian } from './main';

export class RaindropItemDetail {
    private containerEl: HTMLElement;
    private plugin: IRaindropToObsidian;
    private item: RaindropItem | null = null;

    constructor(containerEl: HTMLElement, plugin: IRaindropToObsidian) {
        this.containerEl = containerEl;
        this.plugin = plugin;
    }

    public render(item: RaindropItem) {
        this.item = item;
        this.containerEl.empty();
        this.containerEl.addClass('raindrop-item-detail-view');

        // Header: Title and Actions
        const header = this.containerEl.createDiv({ cls: 'raindrop-detail-header' });
        header.createEl('h2', { text: item.title });

        const actions = header.createDiv({ cls: 'raindrop-detail-actions' });
        
        // Add to Obsidian Button
        const addToObsidianBtn = actions.createEl('button', { cls: 'clickable-icon' });
        setIcon(addToObsidianBtn, 'download');
        setTooltip(addToObsidianBtn, 'Add to Obsidian');
        addToObsidianBtn.onclick = async () => {
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
                new Notice(`Created note for: ${item.title}`, 3000);
            } catch (error) {
                new Notice(`Failed to create note: ${error.message}`, 5000);
                console.error('Error creating note from item detail:', error);
            }
        };
        
        // Open Link Button
        const openLinkBtn = actions.createEl('button', { cls: 'clickable-icon' });
        setIcon(openLinkBtn, 'external-link');
        setTooltip(openLinkBtn, 'Open Link in Browser');
        openLinkBtn.onclick = () => window.open(item.link, '_blank');

        // Edit Button (Placeholder for future enhancement)
        const editBtn = actions.createEl('button', { cls: 'clickable-icon' });
        setIcon(editBtn, 'pencil');
        setTooltip(editBtn, 'Edit Bookmark (Not Implemented)');
        editBtn.onclick = () => new Notice('Edit functionality coming soon!', 2000);

        // Main Content
        const content = this.containerEl.createDiv({ cls: 'raindrop-detail-content' });

        // Metadata Section
        const metadata = content.createDiv({ cls: 'raindrop-detail-metadata' });
        
        // Link
        const linkEl = metadata.createDiv({ cls: 'raindrop-detail-field' });
        linkEl.createEl('span', { text: 'Link:', cls: 'raindrop-detail-label' });
        linkEl.createEl('a', { text: item.link, href: item.link, attr: { target: '_blank' }, cls: 'raindrop-detail-value' });

        // Type
        const typeEl = metadata.createDiv({ cls: 'raindrop-detail-field' });
        typeEl.createEl('span', { text: 'Type:', cls: 'raindrop-detail-label' });
        typeEl.createEl('span', { text: item.type.charAt(0).toUpperCase() + item.type.slice(1), cls: 'raindrop-detail-value' });

        // Collection
        const collectionEl = metadata.createDiv({ cls: 'raindrop-detail-field' });
        collectionEl.createEl('span', { text: 'Collection:', cls: 'raindrop-detail-label' });
        collectionEl.createEl('span', { text: item.collection?.title || 'Unsorted', cls: 'raindrop-detail-value' });

        // Created/Updated Dates
        const createdEl = metadata.createDiv({ cls: 'raindrop-detail-field' });
        createdEl.createEl('span', { text: 'Created:', cls: 'raindrop-detail-label' });
        createdEl.createEl('span', { text: new Date(item.created).toLocaleDateString(), cls: 'raindrop-detail-value' });

        const updatedEl = metadata.createDiv({ cls: 'raindrop-detail-field' });
        updatedEl.createEl('span', { text: 'Updated:', cls: 'raindrop-detail-label' });
        updatedEl.createEl('span', { text: new Date(item.lastUpdate).toLocaleDateString(), cls: 'raindrop-detail-value' });

        // Excerpt/Description
        if (item.excerpt) {
            content.createEl('h3', { text: 'Description' });
            content.createEl('p', { text: item.excerpt });
        }

        // Personal Note
        if (item.note) {
            content.createEl('h3', { text: 'Personal Note' });
            content.createEl('p', { text: item.note, cls: 'raindrop-personal-note' });
        }

        // Tags
        if (item.tags && item.tags.length > 0) {
            content.createEl('h3', { text: 'Tags' });
            const tagsEl = content.createDiv({ cls: 'raindrop-item-tags' });
            item.tags.forEach(tag => {
                tagsEl.createSpan({ text: `#${tag}`, cls: 'raindrop-tag' });
            });
        }

        // Cover Image
        if (item.cover) {
            content.createEl('h3', { text: 'Cover Image' });
            const imgEl = content.createEl('img', { attr: { src: item.cover, alt: 'Cover Image' } });
            imgEl.addClass('raindrop-detail-cover');
        }

        // Highlights (Placeholder)
        if (item.highlights && item.highlights.length > 0) {
            content.createEl('h3', { text: 'Highlights' });
            const highlightsEl = content.createEl('ul', { cls: 'raindrop-detail-highlights' });
            item.highlights.forEach(highlight => {
                const li = highlightsEl.createEl('li');
                li.createEl('p', { text: highlight.text, cls: 'raindrop-highlight-text' });
                if (highlight.note) {
                    li.createEl('p', { text: `Note: ${highlight.note}`, cls: 'raindrop-highlight-note' });
                }
            });
        }
    }

    public clear() {
        this.containerEl.empty();
        this.containerEl.removeClass('raindrop-item-detail-view');
        this.containerEl.createEl('h2', { text: 'Bookmarks' });
        this.containerEl.createEl('p', { text: 'Select a collection to view bookmarks.' });
    }
}
