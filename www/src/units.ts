export interface UnitDescriptor {
  key: string;         // matches Rust unit string ("ev", "kcal_mol", etc.)
  label: string;       // display name
  symbol: string;      // Unicode symbol shown next to input
  reciprocal: boolean; // true for nm and sec (E = hc/λ or h/E)
  scale?: number;      // display unit = Rust unit / scale (e.g. MHz: scale=1e6)
}

export const UNITS: UnitDescriptor[] = [
  { key: 'ev',         label: 'Electron volt',  symbol: 'eV',       reciprocal: false },
  { key: 'hartree',    label: 'Hartree',        symbol: 'Eₕ',       reciprocal: false },
  { key: 'ryd',        label: 'Rydberg',        symbol: 'Ryd',      reciprocal: false },
  { key: 'kcal_mol',   label: 'kcal/mol',       symbol: 'kcal/mol', reciprocal: false },
  { key: 'kj_mol',     label: 'kJ/mol',         symbol: 'kJ/mol',   reciprocal: false },
  { key: 'k',          label: 'Kelvin',         symbol: 'K',        reciprocal: false },
  { key: 'wavenumber', label: 'Kayser',         symbol: 'cm⁻¹',     reciprocal: false },
  { key: 'hz',         label: 'Frequency',      symbol: 'MHz',      reciprocal: false, scale: 1e6 },
  { key: 'nm',         label: 'Wavelength',     symbol: 'nm',       reciprocal: true  },
  { key: 't_nmr',      label: '¹H-NMR field',   symbol: 'T',        reciprocal: false },
  { key: 't_epr',      label: 'EPR field',      symbol: 'mT',       reciprocal: false, scale: 1e-3 },
  { key: 'j',          label: 'Joule',          symbol: 'J',        reciprocal: false },
  { key: 'sec',        label: 'Period',         symbol: 's',        reciprocal: true  },
];
