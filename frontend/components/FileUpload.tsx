interface FileUploadProps {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    file: File | null;
    onExtract: () => void;
    loading: boolean;
    hasResult: boolean;
    }

    export default function FileUpload({ onFileChange, file, onExtract, loading, hasResult }: FileUploadProps) {
    return (
        <div className="space-y-4">
        {/* File Upload Input */}
        <div className="border-2 border-dashed border-gray-700 p-6 rounded-xl text-center space-y-4 bg-gray-900/50">
            <input 
            type="file" 
            accept="image/*" 
            onChange={onFileChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer"
            />
            {file && <p className="text-green-400 text-sm">Selected: {file.name}</p>}
        </div>

        {/* Action Button */}
        {file && !hasResult && (
            <button 
            onClick={onExtract}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 py-3 rounded-lg font-semibold transition cursor-pointer"
            >
            {loading ? 'Processing OCR...' : 'Extract Text & Show Overlay'}
            </button>
        )}
        </div>
    );
}