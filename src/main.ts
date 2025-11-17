/**
 * Make It Rain: Raindrop.io Integration for Obsidian
 * ================================================
 * 
 * This plugin allows users to fetch bookmarks from Raindrop.io and create Markdown notes from them.
 * The code follows a modular architecture with utility functions separated into dedicated modules
 * to promote code reuse and maintainability.
 * 
 * Core components:
 * - Main plugin class (RaindropToObsidian): Handles plugin initialization and settings
 * - Modal UI (RaindropFetchModal): Provides user interface for fetching raindrops
 * - Settings tab (RaindropSettingTab): Manages plugin configuration
 * - Utility modules: Separated into file and API utilities for better organization
 * 
 * The plugin uses functional programming patterns where appropriate, with pure functions
 * and immutable data structures to improve code reliability and testability.
 */

import { App, Notice, Plugin, PluginSettingTab, Setting, Modal, TextComponent, TextAreaComponent, ButtonComponent, ToggleComponent, PluginManifest, TFile, TAbstractFile, normalizePath, TFolder, DropdownComponent } from 'obsidian';

import { RAINDROP_VIEW_TYPE, RaindropView } from './RaindropView';
// Modern view temporarily disabled for build compatibility
// import { RAINDROP_VIEW_TYPE as MODERN_VIEW_TYPE, ModernRaindropView } from './ModernRaindropView';
import { createNoteContent, saveNote } from './utils/noteUtils';
import { request, RequestUrlParam } from 'obsidian';
import { MakeItRainSettings, RaindropType, CONTENT_TYPES, ModalFetchOptions } from './types';

// Import utility functions from consolidated index
// These utilities follow functional programming patterns and handle file operations and API interactions
import { 
    // File utilities
    sanitizeFileName,
    doesPathExist,
    isPathAFolder,
    createFolder,
    createFolderStructure,
    
    // API utilities
    RateLimiter,
    createRateLimiter,
    createAuthenticatedRequestOptions,
    buildCollectionApiUrl,
    parseApiResponse,
    handleRequestError,
    fetchWithRetry,
    extractCollectionData,
    
    // YAML utilities
    createYamlFrontmatter,
    formatYamlValue,

} from './utils';
import { fetchMetadataFromUrl } from './utils/webScrapingUtils';

// Constants for type unions - following Raindrop.io API types
const RaindropTypes = {
    LINK: 'link',
    ARTICLE: 'article',
    IMAGE: 'image',
    VIDEO: 'video',
    DOCUMENT: 'document',
    AUDIO: 'audio'
} as const;

// Use imported RaindropType instead of redefining
type TagMatchType = 'all' | 'any';
const TagMatchTypes = {
    ALL: 'all' as const,
    ANY: 'any' as const
};

// System collection IDs from Raindrop.io API docs
const SystemCollections = {
    UNSORTED: -1,
    TRASH: -99
} as const;

type SystemCollectionId = typeof SystemCollections[keyof typeof SystemCollections];

// Raindrop.io API Types - following official documentation structure
interface RaindropItem {
    readonly _id: number;
    readonly title: string;
    readonly excerpt?: string;
    readonly note?: string;
    readonly link: string;
    readonly cover?: string;
    // Timestamps in ISO 8601 format as per API docs
    readonly created: string; // YYYY-MM-DDTHH:MM:SSZ
    readonly lastUpdate: string; // YYYY-MM-DDTHH:MM:SSZ
    readonly tags?: readonly string[];
    readonly collection?: {
        readonly $id: number;
        readonly title: string;
    };
    readonly highlights?: ReadonlyArray<{
        readonly text: string;
        readonly note?: string;
        readonly color?: string;
        readonly created: string;
    }>;
    readonly type: RaindropType;
    // Additional fields that might be returned but not documented
    readonly [key: string]: any;
}

interface RaindropResponse {
    readonly result: boolean;
    readonly items: readonly RaindropItem[];
    readonly count?: number;
    readonly collectionId?: number;
}

// Add a constant for filter types, extending the RaindropTypes with 'all' option
const FilterTypes = {
    ...RaindropTypes,
    ALL: 'all'
} as const;

type FilterType = typeof FilterTypes[keyof typeof FilterTypes];

// Add new interface for Collection info
interface RaindropCollection {
    readonly _id: number;
    readonly title: string;
    readonly parent?: {
        readonly $id: number;
    };
    readonly access?: {
        readonly level: number;
        readonly draggable: boolean;
    };
    readonly color?: string; // HEX color
    readonly count?: number; // Count of raindrops
    readonly cover?: readonly string[];
    readonly created?: string; // YYYY-MM-DDTHH:MM:SSZ
    readonly expanded?: boolean; // Whether sub-collections are expanded
    readonly lastUpdate?: string; // YYYY-MM-DDTHH:MM:SSZ
    readonly public?: boolean; // Whether publicly accessible
    readonly sort?: number; // Order (descending)
    readonly view?: 'list' | 'simple' | 'grid' | 'masonry';
    // Additional fields that might be returned but not documented
    readonly [key: string]: any;
}

interface CollectionResponse {
    readonly result: boolean;
    readonly items: readonly RaindropCollection[];
}

// Helper function to get the full path segments from the root collection down to the given ID
const getFullPathSegments = (collectionId: number, hierarchy: Map<number, { title: string, parentId?: number }>, idToNameMap: Map<number, string>): string[] => {
    const segments: string[] = [];
    let currentId: number | undefined = collectionId;
    const pathIds: number[] = [];

    // Traverse upwards from the current ID to collect all ancestor IDs
    while (currentId !== undefined && currentId !== 0 && currentId !== SystemCollections.UNSORTED && currentId !== SystemCollections.TRASH) {
         pathIds.push(currentId);
         const collection = hierarchy.get(currentId);
         if (!collection || collection.parentId === undefined) {
              break; // Stop if collection not found or no parent defined
         }
         currentId = collection.parentId;
    }

    // Reverse the collected IDs and find their names to build the path from root down
    pathIds.reverse();

    for (const id of pathIds) {
         const name = idToNameMap.get(id);
         if (name) {
              // Use the imported sanitizeFileName utility directly as this is a standalone function
              const sanitizedName = sanitizeFileName(name);
              if(sanitizedName) segments.push(sanitizedName);
         } else {
             // If name not found, add a placeholder or skip?
             // For now, let's add a placeholder to indicate the missing segment
             segments.push(`Unknown_Collection_${id}`);
         }
    }

    return segments;
};

const DEFAULT_SETTINGS: MakeItRainSettings = {
    apiToken: '',
    defaultFolder: '',
    fileNameTemplate: '{{title}}',
    showRibbonIcon: true,
    bannerFieldName: 'banner',
    isTemplateSystemEnabled: true,
    // New modern UI settings
    enableMdxSupport: true,
    enableModernUI: true,
    useCardLayout: true,
    enableAnimations: true,
    colorTheme: 'auto',
    compactMode: false,
    defaultTemplate: `---
title: "{{title}}"
source: {{link}}
type: {{type}}
created: {{created}}
lastupdate: {{lastupdate}}
id: {{id}}
collectionId: {{collectionId}}
collectionTitle: "{{collectionTitle}}"
collectionPath: "{{collectionPath}}"
{{#if collectionParentId}}collectionParentId: {{collectionParentId}}{{/if}}
tags:
{{#each tags}}
  - {{this}}
{{/each}}
{{#if cover}}
{{bannerFieldName}}: {{cover}}
{{/if}}
---

{{#if cover}}
![{{title}}]({{cover}})
{{/if}}

# {{title}}

{{#if excerpt}}
## Description
{{excerpt}}
{{/if}}

{{#if note}}
## Notes
{{note}}
{{/if}}

{{#if highlights}}
## Highlights
{{#each highlights}}
- {{text}}
{{#if note}}  *Note:* {{note}}{{/if}}
{{/each}}
{{/if}}

---
## Details
- **Type**: {{renderedType}}
- **Domain**: {{domain}}
- **Created**: {{formattedCreatedDate}}
- **Updated**: {{formattedUpdatedDate}}
- **Tags**: {{formattedTags}}
`,
    contentTypeTemplates: {
        link: `---
title: "{{title}}"
source: {{link}}
type: {{type}}
created: {{created}}
lastupdate: {{lastupdate}}
id: {{id}}
collectionId: {{collectionId}}
collectionTitle: "{{collectionTitle}}"
collectionPath: "{{collectionPath}}"
{{#if collectionParentId}}collectionParentId: {{collectionParentId}}{{/if}}
tags:
{{#each tags}}
  - {{this}}
{{/each}}
{{#if cover}}
{{bannerFieldName}}: {{cover}}
{{/if}}
---

{{#if cover}}
![{{title}}]({{cover}})
{{/if}}

# {{title}}

{{#if excerpt}}
## Description
{{excerpt}}
{{/if}}

{{#if note}}
## Notes
{{note}}
{{/if}}

{{#if highlights}}
## Highlights
{{#each highlights}}
- {{text}}
{{#if note}}  *Note:* {{note}}{{/if}}
{{/each}}
{{/if}}

---
## Details
- **Type**: {{renderedType}}
- **Domain**: {{domain}}
- **Created**: {{formattedCreatedDate}}
- **Updated**: {{formattedUpdatedDate}}
- **Tags**: {{formattedTags}}

[Source]({{link}})`,
        article: `---
title: "{{title}}"
source: {{link}}
type: {{type}}
created: {{created}}
lastupdate: {{lastupdate}}
id: {{id}}
collectionId: {{collectionId}}
collectionTitle: "{{collectionTitle}}"
collectionPath: "{{collectionPath}}"
{{#if collectionParentId}}collectionParentId: {{collectionParentId}}{{/if}}
tags:
{{#each tags}}
  - {{this}}
{{/each}}
{{#if cover}}
{{bannerFieldName}}: {{cover}}
{{/if}}
---

{{#if cover}}
![{{title}}]({{cover}})
{{/if}}

# {{title}}

{{#if excerpt}}
## Summary
{{excerpt}}
{{/if}}

{{#if note}}
## Notes
{{note}}
{{/if}}

{{#if highlights}}
## Key Points
{{#each highlights}}
> {{text}}
{{#if note}}  *Note:* {{note}}{{/if}}
{{/each}}
{{/if}}

---
## Details
- **Type**: {{renderedType}}
- **Domain**: {{domain}}
- **Created**: {{formattedCreatedDate}}
- **Updated**: {{formattedUpdatedDate}}
- **Tags**: {{formattedTags}}

[Read Article]({{link}})`,
        image: `---
title: "{{title}}"
source: {{link}}
type: {{type}}
created: {{created}}
lastupdate: {{lastupdate}}
id: {{id}}
collectionId: {{collectionId}}
collectionTitle: "{{collectionTitle}}"
collectionPath: "{{collectionPath}}"
{{#if collectionParentId}}collectionParentId: {{collectionParentId}}{{/if}}
tags:
{{#each tags}}
  - {{this}}
{{/each}}
{{bannerFieldName}}: {{cover}}
---

![{{title}}]({{cover}})

{{#if excerpt}}
*{{excerpt}}*
{{/if}}

{{#if note}}
## Notes
{{note}}
{{/if}}

---
## Details
- **Type**: {{renderedType}}
- **Domain**: {{domain}}
- **Created**: {{formattedCreatedDate}}
- **Updated**: {{formattedUpdatedDate}}
- **Tags**: {{formattedTags}}

[View Original]({{link}})`,
        video: `---
title: "{{title}}"
source: {{link}}
type: {{type}}
created: {{created}}
lastupdate: {{lastupdate}}
id: {{id}}
collectionId: {{collectionId}}
collectionTitle: "{{collectionTitle}}"
collectionPath: "{{collectionPath}}"
{{#if collectionParentId}}collectionParentId: {{collectionParentId}}{{/if}}
tags:
{{#each tags}}
  - {{this}}
{{/each}}
{{#if cover}}
{{bannerFieldName}}: {{cover}}
{{/if}}
---

{{#if cover}}
![{{title}}]({{cover}})
{{/if}}

# {{title}}

{{#if excerpt}}
## Description
{{excerpt}}
{{/if}}

{{#if highlights}}
## Timestamps
{{#each highlights}}
- {{text}}
{{#if note}}  *Comment:* {{note}}{{/if}}
{{/each}}
{{/if}}

{{#if note}}
## Notes
{{note}}
{{/if}}

---
## Details
- **Type**: {{renderedType}}
- **Domain**: {{domain}}
- **Created**: {{formattedCreatedDate}}
- **Updated**: {{formattedUpdatedDate}}
- **Tags**: {{formattedTags}}

[Watch Video]({{link}})`,
        document: `---
title: "{{title}}"
source: {{link}}
type: {{type}}
created: {{created}}
lastupdate: {{lastupdate}}
id: {{id}}
collectionId: {{collectionId}}
collectionTitle: "{{collectionTitle}}"
collectionPath: "{{collectionPath}}"
{{#if collectionParentId}}collectionParentId: {{collectionParentId}}{{/if}}
tags:
{{#each tags}}
  - {{this}}
{{/each}}
{{#if cover}}
{{bannerFieldName}}: {{cover}}
{{/if}}
---

# {{title}}

{{#if excerpt}}
## Summary
{{excerpt}}
{{/if}}

{{#if highlights}}
## Key Points
{{#each highlights}}
- {{text}}
{{#if note}}  *Note:* {{note}}{{/if}}
{{/each}}
{{/if}}

{{#if note}}
## Notes
{{note}}
{{/if}}

---
## Details
- **Type**: {{renderedType}}
- **Domain**: {{domain}}
- **Created**: {{formattedCreatedDate}}
- **Updated**: {{formattedUpdatedDate}}
- **Tags**: {{formattedTags}}

[Open Document]({{link}})`,
        audio: `---
title: "{{title}}"
source: {{link}}
type: {{type}}
created: {{created}}
lastupdate: {{lastupdate}}
id: {{id}}
collectionId: {{collectionId}}
collectionTitle: "{{collectionTitle}}"
collectionPath: "{{collectionPath}}"
{{#if collectionParentId}}collectionParentId: {{collectionParentId}}{{/if}}
tags:
{{#each tags}}
  - {{this}}
{{/each}}
{{#if cover}}
{{bannerFieldName}}: {{cover}}
{{/if}}
---

{{#if cover}}
![{{title}}]({{cover}})
{{/if}}

# {{title}}

{{#if excerpt}}
## Description
{{excerpt}}
{{/if}}

{{#if highlights}}
## Timestamps
{{#each highlights}}
- {{text}}
{{#if note}}  *Comment:* {{note}}{{/if}}
{{/each}}
{{/if}}

{{#if note}}
## Notes
{{note}}
{{/if}}

---
## Details
- **Type**: {{renderedType}}
- **Domain**: {{domain}}
- **Created**: {{formattedCreatedDate}}
- **Updated**: {{formattedUpdatedDate}}
- **Tags**: {{formattedTags}}

[Listen to Audio]({{link}})`
    },
    contentTypeTemplateToggles: {
        link: true,
        article: true,
        image: true,
        video: true,
        document: true,
        audio: true
    }
};

// Rate limiting and retry utilities are now imported from './utils/apiUtils'

/**
 * Configuration options for API requests with retry capability
 */
interface FetchWithRetryOptions {
    url: string;
    requestOptions: RequestInit;
    rateLimiter: RateLimiter;
    maxRetries?: number;
    delayBetweenRetries?: number;
}

/**
// All API utility functions moved to apiUtils.ts and imported via index.ts
}

/**
 * Validates the parameters for the fetch operation
 */
function validateFetchParameters(url: string, options: RequestInit): void {
    const isUrlValid = typeof url === 'string';
    if (!isUrlValid) {
        throw new Error('URL must be a string');
    }
    
    const areOptionsValid = options && typeof options === 'object';
    if (!areOptionsValid) {
        throw new Error('Request options must be an object');
    }
}

/**
 * Collection API interaction - functional approach
 */

// Function moved to apiUtils.ts and imported via index.ts

// Function moved to apiUtils.ts and imported via index.ts

// Function moved to apiUtils.ts and imported via index.ts

/**
 * Fetches collection information with error handling and rate limiting
 * Uses functional composition by breaking the process into smaller, focused operations
 * @param app - The Obsidian app instance
 * @param collectionId - The ID of the collection to fetch
 * @param apiToken - The API token for authentication
 * @param rateLimiter - Rate limiter to prevent API throttling
 * @returns Promise resolving to collection data or null if unavailable
 */
/**
 * Fetches collection information from Raindrop.io API
 * Utilizes utility functions from apiUtils module for better modularity
 * @param app - Obsidian app instance
 * @param collectionId - Raindrop collection ID
 * @param apiToken - Raindrop API token
 * @param rateLimiter - Rate limiter instance
 * @returns Collection information or null if not found
 */
async function fetchCollectionInfo(app: App, collectionId: string, apiToken: string, rateLimiter: RateLimiter): Promise<RaindropCollection | null> {
    const requestOptions = createAuthenticatedRequestOptions(apiToken);
    const apiUrl = buildCollectionApiUrl(collectionId);

    try {
        const apiResponse = await fetchWithRetry(app, apiUrl, requestOptions, rateLimiter);
        // Use the imported extractCollectionData function from utils
        return extractCollectionData(apiResponse) as RaindropCollection;
    } catch (error) {
        // Non-fatal error - we can continue without collection info
        // The items will be placed in the base folder instead
        const errorMessage = error instanceof Error ? error.message : 'unknown error';
        console.error(`Error fetching collection ${collectionId}: ${errorMessage}`);
        return null;
    }
}

// Function moved inside the RaindropToObsidian class

// Forward declare the plugin class for the modal
interface NewRaindropNoteData {
    title: string;
    url: string; // Changed from link to url
    excerpt: string;
    cover: string;
    tags: string[];
    vaultPath?: string;
    note: string; // Added note
    collectionId: number; // Added collectionId
    collectionName: string; // Added collectionName
}



class AddNewBookmarkModal extends Modal {
    plugin: IRaindropToObsidian;
    vaultPath: string;
    url: string = '';
    title: string = '';
    description: string = '';
    cover: string = '';
    tags: string = '';
    note: string = '';
    collectionId: number = 0;
    collectionName: string = 'Unsorted';
    collections: RaindropCollection[] = [];
    collectionMap: Map<number, RaindropCollection> = new Map();
    collectionHierarchy: Map<number, number[]> = new Map();
    
    private titleTextComponent: TextComponent;
    private descriptionTextComponent: TextComponent;
    private coverTextComponent: TextComponent;
    private fetchButton: ButtonComponent;
    private collectionSelect: DropdownComponent;

    constructor(app: App, plugin: IRaindropToObsidian) {
        super(app);
        this.plugin = plugin;
        this.vaultPath = this.plugin.settings.defaultFolder;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.addClass('add-new-bookmark-modal');

        contentEl.createEl('h2', { text: 'Add New Bookmark' });

        // --- URL Input and Fetch ---
        let urlTextComponent: TextComponent;
        new Setting(contentEl)
            .setName('URL')
            .setDesc('Enter the URL of the bookmark to add.')
            .setClass('setting-item-stacked')
            .addText((text: TextComponent) => {
                urlTextComponent = text;
                text.setPlaceholder('https://example.com')
                    .setValue(this.url)
                    .onChange((value: string) => {
                        this.url = value.trim();
                        this.fetchButton.setDisabled(!this.url);
                    });
                text.inputEl.style.width = '100%';
            })
            .addButton((button: ButtonComponent) => {
                this.fetchButton = button;
                button.setButtonText('Fetch Metadata')
                    .setCta()
                    .setDisabled(!this.url)
                    .onClick(async () => {
                        if (!this.url) {
                            new Notice('Please enter a URL first.', 3000);
                            return;
                        }
                        this.fetchButton.setDisabled(true).setButtonText('Fetching...');
                        try {
                            const metadata = await fetchMetadataFromUrl(this.url);
                            this.title = metadata.title || 'Untitled Bookmark';
                            this.description = metadata.description || '';
                            this.cover = metadata.cover || '';
                            
                            // Update the form fields
                            this.titleTextComponent.setValue(this.title);
                            this.descriptionTextComponent.setValue(this.description);
                            // this.coverTextComponent.setValue(this.cover); // Removed for now as it's not a TextComponent
                            
                            new Notice('Metadata fetched successfully!', 3000);
                        } catch (error) {
                            new Notice('Failed to fetch metadata. Please check the URL.', 5000);
                            console.error('Metadata fetch error:', error);
                        } finally {
                            this.fetchButton.setDisabled(false).setButtonText('Fetch Metadata');
                        }
                    });
            });

        // --- Fetched Data Fields ---
        contentEl.createEl('h3', { text: 'Bookmark Details' });

        // Title
        new Setting(contentEl)
            .setName('Title')
            .setClass('setting-item-stacked')
            .addText((text: TextComponent) => {
                this.titleTextComponent = text;
                text.setPlaceholder('Title')
                    .setValue(this.title)
                    .onChange((value: string) => {
                        this.title = value.trim();
                    });
                text.inputEl.style.width = '100%';
            });

        // Excerpt/Description
        new Setting(contentEl)
            .setName('Excerpt/Description')
            .setClass('setting-item-stacked')
            .addTextArea((text: TextAreaComponent) => {
                this.descriptionTextComponent = text as any;
                text.setPlaceholder('Short description or excerpt')
                    .setValue(this.description)
                    .onChange((value: string) => {
                        this.description = value.trim();
                    });
                text.inputEl.style.width = '100%';
            });

        // Cover
        new Setting(contentEl)
            .setName('Cover Image URL')
            .setClass('setting-item-stacked')
            .addText((text: TextComponent) => {
                // this.coverTextComponent = text; // This was causing an error because it was not declared as a private property
                text.setPlaceholder('Optional image URL')
                    .setValue(this.cover)
                    .onChange((value: string) => {
                        this.cover = value.trim();
                    });
                text.inputEl.style.width = '100%';
            });

        // Note
        new Setting(contentEl)
            .setName('Note')
            .setDesc('Your personal note for this bookmark.')
            .setClass('setting-item-stacked')
            .addTextArea((text: TextAreaComponent) => {
                text.setPlaceholder('Your personal note')
                    .setValue(this.note)
                    .onChange((value: string) => {
                        this.note = value.trim();
                    });
                text.inputEl.style.width = '100%';
            });

        // Tags
        new Setting(contentEl)
            .setName('Tags')
            .setDesc('Comma-separated tags (e.g., tag1, tag2)')
            .setClass('setting-item-stacked')
            .addText((text: TextComponent) => {
                text.setPlaceholder('e.g., web, read-later')
                    .setValue(this.tags)
                    .onChange((value: string) => {
                        this.tags = value.trim();
                    });
                text.inputEl.style.width = '100%';
            });

        // Collection Select
        new Setting(contentEl)
            .setName('Collection')
            .setDesc('Select the Raindrop collection to save this bookmark to.')
            .addDropdown((dropdown) => {
                this.collectionSelect = dropdown;
                dropdown.addOption('0', 'Unsorted'); // Default option
                
                this.plugin.fetchAllUserCollections().then(collections => {
                    this.collections = collections;
                    this.buildHierarchy();
                    
                    // Add collections to dropdown
                    this.collections.forEach(col => {
                        const path = this.getFullPath(col._id);
                        dropdown.addOption(col._id.toString(), path);
                    });

                    // Set initial value
                    const initialCollection = this.collections.find(col => col._id === this.collectionId);
                    if (initialCollection) {
                        dropdown.setValue(this.collectionId.toString());
                    } else {
                        dropdown.setValue('0');
                    }

                    dropdown.onChange((value: string) => {
                        this.collectionId = parseInt(value);
                        const selectedCollection = this.collectionMap.get(this.collectionId);
                        this.collectionName = selectedCollection ? selectedCollection.title : 'Unsorted';
                    });
                }).catch(error => {
                    new Notice('Failed to load collections.', 7000);
                    console.error('Error loading collections in modal:', error);
                });
            });

        // --- Action Buttons ---
        const buttonsEl = contentEl.createDiv({ cls: 'modal-button-container' });

        new ButtonComponent(buttonsEl)
            .setButtonText('Add Bookmark')
            .setCta()
            .onClick(async () => {
                if (!this.url || !this.title) {
                    new Notice('URL and Title are required.', 3000);
                    return;
                }
                this.close();
                
                const tagsArray = this.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

                await this.plugin.createRaindropNote({
                    title: this.title,
                    url: this.url,
                    excerpt: this.description,
                    cover: this.cover,
                    tags: tagsArray,
                    vaultPath: this.vaultPath || undefined,
                    note: this.note,
                    collectionId: this.collectionId,
                    collectionName: this.collectionName
                });
            });

        new ButtonComponent(buttonsEl)
            .setButtonText('Cancel')
            .onClick(() => {
                this.close();
            });
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

    private getFullPath(collectionId: number): string {
        const segments: string[] = [];
        let currentId: number | undefined = collectionId;

        while (currentId !== undefined && currentId !== 0) {
            const collection = this.collectionMap.get(currentId);
            if (!collection) break;
            segments.push(collection.title);
            currentId = collection.parent?.$id;
        }

        return segments.reverse().join(' > ');
    }
}

export interface IRaindropToObsidian extends Plugin {
    settings: MakeItRainSettings;
    fetchAllUserCollections(): Promise<RaindropCollection[]>;
    fetchCollectionItems(collectionId: number): Promise<RaindropItem[]>;
    fetchRaindrops(options: ModalFetchOptions): Promise<void>; // Added missing method
    fetchSingleRaindrop(itemId: number, vaultPath?: string, appendTags?: string): Promise<void>;
    createRaindropNote(data: NewRaindropNoteData): Promise<void>;
    activateView(): Promise<void>;
}

export default class RaindropToObsidian extends Plugin implements IRaindropToObsidian {
    settings: MakeItRainSettings;
    private rateLimiter: RateLimiter;
    private ribbonIconEl: HTMLElement | undefined;
    private isRibbonShown: boolean = false;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.settings = { ...DEFAULT_SETTINGS };
        this.rateLimiter = createRateLimiter();
    }

    async onload() {
        await this.loadSettings();

        // Register classic view (modern view temporarily disabled)
        this.registerView(
            RAINDROP_VIEW_TYPE,
            (leaf) => new RaindropView(leaf, this)
        );

        // TODO: Re-enable modern view after React setup is complete
        // this.registerView(
        //     MODERN_VIEW_TYPE,
        //     (leaf) => new ModernRaindropView(leaf, this)
        // );

        this.addCommand({
            id: 'open-raindrop-dashboard',
            name: 'Open Raindrop Dashboard',
            callback: () => this.activateView(),
        });

        // Modern dashboard temporarily disabled
        // this.addCommand({
        //     id: 'open-modern-raindrop-dashboard',
        //     name: 'Open Modern Raindrop Dashboard',
        //     callback: () => this.activateModernView(),
        // });

this.addCommand({
            id: 'add-new-bookmark-modal',
            name: 'Add New Bookmark (Modal)',
            callback: () => {
                new AddNewBookmarkModal(this.app, this).open();
            },
        });

        this.addCommand({ // New command for Quick Import
            id: 'add-new-bookmark',
            name: 'Add New Bookmark from URL',
            callback: async () => {
                new AddNewBookmarkModal(this.app, this).open();
            }
        });

        // Update ribbon icon based on settings
        this.updateRibbonIcon();

        this.addSettingTab(new RaindropToObsidianSettingTab(this.app, this));
        console.log('Make It Rain plugin loaded!');
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(RAINDROP_VIEW_TYPE);
        this.ribbonIconEl?.remove();
        console.log('Make It Rain plugin unloaded.');
    }

    async loadSettings(): Promise<void> {
        const savedData = await this.loadData();
        
        // Start with complete default settings
        this.settings = { ...DEFAULT_SETTINGS };
        
        if (savedData) {
            // Merge saved data, but preserve default templates if empty
            const mergedSettings = {
                ...this.settings,
                ...savedData,
                contentTypeTemplates: {
                    ...this.settings.contentTypeTemplates,
                    ...Object.fromEntries(
                        Object.entries(savedData.contentTypeTemplates || {}).map(([key, value]) => [
                            key,
                            (value as string).trim() === '' ? this.settings.contentTypeTemplates[key as RaindropType] : value
                        ])
                    )
                },
                contentTypeTemplateToggles: {
                    ...this.settings.contentTypeTemplateToggles,
                    ...(savedData.contentTypeTemplateToggles || {})
                }
            };
            
            this.settings = mergedSettings;
        }
        
        await this.saveSettings();
    }

    private getTemplateForType(type: RaindropType, options: ModalFetchOptions): string {
        if (options.useDefaultTemplate) {
            return this.settings.defaultTemplate;
        }

        const shouldUseTypeTemplate = options.overrideTemplates || 
            (this.settings.contentTypeTemplateToggles[type] && 
             this.settings.contentTypeTemplates[type]?.trim() !== '');

        return shouldUseTypeTemplate ? this.settings.contentTypeTemplates[type] : this.settings.defaultTemplate;
    }

    /**
     * Generates a file name based on the provided raindrop data and settings
     * @param raindrop - The raindrop data to use for file name generation
     * @param useRaindropTitleForFileName - Whether to use the raindrop title for the file name
     * @returns The generated file name
     */
    generateFileName(raindrop: any, useRaindropTitleForFileName: boolean): string {
        // Use the template from settings if title is enabled, otherwise use ID
        const fileNameTemplate = useRaindropTitleForFileName ? this.settings.fileNameTemplate : '{{id}}';
        let fileName = fileNameTemplate;
        
        const replacePlaceholder = (placeholder: string, value: string) => {
            const safeValue = sanitizeFileName(value);
            const regex = new RegExp(`{{${placeholder}}}`, 'gi');
            fileName = fileName.replace(regex, safeValue);
        };

        try {
            replacePlaceholder('title', raindrop.title || 'Untitled');
            replacePlaceholder('id', (raindrop._id || 'unknown_id').toString()); // Use _id consistently
            replacePlaceholder('collectionTitle', raindrop.collection?.title || 'No Collection');

            const createdDate = raindrop.created ? new Date(raindrop.created) : null;
            let formattedDate = 'no_date';
            if (createdDate && !isNaN(createdDate.getTime())) {
                formattedDate = createdDate.toISOString().split('T')[0];
            }
            replacePlaceholder('date', formattedDate);

        } catch (error) {
            let errorMsg = 'template processing error';
            if (error instanceof Error) errorMsg = error.message;
            console.error("Error processing file name template:", errorMsg, error);
            new Notice("Error generating file name. Check console or template.");
            return "Error_Filename_" + Date.now();
        }

        let finalFileName = sanitizeFileName(fileName);
        if (!finalFileName.trim()) {
            return "Unnamed_Raindrop_" + (raindrop._id || Date.now()); // Use _id consistently
        }
        return finalFileName;
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
    
    sanitizeFileName(name: string): string {
        // Use the functional utility instead of duplicating the logic
        return sanitizeFileName(name);
    }
    
    /**
     * Update the ribbon icon based on settings
     */
    updateRibbonIcon(): void {
        // Remove existing icon if it exists
        this.ribbonIconEl?.remove();
        this.ribbonIconEl = undefined; // Clear the reference

        // Add icon if setting is enabled
        if (this.settings.showRibbonIcon) {
            this.ribbonIconEl = this.addRibbonIcon(
                'cloud-download', // Obsidian icon ID for cloud download
                'Open Raindrop Dashboard', // Tooltip text
                () => {
                    // Callback function when the icon is clicked
                    this.activateView();
                }
            );
        }
    }

    async fetchRaindrops(options: ModalFetchOptions) {
        const baseApiUrl = 'https://api.raindrop.io/rest/v1';
        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.settings.apiToken}`
            }
        };

        const loadingNotice = new Notice('Starting Raindrop fetch...', 0); // 0 duration makes it persistent

        try {
            let allData: RaindropItem[] = [];
            const perPage = 50; // Max items per page allowed by Raindrop.io API

            // Add error handling for API token
            if (!this.settings.apiToken) {
                loadingNotice.hide();
                new Notice('Please configure your Raindrop.io API token in the plugin settings.', 10000);
                return;
            }

            // --- Resolve Collection Names/IDs and Fetch Hierarchy ---
            let resolvedCollectionIds: number[] = [];
            const collectionNameToIdMap = new Map<string, number>();
            const collectionIdToNameMap = new Map<number, string>();
            const collectionHierarchy = new Map<number, { title: string, parentId?: number }>();

            let collectionsData: CollectionResponse | undefined = undefined;

            // Always fetch all collections if options.collections is provided to build complete hierarchy
            if (options.collections) {
                const collectionInputs = options.collections.split(',').map((input: string) => input.trim()).filter((input: string) => input !== '');

                loadingNotice.setMessage('Fetching user collections...');

                // Fetch root collections
                const rootCollectionsResponse = await fetchWithRetry(
                    `${baseApiUrl}/collections`,
                    fetchOptions,
                    this.rateLimiter
                );
                const rootCollectionsData = rootCollectionsResponse as CollectionResponse;

                // Fetch nested collections
                const nestedCollectionsResponse = await fetchWithRetry(
                    `${baseApiUrl}/collections/childrens`,
                    fetchOptions,
                    this.rateLimiter
                );
                const nestedCollectionsData = nestedCollectionsResponse as CollectionResponse;

                // Combine root and nested collections
                let allCollections: RaindropCollection[] = [];
                if (rootCollectionsData?.result && rootCollectionsData?.items) {
                    allCollections = allCollections.concat(rootCollectionsData.items);
                }
                if (nestedCollectionsData?.result && nestedCollectionsData?.items) {
                    allCollections = allCollections.concat(nestedCollectionsData.items);
                }

                // If neither call was successful or no collections returned
                if (allCollections.length === 0) {
                    console.error('API Error fetching collections: No collections returned from both endpoints.');
                    loadingNotice.hide();
                    new Notice('Error fetching user collections. Please check your API token and connection.', 10000);
                    return; // Stop the fetch process
                }

                // Build the hierarchy and name/ID maps from all collections
                allCollections.forEach(col => {
                    collectionNameToIdMap.set(col.title.toLowerCase(), col._id);
                    collectionIdToNameMap.set(col._id, col.title);
                    collectionHierarchy.set(col._id, { title: col.title, parentId: col.parent?.$id });
                });
                collectionsData = { result: true, items: allCollections }; // Store combined data

                const unresolvedInputs: string[] = [];

                // Resolve input names/IDs to get resolvedCollectionIds
                for (const input of collectionInputs) {
                    const inputAsNumber = parseInt(input, 10);
                    if (!isNaN(inputAsNumber)) {
                        // Input is a number, treat as ID
                        // Verify if this ID exists in the fetched collections
                        if (collectionIdToNameMap.has(inputAsNumber)) {
                            resolvedCollectionIds.push(inputAsNumber);
                        } else {
                            unresolvedInputs.push(input); // ID not found in fetched collections
                            console.warn(`Could not find collection with ID: ${input}`);
                        }
                    } else {
                        // Input is text, treat as name
                        const resolvedId = collectionNameToIdMap.get(input.toLowerCase());
                        if (resolvedId !== undefined) {
                            resolvedCollectionIds.push(resolvedId);
                        } else {
                            unresolvedInputs.push(input);
                            console.warn(`Could not resolve collection name: ${input}`);
                        }
                    }
                }

                if (unresolvedInputs.length > 0) {
                    new Notice(`Could not find collections: ${unresolvedInputs.join(', ')}. Please check names or use IDs.`, 15000);
                    // Decide whether to continue with resolved IDs or stop. For now, continue.
                }

                // If user provided input but none could be resolved
                if (resolvedCollectionIds.length === 0 && collectionInputs.length > 0) {
                    loadingNotice.hide();
                    new Notice('No valid collection IDs or names provided.', 5000);
                    return;
                }

                // Ensure unique IDs in resolvedCollectionIds
                resolvedCollectionIds = Array.from(new Set(resolvedCollectionIds));

            } else {
                // If options.collections is empty, fetch from all collections (collectionId 0)
                // We still need to fetch collection hierarchy to organize notes properly
                loadingNotice.setMessage('Fetching all collections...');

                // Fetch root collections
                const rootCollectionsResponse = await fetchWithRetry(
                    `${baseApiUrl}/collections`,
                    fetchOptions,
                    this.rateLimiter
                );
                const rootCollectionsData = rootCollectionsResponse as CollectionResponse;

                // Fetch nested collections
                const nestedCollectionsResponse = await fetchWithRetry(
                    `${baseApiUrl}/collections/childrens`,
                    fetchOptions,
                    this.rateLimiter
                );
                const nestedCollectionsData = nestedCollectionsResponse as CollectionResponse;

                // Combine root and nested collections
                let allCollections: RaindropCollection[] = [];
                if (rootCollectionsData?.result && rootCollectionsData?.items) {
                    allCollections = allCollections.concat(rootCollectionsData.items);
                }
                if (nestedCollectionsData?.result && nestedCollectionsData?.items) {
                    allCollections = allCollections.concat(nestedCollectionsData.items);
                }

                if (allCollections.length === 0) {
                    console.error('API Error fetching collections: No collections returned from both endpoints.');
                    loadingNotice.hide();
                    new Notice('Error fetching user collections. Please check your API token and connection.', 10000);
                    return; // Stop the fetch process
                }

                // Build the hierarchy and name/ID maps from all collections
                allCollections.forEach(col => {
                    collectionNameToIdMap.set(col.title.toLowerCase(), col._id);
                    collectionIdToNameMap.set(col._id, col.title);
                    collectionHierarchy.set(col._id, { title: col.title, parentId: col.parent?.$id });
                });

                collectionsData = { result: true, items: allCollections };
            }
            // --- End Resolve Collection Names/IDs and Fetch Hierarchy ---

            const searchParameterString = options.apiFilterTags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '').join(' '); // Space-separated for AND logic

            let fetchMode: 'collections' | 'tags' | 'all' = 'all';

            // If user specified collections OR tags, we treat it as filtered fetch
            // Even if collections field is empty, if tags are present, we fetch via tags endpoint (collectionId 0)
            if (resolvedCollectionIds.length > 0) {
                fetchMode = 'collections';
            } else if (searchParameterString || (options.tagMatchType === TagMatchTypes.ANY && options.apiFilterTags.length > 0)) {
                fetchMode = 'tags';
            }

            // Fetch raindrops based on the determined mode

            if (fetchMode === 'collections') {
                // Fetch from specified collection IDs
                for (const collectionId of resolvedCollectionIds) {
                    let hasMore = true;
                    let page = 0;

                    // Construct the API URL with filter type and search if specified
                    const collectionApiBaseUrl = `${baseApiUrl}/raindrops/${collectionId}`;

                    while (hasMore) {
                        const params = new URLSearchParams({
                            perpage: perPage.toString(),
                            page: page.toString()
                        });
                        // Add filter type to params if not 'all'
                        if (options.filterType && options.filterType !== 'all') {
                            params.append('type', options.filterType);
                        }
                        // Add search parameter if it exists (for filtering within a collection)
                        if (searchParameterString) {
                            params.append('search', searchParameterString);
                        }
                        // Add nested parameter if includeSubcollections is true
                        if (options.includeSubcollections) {
                            params.append('nested', 'true');
                        }

                        const currentApiUrl = `${collectionApiBaseUrl}?${params.toString()}`;
                        console.log(`Requesting items from collection ID: ${collectionId}`, currentApiUrl);

                        // Get collection name for notice message (optional)
                        const collectionNameForNotice = collectionIdToNameMap.get(collectionId) || collectionId.toString();

                        loadingNotice.setMessage(`Fetching from collection: ${collectionNameForNotice}, page ${page + 1}...`);

                        const response = await fetchWithRetry(
                            currentApiUrl,
                            fetchOptions,
                            this.rateLimiter
                        );
                        const data = response as RaindropResponse;

                        if (!data.result) {
                            console.error(`API Error for collection ${collectionId}:`, data);
                            new Notice(`Error fetching collection: ${collectionNameForNotice}. Skipping.`, 7000);
                            hasMore = false; // Stop fetching for this collection
                            continue; // Move to the next specified collection
                        }

                        if (data?.items) {
                            allData = allData.concat(data.items);
                            page++;
                            hasMore = data.items.length === perPage;
                            console.log(`Fetched ${data.items.length} items from collection ${collectionId}, page ${page}`);
                            if (hasMore) { // Update message only if there's more to fetch
                                loadingNotice.setMessage(`Fetching from collection: ${collectionNameForNotice}, page ${page + 1}...`); // Use name in message
                            }
                        } else {
                            console.warn(`Unexpected response for collection ${collectionId}. Stopping.`);
                            hasMore = false;
                        }
                    }
                }
            } else if (fetchMode === 'tags') {
                // Fetch based on tags (uses collectionId 0 endpoint)
                if (options.tagMatchType === TagMatchTypes.ANY && options.apiFilterTags.length > 0) {
                    // Implementation of OR logic for tags (fetch each tag separately)
                    const uniqueItems = new Map<number, RaindropItem>();

                    const tagsArray = options.apiFilterTags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '');

                    for (const tag of tagsArray) {
                        let hasMore = true;
                        let page = 0;

                        while (hasMore) {
                            const params = new URLSearchParams({
                                perpage: perPage.toString(),
                                page: page.toString(),
                                search: `#${tag}` // Simple, reliable single-tag search
                            });

                            // Add filter type to params if not 'all'
                            if (options.filterType && options.filterType !== 'all') {
                                params.append('type', options.filterType);
                            }

                            const currentApiUrl = `${baseApiUrl}/raindrops/0?${params.toString()}`;
                            console.log(`Requesting items with tag: ${tag}`, currentApiUrl);
                            loadingNotice.setMessage(`Fetching items with tag: ${tag}, page ${page + 1}...`);

                            const response = await fetchWithRetry(
                                currentApiUrl,
                                fetchOptions,
                                this.rateLimiter
                            );
                            const data = response as RaindropResponse;

                            if (!data.result) {
                                console.error(`API Error for tag ${tag}:`, data);
                                continue; // Skip this tag if there's an error, but continue with others
                            }

                            console.log(`API Response for tag ${tag}:`, {
                                result: data.result,
                                itemCount: data?.items?.length || 0,
                                totalCount: data?.count || 0
                            });

                            if (data?.items) {
                                // Store items in Map using _id as key to automatically handle duplicates
                                data.items.forEach(item => {
                                    if (!uniqueItems.has(item._id)) {
                                        uniqueItems.set(item._id, item);
                                    }
                                });

                                page++;
                                hasMore = data.items.length === perPage; // Continue if we got a full page
                                console.log(`Fetched ${data.items.length} items for tag ${tag}, page ${page}`);
                                if (hasMore) { // Update message only if there's more to fetch
                                    loadingNotice.setMessage(`Fetching items with tag: ${tag}, page ${page + 1}...`);
                                }
                            } else {
                                hasMore = false;
                            }
                        }
                    }

                    // Convert the Map values back to an array for processing
                    allData = Array.from(uniqueItems.values());
                    console.log(`Total unique items found across all tags: ${allData.length}`);

                } else if (searchParameterString) {
                    // Original AND logic or single tag search using the simple space-separated format
                    let hasMore = true;
                    let page = 0;

                    while (hasMore) {
                        const params = new URLSearchParams({
                            perpage: perPage.toString(),
                            page: page.toString(),
                            search: searchParameterString // This handles space-separated tags for AND logic
                        });

                        // Add filter type to params if not 'all'
                        if (options.filterType && options.filterType !== 'all') {
                            params.append('type', options.filterType);
                        }

                        const currentApiUrl = `${baseApiUrl}/raindrops/0?${params.toString()}`;
                        console.log(`Requesting items with tags: ${searchParameterString}`, currentApiUrl);
                        loadingNotice.setMessage(`Fetching items with tags: ${searchParameterString}, page ${page + 1}...`);

                        const response = await fetchWithRetry(
                            currentApiUrl,
                            fetchOptions,
                            this.rateLimiter
                        );
                        const data = response as RaindropResponse;

                        if (!data.result) {
                            console.error('API Error for tag search:', data);
                            throw new Error(`API Error: ${JSON.stringify(data)}`);
                        }

                        if (data?.items) {
                            allData = allData.concat(data.items);
                            page++;
                            hasMore = data.items.length === perPage;
                            console.log(`Fetched ${data.items.length} items with tags, page ${page}`);
                            if (hasMore) { // Update message only if there's more to fetch
                                loadingNotice.setMessage(`Fetching items with tags: ${searchParameterString}, page ${page + 1}...`);
                            }
                        } else {
                            hasMore = false;
                        }
                    }
                }
            } else {
                // Fetch mode is 'all' - fetch all items (collectionId 0)
                let hasMore = true;
                let page = 0;

                while (hasMore) {
                    const params = new URLSearchParams({ perpage: perPage.toString(), page: page.toString() });

                    // Add filter type to params if not 'all'
                    if (options.filterType && options.filterType !== 'all') {
                        params.append('type', options.filterType);
                    }

                    const currentApiUrl = `${baseApiUrl}/raindrops/0?${params.toString()}`;
                    console.log('Requesting all items:', currentApiUrl);
                    loadingNotice.setMessage(`Fetching all items, page ${page + 1}...`);

                    const response = await fetchWithRetry(
                        currentApiUrl,
                        fetchOptions,
                        this.rateLimiter
                    );
                    const data = response as RaindropResponse;

                    if (!data.result) {
                        console.error('API Error for all items fetch:', data);
                        throw new Error(`API Error: ${JSON.stringify(data)}`);
                    }

                    if (data?.items) {
                        allData = allData.concat(data.items);
                        page++;
                        hasMore = data.items.length === perPage;
                        console.log(`Fetched ${data.items.length} items, page ${page}`);
                        if (hasMore) { // Update message only if there's more to fetch
                            loadingNotice.setMessage(`Fetching all items, page ${page + 1}...`);
                        }
                    } else {
                        console.warn('Unexpected response for all items fetch. Stopping.');
                        hasMore = false;
                    }
                }
            }

            if (allData.length === 0) {
                if (resolvedCollectionIds.length > 0 || searchParameterString || (options.tagMatchType === TagMatchTypes.ANY && options.apiFilterTags.length > 0)) {
                    loadingNotice.hide(); // Dismiss loading notice
                    new Notice('No raindrops found matching your criteria.', 5000);
                } else {
                    loadingNotice.hide(); // Dismiss loading notice
                    new Notice('No raindrops found in your account.', 5000);
                }
            } else {
                loadingNotice.setMessage(`Found ${allData.length} raindrops. Applying type filter...`);

                // Apply type filter if specified
                let filteredData = allData;
                if (options.filterType && options.filterType !== 'all') {
                    filteredData = allData.filter(item => item.type === options.filterType);
                    loadingNotice.setMessage(`Found ${filteredData.length} raindrops of type '${options.filterType}'. Processing...`);
                    if (filteredData.length === 0) {
                        new Notice(`No raindrops found matching type '${options.filterType}'.`, 5000);
                        loadingNotice.hide();
                        return;
                }
            } else {
                loadingNotice.setMessage(`Found ${allData.length} raindrops. Processing...`); // Update notice message
                }

                // The loadingNotice will be hidden in processRaindrops
                // Pass all necessary data including collectionsData, resolvedCollectionIds, and collectionIdToNameMap
                await this.processRaindrops(filteredData, options.vaultPath, options.appendTagsToNotes, options.useRaindropTitleForFileName, loadingNotice, options, collectionsData, resolvedCollectionIds, collectionIdToNameMap);
            }

        } catch (error) {
            loadingNotice.hide(); // Dismiss loading notice on error
            let errorMessage = 'An unknown error occurred during fetch';
            if (error instanceof Error) errorMessage = error.message;
            else if (typeof error === 'string') errorMessage = error;
            new Notice(`Error fetching raindrops: ${errorMessage}`, 10000);
            console.error('Error fetching Raindrop API:', error);
        }
    }

    async processRaindrops(
        raindrops: RaindropItem[],
        vaultPath: string | undefined,
        appendTagsToNotes: string,
        useRaindropTitleForFileName: boolean,
        loadingNotice: Notice,
        options: ModalFetchOptions,
        collectionsData?: CollectionResponse,
        resolvedCollectionIds: number[] = [],
        collectionIdToNameMap: Map<number, string> = new Map<number, string>()
    ): Promise<void> {
        const { app } = this;
        const settingsFMTags = appendTagsToNotes.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '');

        if (vaultPath === undefined) vaultPath = this.settings.defaultFolder;
        // Normalize the base target folder path once
        const baseTargetFolderPath = vaultPath?.trim() ? normalizePath(vaultPath.trim()) : normalizePath("");

        // Initialize collection hierarchy
        const collectionHierarchy = new Map<number, { title: string, parentId?: number }>();
        if (collectionsData?.result) {
            collectionsData.items.forEach(col => {
                collectionHierarchy.set(col._id, { title: col.title, parentId: col.parent?.$id });
            });
        }

        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        let updatedCount = 0;
        let processed = 0;
        const total = raindrops.length;

        try {
            // Group raindrops by collection
            const raindropsByCollection: { [key: string]: RaindropItem[] } = {};
            for (const raindrop of raindrops) {
                const collectionId = raindrop.collection?.$id?.toString() || 'uncategorized';
                if (!raindropsByCollection[collectionId]) {
                    raindropsByCollection[collectionId] = [];
                }
                raindropsByCollection[collectionId].push(raindrop);
            }

            // Process each collection
            for (const [collectionId, collectionRaindrops] of Object.entries(raindropsByCollection)) {
                try {
                    // Process collection raindrops
                    for (const raindrop of collectionRaindrops) {
                        try {
                            // Process individual raindrop
                            const result = await this.processRaindrop(
                                raindrop,
                                baseTargetFolderPath,
                                settingsFMTags,
                                options,
                                loadingNotice,
                                processed,
                                total,
                                collectionHierarchy,
                                collectionIdToNameMap
                            );

                            if (result.success) {
                                if (result.type === 'created') createdCount++;
                                else if (result.type === 'updated') updatedCount++;
                                else if (result.type === 'skipped') skippedCount++;
                            } else {
                                errorCount++;
                            }
                            processed++;

                        } catch (error) {
                            errorCount++;
                            processed++;
                            console.error('Error processing raindrop:', error);
                        }
                    }
                } catch (error) {
                    console.error(`Error processing collection ${collectionId}:`, error);
                }
            }

            // Show final summary
            loadingNotice.hide();
            let summary = `${createdCount} notes created.`;
            if (updatedCount > 0) summary += ` ${updatedCount} updated.`;
            if (skippedCount > 0) summary += ` ${skippedCount} skipped (already exist).`;
            if (errorCount > 0) summary += ` ${errorCount} errors.`;
            new Notice(summary, 7000);

        } catch (error) {
            loadingNotice.hide();
            let errorMsg = 'An unknown error occurred';
            if (error instanceof Error) errorMsg = error.message;
            else if (typeof error === 'string') errorMsg = error;
            new Notice(`Error processing raindrops: ${errorMsg}`, 10000);
            console.error('Error processing raindrops:', error);
        }
    }

    private async processRaindrop(
        raindrop: RaindropItem,
        baseTargetFolderPath: string, // Already normalized
        settingsFMTags: string[],
        options: ModalFetchOptions,
        loadingNotice: Notice,
        processed: number,
        total: number,
        collectionHierarchy: Map<number, { title: string, parentId?: number }>,
        collectionIdToNameMap: Map<number, string>
    ): Promise<{ success: boolean; type: 'created' | 'updated' | 'skipped' }> {
        try {
            const { app } = this;

            const escapeYamlStringValue = (str: string | undefined | null): string => {
                if (str === undefined || str === null) return '';
                return str.replace(/"/g, '\\"'); // Escape double quotes for YAML
            };

            const generatedFilename = this.generateFileName(raindrop, options.useRaindropTitleForFileName);
            
            let individualNoteTargetFolderPath = baseTargetFolderPath; // Starts as normalized
            if (raindrop.collection?.$id) {
                const pathSegments = this.getFullPathSegments(raindrop.collection.$id, collectionHierarchy, collectionIdToNameMap); // getFullPathSegments now uses sanitizeFileName
                if (pathSegments.length > 0) {
                    const collectionSubPath = pathSegments.join('/');
                    // Use normalizePath for the full path
                    individualNoteTargetFolderPath = normalizePath(`${baseTargetFolderPath}/${collectionSubPath}`);
                }
            }
            
            // Ensure target directory exists before attempting to write
            // individualNoteTargetFolderPath is already normalized
            if (individualNoteTargetFolderPath && !(await app.vault.adapter.exists(individualNoteTargetFolderPath))) {
                await createFolderStructure(app, individualNoteTargetFolderPath);
            }
            
            // Use normalizePath for the final file path
            const filePath = normalizePath(`${individualNoteTargetFolderPath}/${generatedFilename}.md`);

            // Update loading notice with current processing item
            const raindropTitle = raindrop.title || 'Untitled';
            loadingNotice.setMessage(`Processing '${raindropTitle}'... (${processed}/${total})`);

            let processOutcome: 'created' | 'updated' | 'skipped' = 'created';

            // Generate template data
            const templateData: Record<string, any> = {
                id: raindrop._id,
                title: escapeYamlStringValue(raindrop.title),
                excerpt: escapeYamlStringValue(raindrop.excerpt || ''),
                note: escapeYamlStringValue(raindrop.note || ''),
                link: raindrop.link, // URLs generally don't need YAML escaping unless they have special chars
                cover: raindrop.cover || '', // URLs generally don't need YAML escaping
                created: raindrop.created,
                lastupdate: raindrop.lastUpdate, // Changed from lastUpdate
                type: raindrop.type,
                // Flattened collection data
                collectionId: raindrop.collection?.$id || 0,
                collectionTitle: escapeYamlStringValue(collectionIdToNameMap.get(raindrop.collection?.$id || 0) || 'Unknown'),
                collectionPath: escapeYamlStringValue(this.getFullPathSegments(raindrop.collection?.$id || 0, collectionHierarchy, collectionIdToNameMap).join('/')),
                // Add collectionParentId if it exists
                ...(collectionHierarchy.has(raindrop.collection?.$id || 0) && collectionHierarchy.get(raindrop.collection?.$id || 0)?.parentId !== undefined && {
                    collectionParentId: collectionHierarchy.get(raindrop.collection?.$id || 0)?.parentId
                }),
                tags: (raindrop.tags || []).map(tag => escapeYamlStringValue(tag)),
                highlights: (raindrop.highlights || []).map(h => ({
                    ...h,
                    text: escapeYamlStringValue(h.text),
                    note: escapeYamlStringValue(h.note)
                })),
                bannerFieldName: this.settings.bannerFieldName,
                // Pre-calculated fields for helpers
                url: raindrop.link || '',
            };

            try {
                // Prepare data for the rendering engine (including pre-calculated fields for helpers)
                const enhancedDataForRender = {
                    ...templateData, // Spread the original templateData
                    url: templateData.link || '', // Ensure url is available, aliasing link
                    domain: this.getDomain(templateData.link || ''),
                    // Pre-calculate values that used helpers in the template:
                    renderedType: this.raindropType(templateData.type as RaindropType), // Cast type to RaindropType
                    formattedCreatedDate: this.formatDate(templateData.created),
                    formattedUpdatedDate: this.formatDate(templateData.lastupdate), // Changed from lastUpdate
                    formattedTags: this.formatTags(templateData.tags || []),
                };

                if (this.settings.isTemplateSystemEnabled) {
                    const template = this.getTemplateForType(raindrop.type as RaindropType, options);
                    const fileContent = this.renderTemplate(template, enhancedDataForRender);
                    await app.vault.create(filePath, fileContent);
                    return { success: true, type: processOutcome };
                } else {
                    // Fallback to basic format if template system is disabled
                    // Logic moved from createNoteFromRaindrop
                    const { 
                        id, title, excerpt, note, link, cover, created, lastUpdate: rdLastUpdate, type, tags // Keep raindrop.lastUpdate as rdLastUpdate for source
                    } = raindrop; // Use raindrop directly for source data here to avoid confusion with templateData.lastupdate

                    let descriptionYaml = '';
                    if (excerpt) {
                        if (excerpt.includes('\n')) {
                            descriptionYaml = `description: |\n${excerpt.split('\n').map((line: string) => `  ${line}`).join('\n')}`;
                        } else {
                            descriptionYaml = `description: "${excerpt.replace(/"/g, '\"')}"`;
                        }
                    } else {
                        descriptionYaml = `description: ""`;
                    }

                    let frontmatter = `---\n`;
                    frontmatter += `id: ${id}\n`;
                    frontmatter += `title: "${title.replace(/"/g, '\"')}"\n`;
                    frontmatter += `${descriptionYaml}\n`;
                    frontmatter += `source: ${link}\n`;
                    frontmatter += `type: ${type}\n`;
                    frontmatter += `created: ${created}\n`;
                    frontmatter += `lastupdate: ${rdLastUpdate}\n`;
                    
                    if (templateData.collectionId) { // Use flattened collectionId from templateData
                        frontmatter += `collectionId: ${templateData.collectionId}\n`;
                        frontmatter += `collectionTitle: "${escapeYamlStringValue(templateData.collectionTitle)}"\n`;
                        frontmatter += `collectionPath: "${escapeYamlStringValue(templateData.collectionPath)}"\n`;
                        if (templateData.collectionParentId) {
                            frontmatter += `collectionParentId: ${templateData.collectionParentId}\n`;
                        }
                    }
                    
                    frontmatter += `tags:\n`;
                    const finalTags = (tags || []).map((tag: string) => `  - ${tag.trim().replace(/ /g, '_').replace(/[#?"*<>:|]/g, '')}`).join('\n');
                    frontmatter += `${finalTags}\n`;
                    
                    if (cover) {
                        frontmatter += `${this.settings.bannerFieldName}: ${cover}\n`;
                    }
                    frontmatter += `---\n\n`; // Corrected: Actual newlines here

                    // Construct note content
                    let noteBody = '';
                    const altText = sanitizeFileName(title) || 'Cover Image';
                    if (cover) {
                        noteBody += `![${altText}](${cover})\n\n`; // Corrected
                    }
                    noteBody += `# ${title}\n\n`; // Corrected
                    if (excerpt) {
                        noteBody += `## Description\n${excerpt}\n\n`; // Corrected
                    }
                    if (templateData.note) { 
                         noteBody += `## Notes\n${templateData.note}\n\n`; // Corrected
                    }

                    if (templateData.highlights && templateData.highlights.length > 0) {
                        noteBody += '## Highlights\n'; // Corrected
                        templateData.highlights.forEach((highlight: any) => {
                            noteBody += `- ${highlight.text.replace(/\r\n|\r|\n/g, ' ')}\n`; // Corrected
                            if (highlight.note) {
                                noteBody += `  *Note:* ${highlight.note.replace(/\r\n|\r|\n/g, ' ')}\n`; // Corrected
                            }
                        });
                        noteBody += '\n'; // Corrected
                    }
                    const basicContent = frontmatter + noteBody;
                    await app.vault.create(filePath, basicContent);
                    return { success: true, type: processOutcome };
                }
            } catch (error) {
                // Make the check case-insensitive and check for the core part of the message
                const isFileExistsError = error instanceof Error && 
                                          error.message && 
                                          error.message.toLowerCase().includes("file already exists");

                if (isFileExistsError) {
                    console.warn(`Attempted to create file ${filePath} but it already exists. This was not handled by update/skip logic (e.g., neither 'update existing' nor 'fetch only new' was applicable or led to a skip). File will be skipped. Options: updateExisting=${options.updateExisting}, fetchOnlyNew=${options.fetchOnlyNew}`);
                    return { success: true, type: 'skipped' };
                }
                // Log other errors from app.vault.create or other unexpected issues within this try block
                console.error(`Error during file operation for ${generatedFilename} at path ${filePath}:`, error);
                return { success: false, type: 'skipped' }; // Indicate failure but allow batch processing to continue
            }
        } catch (error) {
            console.error('Unexpected error in processRaindrop for item ID ' + raindrop._id + ':', error);
            return { success: false, type: 'skipped' };
        }
    }

    private getFullPathSegments(
        collectionId: number,
        collectionHierarchy: Map<number, { title: string, parentId?: number }>,
        collectionIdToNameMap: Map<number, string>
    ): string[] {
        const segments: string[] = [];
        let currentId: number | undefined = collectionId;

        while (currentId !== undefined && currentId !== 0 && currentId !== SystemCollections.UNSORTED && currentId !== SystemCollections.TRASH) {
            const collection = collectionHierarchy.get(currentId);
            if (!collection) break;

            const name = collectionIdToNameMap.get(currentId);
            if (name) {
                // Use the imported sanitizeFileName utility for path segments
                segments.unshift(sanitizeFileName(name)); 
            }

            currentId = collection.parentId;
        }

        return segments;
    }

    // The updateRibbonIcon method is already defined at line ~360

    private formatDate(date: string): string {
        try {
            return new Date(date).toLocaleDateString();
        } catch {
            return '';
        }
    }

    private formatDateISO(date: string): string {
        try {
            return new Date(date).toISOString();
        } catch {
            return '';
        }
    }

    private formatTags(tags: string[]): string {
        return tags.map(tag => `#${tag.trim()}`).join(' ');
    }

    private getDomain(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    }

    private raindropType(type: string): string {
        const types = {
            link: 'Web Link',
            article: 'Article',
            image: 'Image',
            video: 'Video',
            document: 'Document',
            audio: 'Audio'
        };
        return types[type as keyof typeof types] || type;
    }

    private renderTemplate(template: string, data: Record<string, any>): string {
        // Add helper functions to the data
        const enhancedData = {
            ...data,
            url: data.link || '',
            domain: this.getDomain(data.link || ''),
            formatDate: (date: string) => this.formatDate(date),
            formatDateISO: (date: string) => this.formatDateISO(date),
            formatTags: (tags: string[]) => this.formatTags(tags),
            raindropType: (type: string) => this.raindropType(type),
            updated: data.lastupdate || '', // Changed from lastUpdate
        };

        // Simple Handlebars-like rendering
        return template
            // Handle if conditions first
            .replace(/{{#if ([^}]+)}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g, (match: string, conditionVar: string, content: string, elseContent?: string) => {
                const value = this.getNestedProperty(enhancedData, conditionVar.trim());
                if (value && (Array.isArray(value) ? value.length > 0 : !!value)) {
                    return content;
                }
                return elseContent || '';
            })
            // Handle each loops
            .replace(/{{#each ([^}]+)}}([\s\S]*?){{\/each}}/g, (match: string, arrayVar: string, content: string) => {
                const array = this.getNestedProperty(enhancedData, arrayVar.trim());
                if (!Array.isArray(array)) return '';
                
                return array.map(item => {
                    let itemContent = content.replace(/{{this}}/g, String(item));
                    return itemContent.replace(/{{([^}]+)}}/g, (m: string, key: string) => {
                        if (key.includes('.')) {
                            return String(this.getNestedProperty(item, key) || '');
                        }
                        return String(item[key] || '');
                    });
                }).join('');
            })
            // Handle simple variables
            .replace(/{{([^}]+)}}/g, (match: string, key: string) => {
                const value = this.getNestedProperty(enhancedData, key.trim());
                if (typeof value === 'object' && value !== null) {
                    // Handle objects (like collection) by converting to YAML format
                    return this.formatYamlValue(value);
                }
                return String(value || '');
            });
    }

    private formatYamlValue(value: any, indentLevel: number = 0): string {
        const indent = '  '.repeat(indentLevel);
        
        if (value === null || value === undefined) {
            return 'null';
        }
        
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        
        if (typeof value === 'number') {
            return value.toString();
        }
        
        if (typeof value === 'string') {
            // Check if the string needs special handling
            if (value.includes('\n') || value.includes(':') || value.includes('{') || 
                value.includes('}') || value.includes('[') || value.includes(']') ||
                value.includes('#') || value.includes('*') || value.includes('&') ||
                value.includes('!') || value.includes('|') || value.includes('>') ||
                value.includes('`') || value.trim() === '' ||
                /^[0-9]/.test(value) || /^true$|^false$|^yes$|^no$|^on$|^off$/i.test(value)) {
                
                // If the string contains newlines, use the block scalar syntax
                if (value.includes('\n')) {
                    return '|\n' + value.split('\n').map(line => `${indent}  ${line}`).join('\n');
                }
                
                // Otherwise use quoted string with escaping
                return `"${value.replace(/"/g, '\\"')}"`;
            }
            return value;
        }
        
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '[]';
            }
            return value.map(item => `\n${indent}- ${this.formatYamlValue(item, indentLevel + 1)}`).join('');
        }
        
        if (typeof value === 'object') {
            const entries = Object.entries(value);
            if (entries.length === 0) {
                return '{}'; // Flow style for empty is fine
            }
            // Keys of this object will be indented one level more than the object itself.
            const keysIndent = '  '.repeat(indentLevel + 1); 
            return entries.map(([key, val]) => {
                // Format the value; it will be indented according to its own type and level.
                const formattedValue = this.formatYamlValue(val, indentLevel + 1);
                
                // Check if the formattedValue is already a multi-line block (starts with newline and indent)
                // or if it's a simple single-line value.
                if (formattedValue.startsWith('\\n')) { 
                    // If formattedValue is already a block (e.g., a nested object),
                    // it starts with '\\n' and its own correct indentation.
                    // So, we just place our key before it.
                    return `\\n${keysIndent}${key}:${formattedValue}`;
                } else { // Sub-value is single line
                    return `\\n${keysIndent}${key}: ${formattedValue}`;
                }
            }).join('');
        }
        
        return String(value);
    }

    private escapeYamlString(str: string): string {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\t/g, '\\t')
            .replace(/\r/g, '\\r');
    }

    private getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((current: any, prop: string) => {
            return current && current[prop] !== undefined ? current[prop] : undefined;
        }, obj);
    }

    // New method to fetch all user collections
    async fetchAllUserCollections(): Promise<RaindropCollection[]> {
        if (!this.settings.apiToken) {
            console.warn('API token not set. Cannot fetch user collections.');
            new Notice('API token not set. Cannot fetch collections for modal.', 5000);
            return [];
        }
        const baseApiUrl = 'https://api.raindrop.io/rest/v1';
        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.settings.apiToken}`
            }
        };
        let allCollections: RaindropCollection[] = [];

        try {
            // Fetch root collections
            const rootResponse = await fetchWithRetry(
                this.app,
                `${baseApiUrl}/collections`,
                fetchOptions,
                this.rateLimiter
            );
            const rootData = rootResponse as CollectionResponse;
            if (rootData?.result && rootData?.items) {
                allCollections = allCollections.concat(rootData.items);
            } else if (!rootData?.result) {
                console.warn('Failed to fetch root collections or result was false:', rootData);
            }

            // Fetch nested collections
            const nestedResponse = await fetchWithRetry(
                this.app,
                `${baseApiUrl}/collections/childrens`,
                fetchOptions,
                this.rateLimiter
            );
            const nestedData = nestedResponse as CollectionResponse;
            if (nestedData?.result && nestedData?.items) {
                allCollections = allCollections.concat(nestedData.items);
            } else if (!nestedData?.result) {
                console.warn('Failed to fetch nested collections or result was false:', nestedData);
            }
            
            // Filter out potential duplicates if any endpoint returns overlapping data (e.g. by _id)
            // and also filter out system collections like Trash (-99) or Unsorted (-1) as they are not typically user-selectable targets
            const uniqueCollections = Array.from(new Map(allCollections.map(col => [col._id, col])).values())
                                          .filter(col => col._id !== SystemCollections.TRASH && col._id !== SystemCollections.UNSORTED);
            
            if (allCollections.length > 0 && uniqueCollections.length === 0 && (rootData?.items?.length || nestedData?.items?.length)) {
                // This might happen if only system collections were returned
                 console.log('Only system collections (Trash/Unsorted) were found.');
            } else if (allCollections.length === 0) {
                console.warn('No collections were fetched from either endpoint.');
            }
            
            return uniqueCollections;

        } catch (error) {
            console.error('Error fetching all user collections for modal:', error);
            new Notice('Failed to load your Raindrop.io collections for selection.', 7000);
            return []; // Return empty on error, modal will handle displaying a message
        }
    }

    /**
     * Creates an Obsidian note from manually entered bookmark data
     * This method is used by the "Add New Bookmark" modal
     * @param data - The bookmark data entered by the user
     */
    async createRaindropNote(data: NewRaindropNoteData): Promise<void> {
        const loadingNotice = new Notice(`Creating note for: ${data.title}...`, 0);

        try {
            // Create a RaindropItem structure compatible with processRaindrop
            const now = new Date().toISOString();
            const simulatedRaindrop: RaindropItem = {
                _id: Date.now(), // Use timestamp as unique ID for manually created bookmarks
                title: data.title,
                excerpt: data.excerpt,
                note: data.note,
                link: data.url,
                cover: data.cover,
                created: now,
                lastUpdate: now,
                tags: data.tags,
                type: 'link', // Always 'link' for manually added bookmarks
                collection: {
                    $id: data.collectionId,
                    title: data.collectionName
                },
                // Required fields for processRaindrop
                domain: new URL(data.url).hostname,
                media: [],
                sort: 0,
                hidden: false,
                file: { size: 0, name: '', type: '' },
                html: '',
                wordCount: 0,
                target: '_blank',
                highlights: [],
            };

            // Build collection hierarchy for proper path generation
            const collectionHierarchy = new Map<number, { title: string, parentId?: number }>();
            const collectionIdToNameMap = new Map<number, string>();
            
            // Fetch user collections to build hierarchy if collection is specified
            if (data.collectionId && data.collectionId !== 0) {
                try {
                    const allUserCollections = await this.fetchAllUserCollections();
                    allUserCollections.forEach(col => {
                        collectionIdToNameMap.set(col._id, col.title);
                        collectionHierarchy.set(col._id, { 
                            title: col.title, 
                            parentId: col.parent?.$id 
                        });
                    });
                } catch (error) {
                    console.warn('Could not fetch collection hierarchy for manual bookmark:', error);
                    // Continue without hierarchy - note will be saved to base folder
                }
            }
            
            // Add the current collection to maps if not already present
            if (data.collectionId && !collectionIdToNameMap.has(data.collectionId)) {
                collectionIdToNameMap.set(data.collectionId, data.collectionName);
            }

            // Create options for processRaindrop
            const options: ModalFetchOptions = {
                vaultPath: data.vaultPath,
                collections: '',
                apiFilterTags: '',
                includeSubcollections: false,
                appendTagsToNotes: '', // Tags are already in the raindrop object
                useRaindropTitleForFileName: true,
                tagMatchType: 'all',
                filterType: 'all',
                fetchOnlyNew: false,
                updateExisting: false,
                useDefaultTemplate: false,
                overrideTemplates: false
            };

            // Prepare tags for frontmatter (settingsFMTags parameter)
            const settingsFMTags: string[] = data.tags || [];

            // Use the actual processRaindrop method for consistent note creation
            const result = await this.processRaindrop(
                simulatedRaindrop,
                data.vaultPath || this.settings.defaultFolder,
                settingsFMTags,
                options,
                loadingNotice,
                1, // processed
                1, // total
                collectionHierarchy,
                collectionIdToNameMap
            );

            loadingNotice.hide();

            if (result.success) {
                new Notice(`✓ Successfully created note: ${data.title}`, 5000);
            } else {
                new Notice(`⚠ Note creation completed with warnings for: ${data.title}`, 5000);
            }
        } catch (error) {
            loadingNotice.hide();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`✗ Failed to create note: ${errorMessage}`, 7000);
            console.error('Error in createRaindropNote:', error);
            throw error;
        }
    }

    async activateView() {
        this.app.workspace.detachLeavesOfType(RAINDROP_VIEW_TYPE);

        await this.app.workspace.getLeaf(true).setViewState({
            type: RAINDROP_VIEW_TYPE,
            active: true,
        });
    }

    async fetchCollectionItems(collectionId: number): Promise<RaindropItem[]> {
        if (!this.settings.apiToken) {
            new Notice('Please configure your Raindrop.io API token in the plugin settings.', 10000);
            return [];
        }

        const baseApiUrl = 'https://api.raindrop.io/rest/v1';
        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.settings.apiToken}`
            }
        };

        let allItems: RaindropItem[] = [];
        const perPage = 50;
        let page = 0;
        let hasMore = true;

        const collectionApiBaseUrl = `${baseApiUrl}/raindrops/${collectionId}`;

        while (hasMore) {
            const params = new URLSearchParams({
                perpage: perPage.toString(),
                page: page.toString()
            });

            const currentApiUrl = `${collectionApiBaseUrl}?${params.toString()}`;
            console.log(`Requesting items from collection ID: ${collectionId}, page ${page}`);

            try {
                const response = await fetchWithRetry(
                    currentApiUrl,
                    fetchOptions,
                    this.rateLimiter
                );
                const data = response as RaindropResponse;

                if (!data.result) {
                    console.error(`API Error for collection ${collectionId}:`, data);
                    new Notice(`Error fetching items for collection ID: ${collectionId}.`, 7000);
                    hasMore = false;
                    continue;
                }

                if (data?.items) {
                    allItems = allItems.concat(data.items);
                    page++;
                    hasMore = data.items.length === perPage;
                    console.log(`Fetched ${data.items.length} items from collection ${collectionId}, page ${page}`);
                } else {
                    console.warn(`Unexpected response for collection ${collectionId}. Stopping.`);
                    hasMore = false;
                }
            } catch (error) {
                console.error(`Error fetching items for collection ID: ${collectionId}:`, error);
                new Notice(`Network error fetching items for collection ID: ${collectionId}.`, 7000);
                hasMore = false;
            }
        }

        return allItems;
    }

    async fetchSingleRaindrop(itemId: number, vaultPath?: string, appendTags?: string): Promise<void> {
        if (!this.settings.apiToken) {
            new Notice('Please configure your Raindrop.io API token in the plugin settings.', 10000);
            return;
        }
        if (!itemId) {
            new Notice('Invalid Item ID provided for Quick Import.', 5000);
            return;
        }

        const loadingNotice = new Notice(`Fetching Raindrop item ID: ${itemId}...`, 0);
        const baseApiUrl = 'https://api.raindrop.io/rest/v1';
        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.settings.apiToken}` }
        };

        try {
            const response = await fetchWithRetry(
                this.app,
                `${baseApiUrl}/raindrop/${itemId}`,
                fetchOptions,
                this.rateLimiter
            );
            
            // The API for a single raindrop returns { result: boolean, item: RaindropItem }
            // So we need to adapt this structure.
            const data = response as { result: boolean, item?: RaindropItem, items?: RaindropItem[] }; // More flexible typing for safety

            let raindropItem: RaindropItem | undefined;

            if (data.result && data.item) {
                raindropItem = data.item;
            } else if (data.result && data.items && data.items.length > 0) {
                // Some endpoints might wrap single items in an array, handle defensively
                raindropItem = data.items[0];
                 console.warn(`Single raindrop fetch for ID ${itemId} returned an items array. Using the first item.`);
            }
            
            if (!raindropItem) {
                loadingNotice.hide();
                const errorMsg = data.result === false ? (data as any).errorMessage || 'API indicated failure.' : 'Item not found or invalid response.';
                new Notice(`Failed to fetch Raindrop item ${itemId}: ${errorMsg}`, 7000);
                console.error(`Failed to fetch Raindrop item ${itemId}:`, data);
                return;
            }

            // Prepare options similar to ModalFetchOptions, but simplified for single item
            // We'll use the plugin's default settings for most things
            const singleItemOptions: ModalFetchOptions = {
                vaultPath: vaultPath, // User-specified or plugin default
                collections: '', // Not applicable for single item by ID
                apiFilterTags: '', // Not applicable
                includeSubcollections: false, // Not applicable
                appendTagsToNotes: appendTags || '', // User-specified for quick import
                useRaindropTitleForFileName: this.settings.fileNameTemplate !== '{{id}}', // Infer from settings
                tagMatchType: 'all', // Default, not critical here
                filterType: 'all',   // Default, not critical here
                fetchOnlyNew: false, // For quick import, typically we want to create or update
                updateExisting: true, // Default to true for quick import to allow updates
                useDefaultTemplate: false, // Respect template settings
                overrideTemplates: false   // Respect template settings
            };

            // Need to fetch collection hierarchy for path generation if not already available
            // For simplicity in quick import, we can fetch all collections if the item has a collection ID.
            // This ensures collectionPath and title are available for the template.
            let collectionsData: CollectionResponse | undefined = undefined;
            let collectionIdToNameMap = new Map<number, string>();

            if (raindropItem.collection?.$id) {
                 loadingNotice.setMessage(`Fetching collection info for item ${itemId}...`);
                const allUserCollections = await this.fetchAllUserCollections();
                if (allUserCollections.length > 0) {
                    collectionsData = { result: true, items: allUserCollections };
                    allUserCollections.forEach(col => collectionIdToNameMap.set(col._id, col.title));
                }
            }
            
            // Use a simplified call to processRaindrops, or adapt processRaindrop
            // For now, let's call processRaindrops with an array of one
            await this.processRaindrops(
                [raindropItem],
                singleItemOptions.vaultPath,
                singleItemOptions.appendTagsToNotes,
                singleItemOptions.useRaindropTitleForFileName,
                loadingNotice, // Pass the notice
                singleItemOptions,
                collectionsData, // Pass fetched collections data for path context
                [], // resolvedCollectionIds not directly applicable
                collectionIdToNameMap // Pass map for titles
            );
            // The processRaindrops method will hide the notice upon completion.

        } catch (error) {
            loadingNotice.hide();
            let errorMessage = 'An unknown error occurred during quick import';
            if (error instanceof Error) errorMessage = error.message;
            new Notice(`Error during Quick Import of item ${itemId}: ${errorMessage}`, 10000);
            console.error(`Error quick importing Raindrop ID ${itemId}:`, error);
        }
    }
}

class RaindropToObsidianSettingTab extends PluginSettingTab {
    plugin: RaindropToObsidian;

    constructor(app: App, plugin: RaindropToObsidian) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h1', { text: 'Make It Rain Settings' });

        // --- API Configuration Section ---
        containerEl.createEl('h2', { text: '💧 Raindrop.io API Configuration' });
        const apiTokenSetting = new Setting(containerEl)
            .setName('Raindrop.io API Token')
            .setDesc('Create a "Test Token" from your Raindrop.io Apps settings.')
            .addText((text: TextComponent) => {
                text.setPlaceholder('Enter your API token')
                    .setValue(this.plugin.settings.apiToken)
                    .onChange(async (value: string) => {
                        this.plugin.settings.apiToken = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password'; // Mask the token
                text.inputEl.style.width = '100%';
            })
            .addButton((button: ButtonComponent) => {
                button.setButtonText("Verify Token")
                    .setIcon("checkmark")
                    .setCta()
                    .onClick(async () => {
                        await this.verifyApiToken();
                    });
            });
        
        const apiTokenHelpLink = apiTokenSetting.nameEl.createEl('a', {
            href: 'https://frostmute.github.io/make-it-rain/configuration#api-token',
            text: ' (?)',
            cls: 'make-it-rain-help-link',
            title: 'How to get your API Token'
        });
        apiTokenHelpLink.setAttr('target', '_blank');

        // --- General Import Settings Section ---
        containerEl.createEl('h2', { text: '⚙️ General Import Settings' });
        new Setting(containerEl)
            .setName('Default Vault Save Location')
            .setDesc('Specify the default folder for imported notes (e.g., Imports/Raindrops). Leave blank for vault root.')
            .addText((text: TextComponent) => {
                text.setPlaceholder('e.g., Raindrops/')
                    .setValue(this.plugin.settings.defaultFolder)
                    .onChange(async (value: string) => {
                        this.plugin.settings.defaultFolder = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = '100%';
            });

        const fileNameTemplateSetting = new Setting(containerEl)
            .setName('Filename Template')
            .setDesc('Define the filename for notes when "Use Raindrop Title" is enabled. Placeholders: {{title}}, {{id}}, {{collectionTitle}}, {{date}} (YYYY-MM-DD).')
            .addText((text: TextComponent) => {
                text.setPlaceholder('{{title}}')
                    .setValue(this.plugin.settings.fileNameTemplate)
                    .onChange(async (value: string) => {
                        this.plugin.settings.fileNameTemplate = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = '100%';
            });
        
        const fileNameTemplateHelpLink = fileNameTemplateSetting.nameEl.createEl('a', {
            href: 'https://frostmute.github.io/make-it-rain/configuration#filename-template',
            text: ' (?)',
            cls: 'make-it-rain-help-link',
            title: 'Documentation for Filename Template'
        });
        fileNameTemplateHelpLink.setAttr('target', '_blank');

        new Setting(containerEl)
            .setName('Banner Frontmatter Field Name')
            .setDesc('Customize the frontmatter field name for the banner/cover image (default: banner).')
            .addText((text: TextComponent) => {
                text.setPlaceholder('banner')
                    .setValue(this.plugin.settings.bannerFieldName)
                    .onChange(async (value: string) => {
                        this.plugin.settings.bannerFieldName = value;
                        await this.plugin.saveSettings();
                    });
            });

        // --- UI Settings Section ---
        containerEl.createEl('h2', { text: '🎨 User Interface' });
        new Setting(containerEl)
            .setName('Show Ribbon Icon')
            .setDesc('Toggle the Make It Rain ribbon icon in the Obsidian sidebar.')
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.showRibbonIcon)
                    .onChange(async (value: boolean) => {
                        this.plugin.settings.showRibbonIcon = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateRibbonIcon(); // Update icon visibility immediately
                    });
            });

        containerEl.createEl('hr');

        // --- Template System Section ---
        containerEl.createEl('h2', { text: '📄 Template System' });
        new Setting(containerEl)
            .setName('Enable Template System')
            .setDesc('Use custom templates for formatting imported notes. If disabled, a basic note structure will be used.')
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.isTemplateSystemEnabled)
                    .onChange(async (value: boolean) => {
                        this.plugin.settings.isTemplateSystemEnabled = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh settings to show/hide template options
                    });
            });

        if (this.plugin.settings.isTemplateSystemEnabled) {
            containerEl.createEl('h3', { text: 'Default Template' });
            new Setting(containerEl)
                .setDesc('This template is used if no content-type specific template is active or defined below.')
                .setClass('setting-item-stacked') // Added class
                .addTextArea((text) => {
                    text.setPlaceholder('Enter your default Handlebars template here...')
                        .setValue(this.plugin.settings.defaultTemplate)
                        .onChange(async (value) => {
                            this.plugin.settings.defaultTemplate = value;
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.rows = 15;
                    text.inputEl.style.width = '100%';
                    text.inputEl.style.fontFamily = 'monospace';
                })
                .addButton((button) => {
                    button
                        .setButtonText("Reset to Default")
                        .setIcon("undo") // Using 'undo' icon
                        .setTooltip("Reset this template to its original default value")
                        .onClick(async () => {
                            this.plugin.settings.defaultTemplate = DEFAULT_SETTINGS.defaultTemplate;
                            await this.plugin.saveSettings();
                            this.display(); // Refresh the settings tab
                            new Notice("Default template has been reset.");
                        });
                });

            containerEl.createEl('h3', { text: 'Content-Type Specific Templates' });
            const contentTypeDesc = containerEl.createEl('p', { cls: 'setting-item-description' });
            contentTypeDesc.innerHTML = 'Define specific templates for different Raindrop types. If a type-specific template is enabled and filled, it will be used instead of the default template. If disabled or empty, the default template is used for that type. Visit the <a href="https://frostmute.github.io/make-it-rain/template-system/">documentation</a> for available variables.';


            const contentTypes = Object.values(RaindropTypes);
            for (const type of contentTypes) {
                const typeKey = type as keyof typeof this.plugin.settings.contentTypeTemplates;
                
                containerEl.createEl('h4', { text: `${type.charAt(0).toUpperCase() + type.slice(1)} Template`});
                
                new Setting(containerEl)
                    .setName(`Enable ${type} Template`)
                    .setDesc(`Use a custom template for "${type}" items.`)
                    .addToggle((toggle) => {
                        toggle
                            .setValue(this.plugin.settings.contentTypeTemplateToggles[typeKey])
                            .onChange(async (value) => {
                                this.plugin.settings.contentTypeTemplateToggles[typeKey] = value;
                                await this.plugin.saveSettings();
                                this.display(); // Refresh to show/hide textarea
                            });
                    });

                if (this.plugin.settings.contentTypeTemplateToggles[typeKey]) {
                    new Setting(containerEl)
                        .setDesc(`Template for "${type}" content. Leave empty to use the default template.`)
                        .setClass('setting-item-stacked') // Added class
                        .addTextArea((text) => {
                            text.setPlaceholder(`Enter template for ${type} items...`)
                                .setValue(this.plugin.settings.contentTypeTemplates[typeKey])
                                .onChange(async (value) => {
                                    this.plugin.settings.contentTypeTemplates[typeKey] = value;
                                    await this.plugin.saveSettings();
                                });
                            text.inputEl.rows = 10;
                            text.inputEl.style.width = '100%';
                            text.inputEl.style.fontFamily = 'monospace';
                        })
                        .addButton((button) => { // Add Reset Button for specific type
                            button
                                .setButtonText("Reset") 
                                .setIcon("undo")
                                .setTooltip(`Reset ${type} template to its original default`)
                                .onClick(async () => {
                                    // Ensure DEFAULT_SETTINGS.contentTypeTemplates[typeKey] exists before assigning
                                    if (DEFAULT_SETTINGS.contentTypeTemplates[typeKey]) {
                                        this.plugin.settings.contentTypeTemplates[typeKey] = DEFAULT_SETTINGS.contentTypeTemplates[typeKey];
                                        await this.plugin.saveSettings();
                                        this.display(); // Refresh the settings tab
                                        new Notice(`${type.charAt(0).toUpperCase() + type.slice(1)} template has been reset.`);
                                    } else {
                                        new Notice(`Error: Default template for ${type} not found.`, 7000);
                                    }
                                });
                        });
                }
                 containerEl.createEl('hr');
            }
        }

        // --- About/Footer Section ---
        containerEl.createEl('hr');
        const footer = containerEl.createDiv({ cls: 'setting-footer' });
        footer.innerHTML = `
            <p><strong>Make It Rain v${this.plugin.manifest.version}</strong></p>
            <p>Developed by <a href="https://github.com/frostmute" target="_blank">frostmute (Jonathan Wagner)</a>.</p>
            <p>Found this plugin helpful? Consider <a href="https://ko-fi.com/frostmute" target="_blank">supporting its development</a>.</p>
            <p>For help, feature requests, or to report issues, please visit the <a href="https://github.com/frostmute/make-it-rain/issues" target="_blank">GitHub repository</a>.</p>
        `;
    }

    async verifyApiToken(): Promise<void> {
        const { apiToken } = this.plugin.settings;

        if (!apiToken) {
            new Notice('Please enter an API token first.', 5000);
            return;
        }

        new Notice('Verifying API token...', 3000);

        const baseApiUrl = 'https://api.raindrop.io/rest/v1';
        const fetchOptions: RequestInit = {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            // Use a simple endpoint to test the token, e.g., fetching user info
            const response = await request({
                url: `${baseApiUrl}/user`,
                method: 'GET',
                headers: fetchOptions.headers as Record<string, string>
            });

            let data;
            if (typeof response === 'string') {
                data = JSON.parse(response);
            } else {
                data = response;
            }

            if (data.result) {
                new Notice('API Token is valid!', 5000);
            } else {
                // Handle specific API error messages if available
                const errorMessage = data.message || data.error || 'Invalid API token or connection issue.';
                new Notice(`API Token verification failed: ${errorMessage}`, 10000);
                console.error('API Token verification failed:', data);
            }
        } catch (error) {
            let errorMsg = 'An error occurred during token verification.';
            if (error instanceof Error) errorMsg = error.message;
            else if (typeof error === 'string') errorMsg = error;
            new Notice(`API Token verification failed: ${errorMsg}`, 10000);
            console.error('Error verifying API token:', error);
        }
    }
}

