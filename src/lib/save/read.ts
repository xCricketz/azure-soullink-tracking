import { explainSaveError, versionProblem } from './explain'
import type { ParsedSave, SpeciesTable } from './unbound-save'

interface DexName {
  nat: number
  name: string
  form: string | null
}

export async function readSave(bytes: Uint8Array): Promise<{ ok: true; save: ParsedSave } | { ok: false; message: string }> {
  const [{ parseSave }, tableMod, dexMod] = await Promise.all([
    import('./unbound-save'),
    import('../../data/unbound/species-table.json'),
    import('../../data/unbound/dex.json'),
  ])
  try {
    const save = parseSave(bytes, {
      table: tableMod.default as SpeciesTable,
      dexNames: dexMod.default as DexName[],
    })
    const version = versionProblem(save)
    if (version) return { ok: false, message: version }
    return { ok: true, save }
  } catch (error) {
    return { ok: false, message: explainSaveError(error) }
  }
}
