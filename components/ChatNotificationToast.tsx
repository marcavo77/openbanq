import React, { useState, useEffect, useRef } from 'react';
import { notificationService, IncomingToastData } from '../services/notificationService';
import { X, MessageSquare, ArrowRight } from 'lucide-react';
import { OpenBanqueIcon } from './Logo';

export const ChatNotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<IncomingToastData | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = notificationService.onToast((data) => {
      setActiveToast(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!activeToast) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!isHovered) {
      timerRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 5500);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeToast, isHovered]);

  if (!activeToast) return null;

  const handleToastClick = () => {
    activeToast.onOpen();
    setActiveToast(null);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveToast(null);
  };

  return (
    <div 
      className="fixed top-4 right-4 z-[9999] max-w-sm w-full mx-auto px-2 pointer-events-auto transition-all duration-300 transform animate-fade-in-down"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        onClick={handleToastClick}
        className="relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-emerald-500/50 hover:border-emerald-400 rounded-2xl shadow-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] group"
        role="alert"
        aria-live="assertive"
      >
        {/* Subtle glow effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400"></div>

        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {activeToast.senderAvatar ? (
              <img 
                src={activeToast.senderAvatar} 
                alt="" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <OpenBanqueIcon size={24} />
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-white truncate">
                {activeToast.senderName}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                À l'instant
              </span>
            </div>

            <p className="text-xs text-gray-300 mt-1 line-clamp-2 leading-relaxed break-words">
              {activeToast.content}
            </p>

            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
              <span>Répondre</span>
              <ArrowRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Auto-dismiss progress bar */}
        {!isHovered && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
            <div className="h-full bg-emerald-500 animate-[shrink_5.5s_linear_forwards]"></div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default ChatNotificationToast;
