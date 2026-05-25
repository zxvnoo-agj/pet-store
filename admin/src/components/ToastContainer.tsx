import { useToastStore } from '../stores/toastStore'
import { CheckCircle, XCircle, Info } from 'lucide-react'

export default function ToastContainer() {
  const toasts = useToastStore((s: any) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[200] space-y-2">
      {toasts.map((toast: any) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-right ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : toast.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4" />}
          {toast.type === 'info' && <Info className="w-4 h-4" />}
          {toast.message}
        </div>
      ))}
    </div>
  )
}
