import type { SVGProps } from "react";

const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
type P = SVGProps<SVGSVGElement>;

export const LockIcon = (p: P) => <svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>;
export const ShieldIcon = (p: P) => <svg {...base} {...p}><path d="M12 3 5 6v5.5c0 4.4 2.9 8 7 9.5 4.1-1.5 7-5.1 7-9.5V6Z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>;
export const TruckIcon = (p: P) => <svg {...base} {...p}><path d="M3 6.5h10.5V16H3Z" /><path d="M13.5 9.5h4l3 3.2V16h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>;
export const BanknoteIcon = (p: P) => <svg {...base} {...p}><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v.01M18 14.5v.01" /></svg>;
export const CheckIcon = (p: P) => <svg {...base} {...p}><path d="m5 12.5 4.2 4.2L19 7" /></svg>;
export const ArrowLeftIcon = (p: P) => <svg {...base} {...p}><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></svg>;
export const WhatsAppIcon = (p: P) => <svg {...base} {...p}><path d="M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8Z" /><path d="M9.2 8.8c.3 2.4 2.3 4.4 4.7 4.7l1.2-1.1-1.7-1-.9.6a3 3 0 0 1-1.6-1.6l.6-.9-1-1.7Z" /></svg>;
export const StarIcon = (p: P) => <svg {...base} fill="currentColor" strokeWidth={1.2} {...p}><path d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9Z" /></svg>;
export const ClockIcon = (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
export const WalletIcon = (p: P) => <svg {...base} {...p}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="3.5" y="8" width="17" height="11.5" rx="2.5" /><path d="M16 13.8h2.2" /></svg>;
export const PackageIcon = (p: P) => <svg {...base} {...p}><path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2Z" /><path d="m4 7.2 8 4.3 8-4.3M12 11.5V21" /></svg>;
export const CheckCircleIcon = (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="m8.2 12.4 2.6 2.6 5-5.4" /></svg>;
export const ChevronDownIcon = (p: P) => <svg {...base} {...p}><path d="m6 9 6 6 6-6" /></svg>;
