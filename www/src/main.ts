import init, {
  convert_all_with_codata,
  default_codata_version,
  supported_codata_versions,
  unit_to_hartree_with_codata,
} from '../../pkg/energy_unit_converter.js';
import { initUI } from './ui.js';

async function main(): Promise<void> {
  await init();
  initUI(
    (hartree, codataVersion) => convert_all_with_codata(hartree, codataVersion) as Record<string, number>,
    (value, unit, codataVersion) => unit_to_hartree_with_codata(value, unit, codataVersion),
    supported_codata_versions() as string[],
    default_codata_version(),
  );
}

main().catch(console.error);
