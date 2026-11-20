'use client';
import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import DocumentCanvas from '@/components/DocumentCanvas';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [img_width, setImg_width] = useState(0);
  const [img_height, setImg_height] = useState(0);
  const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleExtract = async () => {
    if (!file) {
      alert('Select an Image!');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      setImg_width(data.img_width);
      setImg_height(data.img_height);
    } catch (error) {
      console.error('Error extracting text:', error);
      alert('Extraction failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (index: number, newText: string) => {
    // Kept for compatibility but not used in new UX
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">📄 Interactive OCR Document Editor</h1>

        {/* Modular File Upload Component */}
        <FileUpload 
          onFileChange={handleFileChange}
          file={file}
          onExtract={handleExtract}
          loading={loading}
          hasResult={!!result}
        />

        {/* Visual Workspace - Manual Selection UX */}
        {result && imagePreview && (
          <DocumentCanvas 
            imagePreview={imagePreview}
            img_width={img_width}
            img_height={img_height}
            setRenderedSize={setRenderedSize}
          />
        )}
      </div>
    </main>
  );
}