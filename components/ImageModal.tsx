import React from 'react';
import { X } from 'lucide-react';
import { MediaItem } from '../types';
import { getImageUrl } from '../utils/media';

interface ImageModalProps {
    media: MediaItem | null;
    onClose: () => void;
    title?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ media, onClose, title }) => {
    if (!media) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
            style={{ animationFillMode: 'forwards' }} // Ensure animation sticks
        >
            <button
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2 z-[10001]"
                onClick={onClose}
            >
                <X size={32} />
            </button>

            <div
                className="max-w-7xl w-full max-h-screen flex flex-col md:flex-row gap-6 p-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-1 relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                        src={getImageUrl(media.path || null) || ''}
                        alt={media.legend || ''}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/800x600?text=No+Preview';
                        }}
                    />
                </div>

                <div className="md:w-80 text-white flex flex-col justify-center max-h-[80vh] overflow-y-auto">
                    {title && <h3 className="text-lg font-medium mb-2">{title}</h3>}
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-md">
                        <p className="text-sm leading-relaxed">{media.legend || 'No description available'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageModal;
