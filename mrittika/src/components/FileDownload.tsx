import { useState } from 'react';
import { Download, FileText } from 'lucide-react';

interface FileDownloadProps {
  fileName: string;
  displayName?: string;
  className?: string;
}

export function FileDownload({ fileName, displayName, className = "" }: FileDownloadProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!fileName) return;
    
    setIsLoading(true);
    try {
      // For now, we'll construct the Minio URL directly
      // In production, you might want a proper download endpoint
      const minioUrl = `http://localhost:9000/expense-receipts/${fileName}`;
      
      const response = await fetch(minioUrl);
      if (!response.ok) {
        throw new Error('File not found');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = displayName || fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  if (!fileName) {
    return (
      <span className="text-gray-400 text-sm">
        No receipt attached
      </span>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className={`inline-flex items-center text-blue-600 hover:text-blue-800 text-sm ${className}`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Loading...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-1" />
          {displayName || 'View Receipt'}
        </>
      )}
    </button>
  );
}
