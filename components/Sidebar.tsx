import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, Tag, X } from 'lucide-react';
import { DiseaseEntity } from '../types';
import { normalizeTag } from '../utils/taxonomy';

interface SidebarProps {
    entities: DiseaseEntity[];
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
}

interface TreeNode {
    name: string;
    fullPath: string; // The full tag path for filtering, e.g. "Congenital_Structural::Cyst" (Skin removed)
    count: number;
    children: Record<string, TreeNode>;
}

interface TreeNodeItemProps {
    node: TreeNode;
    level: number;
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({ node, level, selectedCategory, onSelectCategory }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = Object.keys(node.children).length > 0;
    const isSelected = selectedCategory === node.fullPath;

    const handleInteraction = (e: React.MouseEvent) => {
        e.stopPropagation();
        // If it has children, toggle expansion
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
        // Always select the category
        onSelectCategory(node.fullPath);
    };

    return (
        <div className="select-none">
            <div
                className={`
        flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors
        ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}
      `}
                style={{ paddingLeft: `${level * 12 + 12}px` }}
                onClick={handleInteraction}
            >
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <span className="w-6" /> // Spacer
                )}

                <span className="flex-1 truncate text-sm">{node.name}</span>
                {/* <span className="text-xs text-slate-400">{node.count}</span> */}
            </div>

            {isExpanded && hasChildren && (
                <div>
                    {Object.values(node.children)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(child => (
                            <TreeNodeItem
                                key={child.fullPath}
                                node={child}
                                level={level + 1}
                                selectedCategory={selectedCategory}
                                onSelectCategory={onSelectCategory}
                            />
                        ))}
                </div>
            )}
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ entities, selectedCategory, onSelectCategory }) => {
    // Collapsed by default as requested
    const [isExpanded, setIsExpanded] = useState(false);

    // Build the tree structure from tags
    const tree = useMemo(() => {
        const root: Record<string, TreeNode> = {};

        entities.forEach(entity => {
            if (!entity.tags) return;
            entity.tags.forEach(rawTag => {
                const tag = normalizeTag(rawTag);

                // Tag format: Skin::Level1::Level2...
                // We want to ignore "Skin"
                const parts = tag.split('::');

                if (parts[0] === 'Skin') {
                    // Process from index 1 onwards
                    let currentLevel = root;
                    let currentPath = "";

                    for (let i = 1; i < parts.length; i++) {
                        const part = parts[i];
                        currentPath = currentPath ? `${currentPath}::${part}` : part;

                        if (!currentLevel[part]) {
                            currentLevel[part] = {
                                name: part.replace(/_/g, ' '), // Prettify name
                                fullPath: currentPath,
                                count: 0,
                                children: {}
                            };
                        }

                        // Increment count for this node (it contains this entity)
                        currentLevel[part].count++;
                        currentLevel = currentLevel[part].children;
                    }
                }
            });
        });

        return root;
    }, [entities]);

    return (
        <div className={`flex-shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col transition-all duration-300 ${isExpanded ? 'w-64' : 'w-auto'}`}>
            <div
                className="p-4 border-b border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif font-bold text-slate-800 flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        {isExpanded ? 'Categories' : ''}
                    </h3>

                    {selectedCategory && isExpanded && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectCategory(null);
                            }}
                            className="text-xs font-sans text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm border border-slate-200"
                        >
                            Clear <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="py-2 overflow-y-auto flex-1">
                    {Object.values(tree)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(node => (
                            <TreeNodeItem
                                key={node.fullPath}
                                node={node}
                                level={0}
                                selectedCategory={selectedCategory}
                                onSelectCategory={onSelectCategory}
                            />
                        ))}
                </div>
            )}

            {/* Vertical text when collapsed? Or just icon? Let's keep it simple with just the icon header for now. */}
            {!isExpanded && selectedCategory && (
                <div className="p-2 flex flex-col items-center">
                    <div
                        className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center cursor-pointer"
                        title={selectedCategory}
                        onClick={() => setIsExpanded(true)}
                    >
                        <Tag size={16} />
                    </div>
                </div>
            )}
        </div>
    );
};
