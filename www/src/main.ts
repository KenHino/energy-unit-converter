import init, { convert_all, unit_to_hartree } from '../../pkg/energy_unit_converter.js';
import { initUI } from './ui.js';

async function main(): Promise<void> {
  await init();
  initUI(
    (hartree) => convert_all(hartree) as Record<string, number>,
    (value, unit) => unit_to_hartree(value, unit),
  );
}

main().catch(console.error);
