export interface UnitDescriptor {
  key: string;         // matches Rust unit string ("ev", "kcal_mol", etc.)
  label: string;       // display name
  symbol: string;      // Unicode symbol shown next to input
  reciprocal: boolean; // true for nm and sec (E = hc/λ or h/E)
}

export const UNITS: UnitDescriptor[] = [
  { key: 'hartree',    label: 'Hartree',       symbol: 'Eₕ',       reciprocal: false },
  { key: 'ryd',        label: 'Rydberg',       symbol: 'Ryd',      reciprocal: false },
  { key: 'ev',         label: 'Electron volt',  symbol: 'eV',       reciprocal: false },
  { key: 'kcal_mol',   label: 'kcal/mol',       symbol: 'kcal/mol', reciprocal: false },
  { key: 'kj_mol',     label: 'kJ/mol',         symbol: 'kJ/mol',   reciprocal: false },
  { key: 'j',          label: 'Joule',          symbol: 'J',        reciprocal: false },
  { key: 'k',          label: 'Kelvin',         symbol: 'K',        reciprocal: false },
  { key: 'wavenumber', label: 'Wavenumber',     symbol: 'cm⁻¹',     reciprocal: false },
  { key: 'hz',         label: 'Frequency',      symbol: 'Hz',       reciprocal: false },
  { key: 'nm',         label: 'Wavelength',     symbol: 'nm',       reciprocal: true  },
  { key: 'sec',        label: 'Period',         symbol: 's',        reciprocal: true  },
  { key: 't_nmr',      label: '¹H-NMR field',   symbol: 'T',        reciprocal: false },
  { key: 't_epr',      label: 'EPR field',      symbol: 'T',        reciprocal: false },
];
