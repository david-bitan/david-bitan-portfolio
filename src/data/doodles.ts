// Étape 14, ajout 1 (S32, annexe A): line drawings of the project-page
// composition, same hand-drawn line as the hero. Paths centred on 0,0,
// copied as given by CL2.
export const DOODLES: Record<string, string> = {
	ball: '<circle r="14"/><path d="M0 -8 L4.8 -4.5 L3 1 L-3 1 L-4.8 -4.5 Z"/><path d="M0 -8 V-14 M4.8 -4.5 L13 -6.5 M3 1 L8.5 10.8 M-3 1 L-8.5 10.8 M-4.8 -4.5 L-13 -6.5"/>',
	bell: '<path d="M-11 8 V-1 Q-11 -12 0 -12 Q11 -12 11 -1 V8 L14 11 H-14 Z"/><path d="M-3 14 Q0 17 3 14 M0 -12 v-3"/>',
	bubble: '<path d="M-20 -13 h40 q7 0 7 7 v12 q0 7 -7 7 h-22 l-9 8 v-8 h-9 q-7 0 -7 -7 v-12 q0 -7 7 -7z"/>',
	calendar: '<rect x="-15" y="-12" width="30" height="26" rx="4"/><path d="M-15 -4 h30 M-8 -16 v8 M8 -16 v8"/><path d="M-6 4 h4 M2 4 h4"/>',
	card: '<rect x="-11" y="-15" width="22" height="30" rx="3"/><path d="M0 -6 C-6 -1 -6 4 0 7 C6 4 6 -1 0 -6 Z"/>',
	check: '<path d="M-12 1 L-4 9 L13 -9"/>',
	coin: '<circle r="14"/><path d="M5 -6 Q0 -10 -4 -7 Q-8 -3 -2 -1 Q5 1 3 6 Q-1 9 -6 6 M0 -12 v4 M0 9 v4"/>',
	cursor: '<path d="M0 0 L20 7.8 L11 11 L7.8 20 Z"/>',
	dice: '<rect x="-14" y="-14" width="28" height="28" rx="6"/><circle cx="-6" cy="-6" r="1.6"/><circle cx="6" cy="6" r="1.6"/><circle cx="0" cy="0" r="1.6"/>',
	doc: '<path d="M-12 -16 h16 l8 8 v24 h-24 z"/><path d="M4 -16 v8 h8 M-6 0 h12 M-6 6 h12"/>',
	dumbbell: '<path d="M-12 0 H12"/><rect x="-20" y="-9" width="8" height="18" rx="2"/><rect x="12" y="-9" width="8" height="18" rx="2"/><path d="M-24 -4 v8 M24 -4 v8"/>',
	envelope: '<rect x="-16" y="-11" width="32" height="22" rx="3"/><path d="M-16 -9 L0 3 L16 -9"/>',
	fork: '<path d="M-6 -16 v10 q0 6 6 6 q6 0 6 -6 v-10 M0 -16 v10 M0 0 v18"/>',
	highlighter: '<path d="M-14 10 L6 -10 L12 -4 L-8 16 Z"/><path d="M-14 10 L-18 18 L-8 16"/><path d="M-20 22 H6"/>',
	magnifier: '<circle cx="-3" cy="-3" r="11"/><path d="M5 5 L15 15"/>',
	mic: '<rect x="-6" y="-15" width="12" height="20" rx="6"/><path d="M-11 0 Q-11 11 0 11 Q11 11 11 0 M0 11 v6 M-6 17 h12"/>',
	pencil: '<path d="M-12 12 L-14 18 L-8 16 L14 -6 L8 -12 Z"/><path d="M4 -8 L10 -2 M-12 12 L-8 16"/>',
	pie: '<path d="M0 -15 A15 15 0 1 0 15 0 H0 Z"/><path d="M4 -19 A15 15 0 0 1 19 -4 H4 Z"/>',
	pin: '<path d="M0 16 C -10 4, -12 -2, -12 -6 A12 12 0 1 1 12 -6 C 12 -2, 10 4, 0 16 Z"/><circle cy="-6" r="4"/>',
	plane: '<path d="M-18 2 L20 -14 L6 16 L0 4 Z"/><path d="M0 4 L20 -14"/>',
	pulse: '<path d="M-24 2 H-12 L-7 -10 L-1 14 L5 -4 L9 2 H24"/>',
	seven3: '<rect x="-25" y="-13" width="50" height="26" rx="5"/><path d="M-20 -6 H-10 Q-14 0 -16 7"/><path d="M-5 -6 H5 Q1 0 -1 7"/><path d="M10 -6 H20 Q16 0 14 7"/>',
	spark: '<path d="M0 -15 Q2 -2 15 0 Q2 2 0 15 Q-2 2 -15 0 Q-2 -2 0 -15z"/>',
	star: '<path d="M0 -15 L4.4 -5 L15 -4.6 L7 2.6 L9.3 13 L0 7.5 L-9.3 13 L-7 2.6 L-15 -4.6 L-4.4 -5 Z"/>',
	stopwatch: '<circle cy="3" r="14"/><path d="M0 3 L0 -5 M-4 -15 h8 M0 -15 v4 M10 -9 l3 -3"/>',
	suitcase: '<rect x="-15" y="-9" width="30" height="22" rx="4"/><path d="M-6 -9 v-5 h12 v5"/><path d="M-15 1 h30"/>',
	trophy: '<path d="M-10 -14 h20 v6 q0 10 -10 12 q-10 -2 -10 -12 z"/><path d="M-10 -10 h-5 q0 7 6 8 M10 -10 h5 q0 7 -6 8 M0 4 v6 M-7 13 h14"/>',
	video: '<rect x="-15" y="-9" width="20" height="18" rx="4"/><path d="M5 -3 L15 -8 V8 L5 3 Z"/>',
	wine: '<path d="M-9 -16 h18 q0 16 -9 16 q-9 0 -9 -16z M0 0 v14 M-7 15 h14"/>',
};

// The two filters of the hero's hand-drawn line (annexe A), ids prefixed.
export const DOODLE_FILTERS =
	'<filter id="ptv-p1" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="5" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="1.4" result="d"/><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="11" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0.45" result="gm"/><feComposite in="d" in2="gm" operator="in"/></filter>' +
	'<filter id="ptv-p2" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="21" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="2.2" result="d"/><feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="1" seed="2" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0.2" result="gm"/><feComposite in="d" in2="gm" operator="in"/></filter>';
