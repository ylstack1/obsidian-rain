// Modern Item Detail Modal/Popup Component
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Download, Edit3, Tag, Calendar, Clock, Bookmark, Share2 } from 'lucide-react';
import clsx from 'clsx';
import { RaindropItem } from '../../src/types';

interface ItemDetailModalProps {
  item: RaindropItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToVault?: (item: RaindropItem) => void;
  enableAnimations?: boolean;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToVault,
  enableAnimations = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleAddToVault = useCallback(async () => {
    if (!item) return;
    
    setIsLoading(true);
    try {
      await onAddToVault?.(item);
      onClose();
    } catch (error) {
      console.error('Error adding to vault:', error);
    } finally {
      setIsLoading(false);
    }
  }, [item, onAddToVault, onClose]);

  const handleOpenLink = useCallback(() => {
    if (item) window.open(item.link, '_blank');
  }, [item]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!item) return null;

  const overlayVariants = enableAnimations ? {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  } : {};

  const modalVariants = enableAnimations ? {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
  } : {};

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-background border border-border rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-border bg-card">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>

              <div className="pr-12">
                <h1 className="text-2xl font-bold text-foreground mb-2 leading-tight">
                  {item.title}
                </h1>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Bookmark size={14} />
                    <span className="capitalize">{item.type}</span>
                  </div>
                  {item.collection && (
                    <div className="flex items-center gap-1">
                      <Tag size={14} />
                      <span>{item.collection.title}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{formatDate(item.created)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handleAddToVault}
                  disabled={isLoading}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-md transition-all duration-200',
                    'hover:bg-accent/80 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Download size={16} />
                  {isLoading ? 'Adding...' : 'Add to Vault'}
                </button>

                <button
                  onClick={handleOpenLink}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ExternalLink size={16} />
                  Open Link
                </button>

                <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Share2 size={16} />
                  Share
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="p-6 space-y-6">
                {/* Cover Image */}
                {item.cover && (
                  <div className="relative rounded-lg overflow-hidden bg-muted">
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="w-full h-64 object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* URL */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">URL</h3>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors break-all"
                  >
                    {item.link}
                    <ExternalLink size={14} />
                  </a>
                </div>

                {/* Description */}
                {item.excerpt && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Description</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-muted-foreground leading-relaxed">{item.excerpt}</p>
                    </div>
                  </div>
                )}

                {/* Personal Note */}
                {item.note && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Personal Note</h3>
                    <div className="p-4 bg-accent/20 border border-accent/30 rounded-md">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">{item.note}</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm font-medium"
                        >
                          <Tag size={12} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Highlights */}
                {item.highlights && item.highlights.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">Highlights</h3>
                    <div className="space-y-3">
                      {item.highlights.map((highlight, index) => (
                        <div
                          key={index}
                          className="p-4 border-l-4 border-accent bg-accent/5 rounded-r-md"
                        >
                          <blockquote className="text-foreground italic mb-2">
                            "{highlight.text}"
                          </blockquote>
                          {highlight.note && (
                            <p className="text-sm text-muted-foreground">
                              Note: {highlight.note}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(highlight.created)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Created</h4>
                    <p className="text-sm text-muted-foreground">{formatDate(item.created)}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Last Updated</h4>
                    <p className="text-sm text-muted-foreground">{formatDate(item.lastUpdate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
