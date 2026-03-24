import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload as UploadIcon, Film, ArrowLeft, Loader2 } from 'lucide-react';

type SessionType = 'forehand' | 'backhand' | 'saque' | 'mezcla';

export function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('mezcla');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/mp4')) {
        setError('Por favor selecciona un archivo .mp4');
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError('El archivo es muy grande. Máximo 500MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith('video/mp4')) {
        setError('Por favor selecciona un archivo .mp4');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    setUploading(true);
    setError('');
    let videoPath = '';

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No autenticado');

      const fileName = `${authUser.id}/${Date.now()}.mp4`;
      videoPath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, selectedFile, {
          contentType: 'video/mp4'
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);
      setUploading(false);
      setProcessing(true);

      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      const response = await fetch(
        'https://aachondo--tennis-pipeline-v2-analyze-video-endpoint.modal.run',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_url: urlData.publicUrl,
            session_type: sessionType,
            user_id: authUser.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al procesar el video');
      }

      const result = await response.json();

      await supabase.storage.from('videos').remove([fileName]);

      const { data: sessionData, error: dbError } = await supabase
        .from('sessions')
        .insert({
          user_id: authUser.id,
          session_type: result.session_type,
          global_score: result.global_score,
          nivel_general: result.nivel_general,
          diagnostico_global: result.reporte?.diagnostico_global || '',
          reporte_narrativo: result.reporte?.reporte_narrativo_completo || '',
          scores_detalle: result.reporte?.scores_detalle || {},
          prioridades_mejora: result.reporte?.prioridades_mejora || [],
          plan_ejercicios: result.plan_ejercicios || {}
        })
        .select();

      if (dbError) {
        console.error('Supabase error:', JSON.stringify(dbError));
        throw dbError;
      }

      navigate(`/report/${sessionData![0].id}`);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al procesar el video');
      if (videoPath) {
        await supabase.storage.from('videos').remove([videoPath]);
      }
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Analizando tu técnica...</h2>
          <p className="text-gray-400 mb-6">
            Esto puede tomar entre 5-10 minutos. Por favor no cierres esta ventana.
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-cyan-500 h-2 rounded-full transition-all duration-500" style={{ width: '50%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Dashboard
          </button>

          <h1 className="text-4xl font-bold text-white mb-8">Subir Video para Análisis</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-lg font-medium text-white mb-4">
                Tipo de Sesión
              </label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'forehand', label: 'Forehand' },
                  { value: 'backhand', label: 'Backhand' },
                  { value: 'saque', label: 'Saque' },
                  { value: 'mezcla', label: 'Mezcla' },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSessionType(type.value as SessionType)}
                    className={`p-4 rounded-lg border-2 font-medium transition-all ${
                      sessionType === type.value
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-lg font-medium text-white mb-4">
                Video (.mp4)
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-700 rounded-xl p-12 text-center hover:border-cyan-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <Film className="w-8 h-8 text-cyan-500" />
                    <span className="text-white font-medium">{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <UploadIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">
                      Arrastra tu video aquí o haz clic para seleccionar
                    </p>
                    <p className="text-gray-500 text-sm">Formato: .mp4 • Máximo: 500MB</p>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="w-full px-8 py-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-lg transition-colors"
            >
              {uploading ? 'Subiendo...' : 'Analizar Video'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
