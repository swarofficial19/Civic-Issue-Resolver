import React, { useState } from 'react';
import { CivicReport, ProofOfResolution } from '../types';
import { CheckCircle2, Upload, X, ShieldCheck } from 'lucide-react';

interface ResolutionModalProps {
  report: CivicReport;
  onClose: () => void;
  onSubmitResolution: (reportId: string, proof: ProofOfResolution) => void;
}

export const ResolutionModal: React.FC<ResolutionModalProps> = ({
  report,
  onClose,
  onSubmitResolution
}) => {
  const [imageUrl, setImageUrl] = useState<string>('https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80');
  const [notes, setNotes] = useState('');
  const [resolvedBy, setResolvedBy] = useState('Municipal Field Crew (Municipal Engineer)');
  const [workerPhone, setWorkerPhone] = useState('+91 94311 00000');
  const [isUploading, setIsUploading] = useState(false);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      alert('Please provide resolution notes describing the repair work completed.');
      return;
    }

    const proof: ProofOfResolution = {
      imageUrl,
      notes,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
      workerPhone
    };

    onSubmitResolution(report.id, proof);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Upload Proof of Resolution
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">Ticket: {report.ticketNo} — {report.title}</p>
          <p className="text-slate-500">{report.location.address}, {report.location.district} • {report.category}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              "After" Photo Evidence (Proof of Repair)
            </label>
            <div className="space-y-2">
              {imageUrl && (
                <img src={imageUrl} alt="Proof preview" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
              )}
              <label className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-4 h-4 text-emerald-600" />
                Upload New Photo File
                <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Field Work Completion Notes *
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Cleared drain debris, sanitized area with bleaching powder, water flow restored."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Officer / Worker Name</label>
              <input
                type="text"
                value={resolvedBy}
                onChange={e => setResolvedBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Worker Contact Phone</label>
              <input
                type="text"
                value={workerPhone}
                onChange={e => setWorkerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 cursor-pointer font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Resolve & Close Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
