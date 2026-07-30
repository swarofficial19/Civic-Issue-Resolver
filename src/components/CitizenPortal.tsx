import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  MapPin, 
  Mic, 
  Square, 
  Play, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  Save, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  ChevronRight,
  FileText,
  Volume2,
  Navigation,
  Info
} from 'lucide-react';
import { CivicReport, Department, Priority, District, LocationData } from '../types';
import { INDIAN_MUNICIPALITIES } from '../data/seedData';
import { INDIAN_STATES, getStateForMunicipality } from '../utils/geoUtils';
import { saveOfflineDraft } from '../utils/offlineStorage';
import { useToast } from './ToastContext';
import { User as FirebaseUser, sendEmailVerification } from 'firebase/auth';

interface CitizenPortalProps {
  reports: CivicReport[];
  onSubmitReport: (reportData: Partial<CivicReport>) => Promise<CivicReport | null>;
  isOnline: boolean;
  onSaveDraft: (draft: CivicReport) => void;
  currentUser?: FirebaseUser | null;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  reports,
  onSubmitReport,
  isOnline,
  onSaveDraft,
  currentUser
}) => {
  const { toast } = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState<District>('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('');
  const [lat, setLat] = useState<number>(28.6139);
  const [lng, setLng] = useState<number>(77.2090);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const [category, setCategory] = useState<Department | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [reporterName, setReporterName] = useState(currentUser?.displayName || '');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterEmail, setReporterEmail] = useState(currentUser?.email || '');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  // Update autofill if currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (!reporterName && currentUser.displayName) setReporterName(currentUser.displayName);
      if (!reporterEmail && currentUser.email) setReporterEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleResendEmailVerification = async () => {
    if (!currentUser) return;
    setIsResendingVerification(true);
    try {
      await sendEmailVerification(currentUser);
      toast.success(`Verification email dispatched to ${currentUser.email}. Please check your inbox or spam folder.`, 'Verification Sent');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend verification email.', 'Error');
    } finally {
      setIsResendingVerification(false);
    }
  };

  // Geocoding and GPS status state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Photo state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<any>(null);

  // AI Classification State
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  // Form submission / Draft UI feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessTicket, setSubmitSuccessTicket] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Report Tracking & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackerReport, setSelectedTrackerReport] = useState<CivicReport | null>(null);


  // Auto-detect municipal corporation & state from address string
  useEffect(() => {
    if (!address) return;
    const lowerAddr = address.toLowerCase();
    const matched = INDIAN_MUNICIPALITIES.find(m => {
      const cityName = m.split('(')[0].trim().toLowerCase();
      return cityName.length > 2 && lowerAddr.includes(cityName);
    });
    if (matched && matched !== district) {
      setDistrict(matched);
      setStateName(getStateForMunicipality(matched, address));
    } else if (address) {
      setStateName(getStateForMunicipality(district, address));
    }
  }, [address]);

  useEffect(() => {
    if (district) {
      setStateName(getStateForMunicipality(district, address));
    }
  }, [district]);

  // Combine static list with current district if custom
  const municipalityOptions = Array.from(new Set([
    ...INDIAN_MUNICIPALITIES,
    ...(district ? [district] : [])
  ])).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.', 'GPS Unsupported');
      return;
    }
    setIsDetectingGps(true);
    setGeocodeStatus(null);
    setGpsAccuracy(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const detectedLat = Number(pos.coords.latitude.toFixed(6));
        const detectedLng = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy);
        setLat(detectedLat);
        setLng(detectedLng);
        setGpsAccuracy(acc);

        // Reverse-geocode coordinates to automatically populate address, district & state
        try {
          const res = await fetch('/api/reverse-geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: detectedLat, lng: detectedLng }),
          });
          if (res.ok) {
            const revData = await res.json();
            if (revData.address) setAddress(revData.address);
            if (revData.district) {
              setDistrict(revData.district);
              setStateName(getStateForMunicipality(revData.district, revData.address));
            }
            toast.success(`Location re-detected: ${revData.address || `${detectedLat}, ${detectedLng}`}`, 'GPS Location Refreshed');
          } else {
            toast.success(`Fresh GPS position acquired: ${detectedLat}°, ${detectedLng}° (±${acc}m)`, 'GPS Location Refreshed');
          }
        } catch (e) {
          toast.success(`Fresh GPS position acquired: ${detectedLat}°, ${detectedLng}°`, 'GPS Location Refreshed');
        } finally {
          setIsDetectingGps(false);
        }

        if (acc > 300) {
          setGeocodeStatus(`GPS Accuracy Warning: Position is within ±${acc}m. Adjust street details if needed.`);
        } else {
          setGeocodeStatus(`Fresh GPS Lock Acquired! Accuracy ±${acc}m (${detectedLat}°, ${detectedLng}°).`);
        }
      },
      (err) => {
        console.warn('GPS position error:', err);
        setIsDetectingGps(false);
        setGpsAccuracy(null);
        setLat(28.6139);
        setLng(77.2090);
        setGeocodeStatus('GPS Signal Unavailable: Geolocation timed out or blocked. Type your address below.');
        toast.warning('Could not auto-detect exact GPS coordinates.', 'GPS Signal Timed Out');
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // AI Track Address & Detect Coordinates
  const handleGeocodeAddress = async () => {
    if (!address || address.trim().length < 3) {
      toast.warning('Please enter a street address, locality, or landmark first.', 'Address Required');
      return;
    }
    setIsGeocoding(true);
    setGeocodeStatus(null);

    try {
      const res = await fetch('/api/geocode-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (res.ok) {
        const data = await res.json();
        setLat(Number(data.lat.toFixed(6)));
        setLng(Number(data.lng.toFixed(6)));
        if (data.district) setDistrict(data.district);
        if (data.address) setAddress(data.address);

        setGeocodeStatus(`AI Pinpointed Location: Lat ${data.lat.toFixed(6)}, Lng ${data.lng.toFixed(6)} (${data.district})`);
        toast.success(`Coordinates synced for "${address}": ${data.lat.toFixed(4)}°, ${data.lng.toFixed(4)}°`, 'Location Pinpointed');
      } else {
        setGeocodeStatus('AI geocoding failed. Position defaulted to city center.');
        toast.error('AI geocoding could not pinpoint address. Please verify city name.', 'Geocoding Failed');
      }
    } catch (err) {
      console.error('Error during AI geocoding:', err);
      setGeocodeStatus('Error contacting AI geocoding service. Position set manually.');
      toast.error('Could not reach geocoding service.', 'Network Error');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Image Upload File Handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        triggerAiClassification(base64, description);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live Camera Photo Capture
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied or unequipped:', err);
      alert('Camera access unavailable. Please use file upload instead.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        stopCamera();
        triggerAiClassification(dataUrl, description);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // MediaRecorder Voice Note Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Audio recorder failed:', err);
      alert('Microphone access is needed to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
  };

  // Trigger Gemini AI Classification
  const triggerAiClassification = async (imageB64?: string | null, descText?: string) => {
    setIsAiScanning(true);
    setFormError(null);

    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageB64 || imagePreview,
          description: descText || description,
          location: { district, address }
        })
      });

      const data = await res.json();
      setAiResult(data);
      if (data.category) setCategory(data.category);
      if (data.priority) setPriority(data.priority);
      if (data.shortTitle) {
        setTitle(data.shortTitle);
      } else if (!title && data.summary) {
        const words = data.summary.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
        const short = words.slice(0, 5).join(' ');
        setTitle(short || `${data.category || 'Civic'} Defect`);
      }
    } catch (err) {
      console.error('AI classification call failed:', err);
    } finally {
      setIsAiScanning(false);
    }
  };

  // Submit Report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please provide a brief issue title.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const effectiveCategory = category || (aiResult?.category as Department) || 'Sanitation';
    const effectivePriority = priority || (aiResult?.priority as Priority) || 'MEDIUM';
    const effectiveDistrict = district || 'Delhi (MCD)';
    const effectiveState = stateName || getStateForMunicipality(effectiveDistrict, address);

    const locationData: LocationData = {
      lat,
      lng,
      address: address || 'Current Location',
      district: effectiveDistrict,
      state: effectiveState
    };

    // If Offline or user clicked draft mode
    if (!isOnline) {
      const draftReport: CivicReport = {
        id: `draft-${Date.now()}`,
        ticketNo: `DRAFT-${Math.floor(1000 + Math.random() * 9000)}`,
        title,
        category,
        description,
        priority,
        status: 'Submitted',
        location: locationData,
        imageUrl: imagePreview || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slaHours: priority === 'CRITICAL' ? 12 : 24,
        slaDueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        isSlaOverdue: false,
        aiAnalysis: aiResult,
        timeline: [{ status: 'Submitted', title: 'Saved as Offline Draft', timestamp: new Date().toISOString() }],
        isOfflineDraft: true
      };

      saveOfflineDraft(draftReport);
      onSaveDraft(draftReport);
      setSubmitSuccessTicket(`Saved as Offline Draft: ${draftReport.ticketNo}`);
      setIsSubmitting(false);
      resetForm();
      return;
    }

    try {
      const created = await onSubmitReport({
        title,
        category,
        description,
        priority,
        location: locationData,
        imageUrl: imagePreview || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        reporterName: isAnonymous ? 'Anonymous Citizen' : reporterName,
        reporterPhone: isAnonymous ? '' : reporterPhone,
        reporterEmail: isAnonymous ? '' : reporterEmail,
        isAnonymous,
        aiAnalysis: aiResult
      });

      if (created) {
        setSubmitSuccessTicket(created.ticketNo);
        resetForm();
      }
    } catch (err) {
      setFormError('Failed to submit report. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImagePreview(null);
    clearAudio();
    setAiResult(null);
    setReporterEmail('');
    setReporterName('');
    setReporterPhone('');
    setGeocodeStatus(null);
  };

  // Filtered reports for Citizen Tracker
  const filteredTrackerReports = reports.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.ticketNo.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.location.ward.toLowerCase().includes(q) ||
      r.location.district.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Intro Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-700/50">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Auto-Routing Engine Active</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Report Civic Issues in Your Ward
          </h2>
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            Upload geotagged photos, record voice notes, or submit complaints for water supply, streetlights, sanitation, and potholes. Automated Gemini AI classifies priority and auto-routes directly to Municipal Officers across India.
          </p>
        </div>
      </div>

      {/* Email Verification Banner */}
      {currentUser && !currentUser.emailVerified && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm">Email Address Unverified ({currentUser.email})</h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Please check your email inbox to verify your account for official citizen grievance updates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResendEmailVerification}
            disabled={isResendingVerification}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow transition cursor-pointer whitespace-nowrap self-end sm:self-auto disabled:opacity-50"
          >
            {isResendingVerification ? 'Sending Email...' : 'Resend Verification Email'}
          </button>
        </div>
      )}

      {/* Main Grid: Left = Submission Form, Right = Live Status Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT FORM (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                Citizen Issue Submission Form
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Geotagged Media • Auto-GPS • Gemini AI Assisted
              </p>
            </div>
            {!isOnline && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <Save className="w-3 h-3" /> Offline Mode
              </span>
            )}
          </div>

          {submitSuccessTicket && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Report Successfully Filed!</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Your ticket number is <strong className="font-mono text-sm underline">{submitSuccessTicket}</strong>. You can track resolution status in real-time on the tracker panel.
                </p>
                <button
                  onClick={() => setSubmitSuccessTicket(null)}
                  className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 underline cursor-pointer"
                >
                  File Another Report
                </button>
              </div>
            </div>
          )}

          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Photo Capture / Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                1. Photo Evidence (Geotagged)
              </label>

              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video group">
                  <img src={imagePreview} alt="Issue preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="p-2 bg-rose-600 text-white rounded-full shadow cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerAiClassification(imagePreview, description)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Re-Scan with AI
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="p-4 border-2 border-dashed border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex flex-col items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-emerald-600" />
                    <span className="text-xs font-bold">Take Photo (Live Camera)</span>
                  </button>

                  <label className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 flex flex-col items-center justify-center gap-2 transition cursor-pointer">
                    <Send className="w-6 h-6 text-slate-500" />
                    <span className="text-xs font-bold">Upload Photo File</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {/* AI Auto-Routing Card */}
            {(isAiScanning || aiResult) && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span>Gemini AI Auto-Routing Scanner</span>
                  </div>
                  {aiResult?.confidence && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                      {(aiResult.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  )}
                </div>

                {isAiScanning ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 animate-pulse">
                    Scanning photo & text for priority level, department routing, and risk analysis...
                  </p>
                ) : (
                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
                    <p className="font-medium text-slate-900 dark:text-white">
                      <strong>AI Summary:</strong> {aiResult.summary}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                        Category: <strong className="text-emerald-600">{aiResult.category}</strong>
                      </span>
                      <span className={`px-2 py-1 rounded-md font-extrabold border ${
                        aiResult.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        aiResult.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        Priority: {aiResult.priority}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                        Route To: <strong>{aiResult.suggestedDepartment}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Issue Details */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                2. Issue Details
              </label>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Issue Title / Short Summary *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Burst water line spillage near Main Road bridge"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Category (Department)</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as Department)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Category (or auto-detect by AI)</option>
                    <option value="Sanitation">Sanitation & Waste</option>
                    <option value="Water">Water Supply & Sewerage</option>
                    <option value="Electrical">Electrical & Streetlights</option>
                    <option value="Roads">Roads & Potholes</option>
                    <option value="Public Safety">Public Safety & Open Drains</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as Priority)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Priority (or auto-detect by AI)</option>
                    <option value="CRITICAL">CRITICAL (Risk to life/severe damage)</option>
                    <option value="HIGH">HIGH (Major public disruption)</option>
                    <option value="MEDIUM">MEDIUM (Standard civic complaint)</option>
                    <option value="LOW">LOW (Minor aesthetic defect)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Detailed Description</label>
                <textarea
                  value={description}
                  onChange={e => {
                    setDescription(e.target.value);
                  }}
                  onBlur={() => {
                    if (description.length > 10) triggerAiClassification(imagePreview, description);
                  }}
                  placeholder="Describe the problem, landmarks, or danger to vehicles/pedestrians..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* 3. Location Auto-Detection & Ward Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  3. Municipal Corporation & Location (India)
                </label>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isDetectingGps}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                  {isDetectingGps ? 'Detecting Device GPS...' : 'Auto-Detect Device GPS'}
                </button>
              </div>

              {/* GPS / Geocoding Status Banner */}
              {geocodeStatus && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  geocodeStatus.includes('Warning') || geocodeStatus.includes('Unavailable')
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                }`}>
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{geocodeStatus}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Municipal Corporation *</label>
                  <select
                    value={district}
                    onChange={e => {
                      const newDist = e.target.value as District;
                      setDistrict(newDist);
                      if (newDist) setStateName(getStateForMunicipality(newDist, address));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Municipal Corporation</option>
                    {municipalityOptions.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">State / Union Territory *</label>
                  <select
                    value={stateName}
                    onChange={e => setStateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select State / UT</option>
                    {INDIAN_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Manual Address Input + AI Geocode Trigger */}
              <div className="space-y-2">
                <label className="block text-xs text-slate-600 dark:text-slate-400">Street Address / Landmark</label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. Ring Road near Lajpat Nagar Metro, New Delhi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>Current GIS Coordinates:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    Lat {lat.toFixed(4)}, Lng {lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Voice Note Audio Recorder */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>4. Audio Voice Note (Optional)</span>
                {audioUrl && <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">✓ Audio Recorded</span>}
              </label>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                {isRecording ? (
                  <div className="flex items-center space-x-3 text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                    <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                    <span>Recording Voice Note ({recordingDuration}s)...</span>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" /> Stop
                    </button>
                  </div>
                ) : audioUrl ? (
                  <div className="flex items-center justify-between w-full">
                    <audio src={audioUrl} controls className="h-9 max-w-xs" />
                    <button
                      type="button"
                      onClick={clearAudio}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Delete audio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Record voice complaint in Hindi, English, Tamil, Telugu, Bengali, Marathi, or regional language
                    </span>
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" /> Record Voice Note
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Citizen Details */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  5. Contact Details (For SLA updates)
                </label>
                <label className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={e => setIsAnonymous(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Submit Anonymously</span>
                </label>
              </div>

              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={reporterName}
                      onChange={e => setReporterName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Mobile Number (+91)</label>
                    <input
                      type="tel"
                      value={reporterPhone}
                      onChange={e => setReporterPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Email ID (For official email ticket status updates)</label>
                    <input
                      type="email"
                      value={reporterEmail}
                      onChange={e => setReporterEmail(e.target.value)}
                      placeholder="e.g. citizen.swarrana@gmail.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end space-x-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Submitting Report...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Report to Municipality
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT LIVE TRACKER (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Live Report Status Tracker
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {reports.length} Reports
              </span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search ticket no. (e.g. RMC-2026) or ward..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Selected Detailed Ticket Card View */}
            {selectedTrackerReport ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTrackerReport.ticketNo}
                  </span>
                  <button
                    onClick={() => setSelectedTrackerReport(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Close Details
                  </button>
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                  {selectedTrackerReport.title}
                </h4>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    selectedTrackerReport.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                    selectedTrackerReport.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedTrackerReport.status}
                  </span>
                  <span className="text-slate-500">{selectedTrackerReport.location.address}, {selectedTrackerReport.location.district}</span>
                </div>

                {/* Status Step Bar */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-slate-500 mb-2">Resolution Progress:</div>
                  <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
                    {['Submitted', 'Acknowledged', 'In Progress', 'Resolved'].map((st, idx) => {
                      const stages = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
                      const currentIdx = stages.indexOf(selectedTrackerReport.status);
                      const isDone = currentIdx >= idx;
                      return (
                        <div key={st} className="space-y-1">
                          <div className={`h-2 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                          <span className={isDone ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                            {st}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Proof of resolution if resolved */}
                {selectedTrackerReport.proofOfResolution && (
                  <div className="p-3 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 space-y-2">
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Verified Proof of Resolution</span>
                    </div>
                    {selectedTrackerReport.proofOfResolution.imageUrl && (
                      <img
                        src={selectedTrackerReport.proofOfResolution.imageUrl}
                        alt="Resolution proof"
                        className="w-full h-32 object-cover rounded-lg border border-emerald-300"
                      />
                    )}
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      "{selectedTrackerReport.proofOfResolution.notes}"
                    </p>
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Activity Logs:</div>
                  <div className="space-y-2 text-xs">
                    {selectedTrackerReport.timeline.map((event, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-slate-600 dark:text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{event.title}</p>
                          <p className="text-[10px] text-slate-400">{new Date(event.timestamp).toLocaleString()}</p>
                          {event.note && <p className="text-[11px] text-slate-500 italic mt-0.5">{event.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* List of Reports */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredTrackerReports.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No civic reports found for this search query.
                </div>
              ) : (
                filteredTrackerReports.map(report => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedTrackerReport(report)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-600 bg-slate-50/50 dark:bg-slate-800/40 transition cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {report.ticketNo}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        report.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        report.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {report.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600">
                      {report.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="truncate">{report.location.address}, {report.location.district}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
