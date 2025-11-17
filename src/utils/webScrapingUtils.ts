import { request } from 'obsidian';
import * as cheerio from 'cheerio';

/**
 * Interface for the metadata extracted from a URL.
 */
export interface Metadata {
    title: string;
    description: string;
    cover: string; // URL for the banner/cover image
}

/**
 * Fetches and parses metadata (title, description, cover image) from a given URL.
 * It uses Obsidian's built-in request function which is safer and handles CORS better in the plugin environment.
 * 
 * @param url The URL to scrape.
 * @returns A promise that resolves to the extracted Metadata object.
 */
export async function fetchMetadataFromUrl(url: string): Promise<Metadata> {
    const defaultMetadata: Metadata = {
        title: '',
        description: '',
        cover: '',
    };

    if (!url || !url.startsWith('http')) {
        return defaultMetadata;
    }

    try {
        // Use Obsidian's request for fetching content
        const html = await request({ url });
        const $ = cheerio.load(html);

        let title = $('title').text() || '';
        let description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
        let cover = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';

        // Fallback for title from OpenGraph if available and title is empty
        if (!title) {
            title = $('meta[property="og:title"]').attr('content') || '';
        }

        // Clean up title and description
        title = title.trim();
        description = description.trim();

        // Basic validation for cover URL
        if (cover && !cover.startsWith('http')) {
            // Attempt to resolve relative URL, though this is tricky without the base URL logic
            // For now, we'll only use absolute URLs
            cover = ''; 
        }

        return {
            title: title,
            description: description,
            cover: cover,
        };

    } catch (error) {
        console.error('Error fetching metadata from URL:', url, error);
        // Return default metadata on failure
        return defaultMetadata;
    }
}
