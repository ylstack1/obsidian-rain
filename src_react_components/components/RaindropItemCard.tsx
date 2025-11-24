// Enhanced Modern Raindrop Item Component with MDX support
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Download, Tag, Calendar, FileText, Image, Video, Music, File, Link as LinkIcon } from 'lucide-react';
import clsx from 'clsx';
import { RaindropItem } from '../../src/types';

interface RaindropItemCardProps {
  item: RaindropItem;
  onSelect?: (item: RaindropItem) => void;
  onAddToVault?: (item: RaindropItem) => void;
  isSelected?: boolean;
  layout?: 'card' | 'list' | 'grid';
  enableAnimations?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  link: LinkIcon,
  article: FileText,
  image: Image,
  video: Video,
  audio: Music,
  document: File,
};

const typeColors: Record<string, string> = {
  link: 'text-blue-500',
  article: 'text-green-500',
  image: 'text-purple-500',
  video: 'text-red-500',
  audio: 'text-yellow-500',
  document: 'text-gray-500',
};

const typeBgColors: Record<string, string> = {
  link: 'bg-blue-500/10',
  article: 'bg-green-500/10',
  image: 'bg-purple-500/10',
  video: 'bg-red-500/10',
  audio: 'bg-yellow-500/10',
  document: 'bg-gray-500/10',
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
  const textColor = typeColors[item.type] || 'text-gray-500';
  const bgColor = typeBgColors[item.type] || 'bg-gray-500/10';

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
        <div className={clsx('flex-shrink-0 p-2 rounded-md', textColor, bgColor)}>
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

        <div className="flex-shrink-0 flex items-center gap-3">
           {item.collection && (
             <span className="text-xs text-muted-foreground hidden sm:inline-block">
               {item.collection.title}
             </span>
           )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={12} />
            {formatDate(item.created)}
          </div>
        </div>

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-1 ml-2"
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
      </motion.div>
    );
  }

  // Grid/Card Layout
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={enableAnimations ? "hover" : undefined}
      className={clsx(
        'group relative flex flex-col bg-card border border-border rounded-xl overflow-hidden cursor-pointer transition-all duration-200',
        isSelected 
          ? 'ring-2 ring-accent shadow-lg' 
          : 'hover:shadow-lg hover:border-accent-foreground',
        'h-full min-h-[280px]'
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header - Banner */}
      <div className="p-3 pb-0">
         <div className="relative w-full aspect-[2/1] rounded-lg overflow-hidden bg-muted">
            {item.cover ? (
              <img
                src={item.cover}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className={clsx("w-full h-full flex items-center justify-center opacity-20", textColor, bgColor)}>
                 <IconComponent size={48} />
              </div>
            )}
            
            {/* Type Badge Overlay */}
            <div className="absolute top-2 left-2">
               <span className={clsx("inline-flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-sm shadow-sm", textColor, bgColor)}>
                  <IconComponent size={14} />
               </span>
            </div>
         </div>
      </div>

      {/* Card Body */}
      <div className="p-3 flex-1 flex flex-col gap-2">
         <h3 className="font-semibold text-sm leading-snug text-foreground line-clamp-2" title={item.title}>
            {item.title}
         </h3>
         {item.excerpt && (
           <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
             {item.excerpt}
           </p>
         )}
      </div>

      {/* Card Footer */}
      <div className="p-3 pt-0 mt-auto flex flex-col gap-2">
         {/* Tags */}
         {item.tags && item.tags.length > 0 && (
           <div className="flex flex-wrap gap-1">
             {item.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/50 text-accent-foreground font-medium">
                   #{tag}
                </span>
             ))}
             {item.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>
             )}
           </div>
         )}
         
         {/* Meta info */}
         <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2 mt-1">
             <div className="flex items-center gap-1 truncate max-w-[60%]">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                <span className="truncate" title={item.collection?.title || 'Unsorted'}>
                    {item.collection?.title || 'Unsorted'}
                </span>
             </div>
             <span className="flex-shrink-0">{formatDate(item.created)}</span>
         </div>
      </div>

      {/* Action Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 right-4 flex flex-col gap-1"
          >
            <button
              onClick={handleAddToVault}
              className="p-2 rounded-md bg-background/80 backdrop-blur-sm hover:bg-accent text-muted-foreground hover:text-foreground shadow-sm transition-colors"
              title="Add to Vault"
            >
              <Download size={14} />
            </button>
            <button
              onClick={handleOpenLink}
              className="p-2 rounded-md bg-background/80 backdrop-blur-sm hover:bg-accent text-muted-foreground hover:text-foreground shadow-sm transition-colors"
              title="Open Link"
            >
              <ExternalLink size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-accent rounded-xl pointer-events-none" />
      )}
    </motion.div>
  );
};
