// Enhanced Modern Raindrop Item Component with MDX support
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Download, Edit3, Tag, Calendar, FileText, Image, Video, Music, File } from 'lucide-react';
import clsx from 'clsx';
import { RaindropItem } from '../types';

interface RaindropItemCardProps {
  item: RaindropItem;
  onSelect?: (item: RaindropItem) => void;
  onAddToVault?: (item: RaindropItem) => void;
  isSelected?: boolean;
  layout?: 'card' | 'list' | 'grid';
  enableAnimations?: boolean;
}

const typeIcons = {
  link: ExternalLink,
  article: FileText,
  image: Image,
  video: Video,
  audio: Music,
  document: File,
};

const typeColors = {
  link: 'text-blue-500',
  article: 'text-green-500',
  image: 'text-purple-500',
  video: 'text-red-500',
  audio: 'text-yellow-500',
  document: 'text-gray-500',
};

export const RaindropItemCard: React.FC<RaindropItemCardProps> = ({
  item,
  onSelect,
  onAddToVault,
  isSelected = false,
  layout = 'card',
  enableAnimations = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = typeIcons[item.type] || ExternalLink;

  const handleClick = useCallback(() => {
    onSelect?.(item);
  }, [item, onSelect]);

  const handleAddToVault = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToVault?.(item);
  }, [item, onAddToVault]);

  const handleOpenLink = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(item.link, '_blank');
  }, [item.link]);

  const cardVariants = enableAnimations ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    hover: { y: -2, scale: 1.02 },
  } : {};

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (layout === 'list') {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        whileHover={enableAnimations ? "hover" : undefined}
        className={clsx(
          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200',
          isSelected 
            ? 'bg-accent border-accent-foreground shadow-md' 
            : 'bg-card border-border hover:bg-accent/50 hover:border-accent-foreground',
          'hover:shadow-lg'
        )}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={clsx('flex-shrink-0', typeColors[item.type])}>
          <IconComponent size={20} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate text-foreground">
            {item.title}
          </h3>
          {item.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {item.excerpt}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar size={12} />
          {formatDate(item.created)}
        </div>

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-1"
            >
              <button
                onClick={handleAddToVault}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Add to Vault"
              >
                <Download size={14} />
              </button>
              <button
                onClick={handleOpenLink}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Open Link"
              >
                <ExternalLink size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={enableAnimations ? "hover" : undefined}
      className={clsx(
        'group relative bg-card border border-border rounded-lg overflow-hidden cursor-pointer transition-all duration-200',
        isSelected 
          ? 'ring-2 ring-accent shadow-lg' 
          : 'hover:shadow-lg hover:border-accent-foreground',
        layout === 'grid' ? 'aspect-[4/3]' : 'min-h-[120px]'
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Image */}
      {item.cover && layout !== 'list' && (
        <div className="relative h-24 bg-muted overflow-hidden">
          <img
            src={item.cover}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={clsx('flex-shrink-0', typeColors[item.type])}>
                <IconComponent size={16} />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {item.type}
              </span>
            </div>
            <h3 className="font-medium text-sm leading-tight text-foreground line-clamp-2">
              {item.title}
            </h3>
          </div>
        </div>

        {/* Excerpt */}
        {item.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.excerpt}
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag size={10} className="text-muted-foreground" />
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-accent text-accent-foreground"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <Calendar size={10} />
            {formatDate(item.created)}
          </div>
          
          {item.collection && (
            <span className="truncate max-w-[100px]">
              {item.collection.title}
            </span>
          )}
        </div>
      </div>

      {/* Action Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-1 shadow-sm"
          >
            <button
              onClick={handleAddToVault}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Add to Vault"
            >
              <Download size={14} />
            </button>
            <button
              onClick={handleOpenLink}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Open Link"
            >
              <ExternalLink size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2">
          <div className="w-2 h-2 bg-accent rounded-full" />
        </div>
      )}
    </motion.div>
  );
};
