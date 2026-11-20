interface BlockListProps {
    result: any;
    initialResult: any;
    editingIndex: number | null;
    setEditingIndex: (index: number | null) => void;
    handleTextChange: (index: number, newText: string) => void;
}

    export default function BlockList({
    result,
    initialResult,
    editingIndex,
    setEditingIndex,
    handleTextChange,
    }: BlockListProps) {
    return (
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 space-y-3 flex flex-col h-137.5">
        <h2 className="text-lg font-semibold text-violet-400">Extracted Text Blocks ({result.blocks?.length})</h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {result.blocks?.map((block: any, index: number) => {
            const isModified = initialResult && initialResult.blocks[index]?.text !== block.text;
            return (
                <div 
                key={index} 
                onClick={() => setEditingIndex(index)}
                className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between gap-2 ${
                    editingIndex === index 
                    ? 'bg-gray-800 border-yellow-400' 
                    : isModified
                    ? 'bg-green-950/40 border-green-500'
                    : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                }`}
                >
                <input 
                    type="text"
                    value={block.text}
                    onChange={(e) => handleTextChange(index, e.target.value)}
                    className="bg-transparent text-sm w-full outline-none text-white font-mono"
                />
                <span className="text-[10px] text-gray-500 whitespace-nowrap">#{index + 1}</span>
                </div>
            );
            })}
        </div>
        </div>
    );
}