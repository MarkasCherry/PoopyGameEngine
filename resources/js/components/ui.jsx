import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Button({ variant = 'primary', className = '', ...props }) {
    const variants = {
        primary: 'btn-glow text-white',
        ghost: 'glass text-violet-100 hover:border-violet-300/40 hover:bg-white/10 transition',
        danger: 'bg-rose-600/80 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-900/40',
        subtle: 'text-violet-300/80 hover:text-white hover:bg-white/5 transition',
    };

    return (
        <button
            className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
            {...props}
        />
    );
}

export function IconButton({ className = '', ...props }) {
    return (
        <button
            className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-violet-300/70 transition hover:bg-white/10 hover:text-white ${className}`}
            {...props}
        />
    );
}

export function Modal({ open, onClose, title, children, wide = false }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
            <div className={`glass-deep animate-pop relative max-h-[85vh] w-full overflow-y-auto rounded-3xl p-6 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
                    <IconButton onClick={onClose} aria-label="Close">✕</IconButton>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
}

export function Field({ label, hint, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-300/80 uppercase">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-violet-300/50">{hint}</span>}
        </label>
    );
}

const inputClass =
    'w-full rounded-xl border border-white/10 bg-ink-900/70 px-3.5 py-2.5 text-sm text-white placeholder:text-violet-300/30 outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20';

export function Input(props) {
    return <input className={inputClass} {...props} />;
}

export function TextArea(props) {
    return <textarea className={`${inputClass} min-h-24 resize-y`} {...props} />;
}

export function Select({ children, ...props }) {
    return (
        <select className={`${inputClass} appearance-none`} {...props}>
            {children}
        </select>
    );
}

export function ColorInput({ value, onChange, allowEmpty = true }) {
    return (
        <div className="flex items-center gap-2">
            <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-white/15 shadow-inner">
                <input
                    type="color"
                    value={value || '#7b86f5'}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute -inset-2 size-14 cursor-pointer"
                />
            </div>
            <Input
                value={value ?? ''}
                placeholder="inherit"
                onChange={(e) => onChange(e.target.value || null)}
            />
            {allowEmpty && value && (
                <IconButton onClick={() => onChange(null)} title="Clear (inherit)">✕</IconButton>
            )}
        </div>
    );
}

export function Toggle({ checked, onChange, label }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex cursor-pointer items-center gap-2.5 text-sm text-violet-100"
        >
            <span
                className={`relative h-5.5 w-10 rounded-full transition ${checked ? 'bg-fuchsia-500 shadow-[0_0_12px_rgba(88,101,242,0.6)]' : 'bg-white/15'}`}
            >
                <span
                    className={`absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-all ${checked ? 'left-5' : 'left-0.5'}`}
                />
            </span>
            {label}
        </button>
    );
}

export function EmptyState({ icon, title, subtitle, action }) {
    return (
        <div className="animate-rise flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="text-5xl drop-shadow-[0_0_20px_rgba(88,101,242,0.5)]">{icon}</div>
            <div className="text-lg font-semibold text-white">{title}</div>
            {subtitle && <div className="max-w-sm text-sm text-violet-300/60">{subtitle}</div>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

export function Spinner() {
    return (
        <div className="flex justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-2 border-violet-400/30 border-t-fuchsia-400" />
        </div>
    );
}

export function Badge({ children, tone = 'violet' }) {
    const tones = {
        violet: 'bg-violet-500/15 text-violet-200 border-violet-400/25',
        fuchsia: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/25',
        cyan: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/25',
        amber: 'bg-amber-500/15 text-amber-200 border-amber-400/25',
    };

    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
            {children}
        </span>
    );
}
